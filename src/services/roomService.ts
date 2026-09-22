import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Room, RoomMember, RoomMemberPresence, StudyPresence } from '../types/room'

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/** Convierte un Firestore Timestamp o string ISO a string ISO. */
function toISO(value: unknown): string {
  if (typeof value === 'string') return value
  const maybeTimestamp = value as { toDate?: () => Date } | null | undefined
  if (maybeTimestamp?.toDate) return maybeTimestamp.toDate().toISOString()
  return new Date().toISOString()
}

function roomFromDoc(id: string, data: Record<string, unknown>): Room {
  return {
    id,
    code: String(data.code ?? ''),
    name: String(data.name ?? ''),
    createdBy: String(data.createdBy ?? ''),
    createdAt: toISO(data.createdAt),
    members: Array.isArray(data.members)
      ? (data.members as RoomMember[])
      : [],
  }
}

function presenceFromDoc(id: string, data: Record<string, unknown>): StudyPresence | null {
  if (data.active !== true) return null
  return {
    active: true,
    subject: String(data.subject ?? ''),
    since: String(data.since ?? new Date().toISOString()),
  }
}

// ── Room CRUD ─────────────────────────────────────────────────────────────────

/** Crea una sala, la une al creador y la registra en su lista. */
export async function createRoom(userId: string, nick: string, roomName: string): Promise<Room | null> {
  if (!db) return null
  const firestore = db
  const code = generateCode()
  const roomRef = doc(collection(firestore, 'rooms'))
  const now = new Date().toISOString()
  const member: RoomMember = { userId, nick, joinedAt: now }
  const room: Room = {
    id: roomRef.id,
    code,
    name: roomName,
    createdBy: userId,
    createdAt: now,
    members: [member],
  }

  try {
    const batch = writeBatch(firestore)
    batch.set(roomRef, {
      ...room,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      memberIds: [userId],
    })
    batch.set(doc(firestore, 'roomCodes', code), {
      roomId: roomRef.id,
      name: roomName,
      createdBy: userId,
    })
    batch.set(doc(firestore, 'users', userId, 'roomMemberships', roomRef.id), {
      roomId: roomRef.id,
      joinedAt: now,
    })
    await batch.commit()
  } catch (error) {
    console.error('[rooms] No se pudo crear la sala:', error)
    return null
  }
  return room
}

/** Busca una sala por su código de 6 caracteres y une al usuario. */
export async function joinRoomByCode(userId: string, nick: string, code: string): Promise<Room | null> {
  if (!db) return null
  const firestore = db
  const normalized = code.trim().toUpperCase()

  try {
    const codeSnap = await getDoc(doc(firestore, 'roomCodes', normalized))
    if (!codeSnap.exists()) return null
    const codeData = codeSnap.data() as Record<string, unknown>
    const roomId = String(codeData.roomId ?? '')
    if (!roomId) return null

    const member: RoomMember = { userId, nick, joinedAt: new Date().toISOString() }

    await runTransaction(firestore, async (tx) => {
      const roomRef = doc(firestore, 'rooms', roomId)
      // arrayUnion es idempotente: si el usuario ya es miembro, no se duplica.
      tx.update(roomRef, {
        members: arrayUnion(member),
        memberIds: arrayUnion(userId),
      })
      tx.set(doc(firestore, 'users', userId, 'roomMemberships', roomId), {
        roomId,
        joinedAt: member.joinedAt,
      })
    })

    return {
      id: roomId,
      code: normalized,
      name: String(codeData.name ?? 'Sala'),
      createdBy: String(codeData.createdBy ?? ''),
      createdAt: '',
      members: [member],
    }
  } catch (error) {
    console.error('[rooms] No se pudo unir a la sala:', error)
    return null
  }
}

/** Salas a las que pertenece el usuario (sus membresías -> doc de cada sala). */
export async function getUserRooms(userId: string): Promise<Room[]> {
  if (!db) return []
  const firestore = db
  try {
    const memberships = await getDocs(collection(firestore, 'users', userId, 'roomMemberships'))
    const rooms = await Promise.all(
      memberships.docs.map(async (membership) => {
        const roomSnap = await getDoc(doc(firestore, 'rooms', membership.id))
        return roomSnap.exists() ? roomFromDoc(roomSnap.id, roomSnap.data() as Record<string, unknown>) : null
      }),
    )
    return rooms.filter((room): room is Room => room !== null)
  } catch (error) {
    console.error('[rooms] No se pudieron cargar las salas:', error)
    return []
  }
}

/** Suscripción en tiempo real a los miembros de la sala y su presencia. */
export function subscribeToRoom(
  roomId: string,
  onUpdate: (members: RoomMemberPresence[]) => void,
): Unsubscribe | null {
  if (!db) return null
  const firestore = db
  let room: Room | null = null
  const presence = new Map<string, StudyPresence | null>()

  const publish = () => {
    if (!room) return
    onUpdate(
      room.members.map((member) => ({
        ...member,
        presence: presence.has(member.userId) ? presence.get(member.userId)! : null,
      })),
    )
  }

  const unsubRoom = onSnapshot(
    doc(firestore, 'rooms', roomId),
    (roomSnap) => {
      if (roomSnap.exists()) {
        room = roomFromDoc(roomSnap.id, roomSnap.data() as Record<string, unknown>)
        publish()
      }
    },
    (error) => console.error('[rooms] No se pudo leer la sala:', error),
  )

  const unsubPresence = onSnapshot(
    collection(firestore, 'rooms', roomId, 'presence'),
    (snap) => {
      presence.clear()
      snap.docs.forEach((presenceDoc) => {
        const value = presenceFromDoc(presenceDoc.id, presenceDoc.data() as Record<string, unknown>)
        presence.set(presenceDoc.id, value)
      })
      publish()
    },
    (error) => console.error('[rooms] No se pudo leer la presencia:', error),
  )

  return () => {
    unsubRoom()
    unsubPresence()
  }
}

// ── Presence ──────────────────────────────────────────────────────────────────

/**
 * Actualiza la presencia de estudio del usuario dentro de una sala.
 * Llamar con `null` borra la presencia (pomodoro parado, salida o cierre).
 */
export async function setStudyPresence(roomId: string, userId: string, presence: StudyPresence | null): Promise<void> {
  if (!db) return
  const firestore = db
  const presenceRef = doc(firestore, 'rooms', roomId, 'presence', userId)
  try {
    if (presence) {
      await setDoc(presenceRef, {
        active: presence.active,
        subject: presence.subject,
        since: presence.since,
        updatedAt: serverTimestamp(),
      })
    } else {
      await deleteDoc(presenceRef)
    }
  } catch (error) {
    console.error('[rooms] No se pudo actualizar la presencia:', error)
  }
}
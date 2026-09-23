import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { TimetableSlot } from '../types/timetable'

/** Stripped slot sin id (se serializa para compartir: el que importa genera ids nuevos). */
export interface ShareSlot {
  dayOfWeek: number
  startTime: string
  endTime: string
  subject: string
  color: string
  isExtracurricular?: boolean
}

const SHARE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateShareCode(): string {
  return Array.from({ length: 6 }, () => SHARE_CODE_CHARS[Math.floor(Math.random() * SHARE_CODE_CHARS.length)]).join('')
}

function userTimetableCollection(userId: string) {
  if (!db) return null
  return collection(db, 'users', userId, 'timetable')
}

function slotFromDocument(id: string, data: Record<string, unknown>): TimetableSlot {
  return {
    id,
    dayOfWeek: Number(data.dayOfWeek ?? 0),
    startTime: String(data.startTime ?? '08:00'),
    endTime: String(data.endTime ?? '09:00'),
    subject: String(data.subject ?? ''),
    color: String(data.color ?? 'priority-medium'),
    isExtracurricular: Boolean(data.isExtracurricular),
  }
}

export function subscribeToTimetable(userId: string, onTimetable: (slots: TimetableSlot[]) => void): Unsubscribe | null {
  const timetableCol = userTimetableCollection(userId)
  if (!timetableCol) return null
  return onSnapshot(
    timetableCol,
    (snapshot) => {
      onTimetable(snapshot.docs.map((item) => slotFromDocument(item.id, item.data() as Record<string, unknown>)))
    },
    (error) => {
      console.error('[timetable] No se pudo sincronizar el horario:', error)
    }
  )
}

export async function createCloudTimetableSlot(userId: string, slot: TimetableSlot): Promise<string | null> {
  if (!db) return null
  const { id, ...slotData } = slot
  // Usamos el mismo id del estado local para que las actualizaciones coincidan siempre.
  await setDoc(doc(db, 'users', userId, 'timetable', id), {
    ...slotData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return id
}

export async function updateCloudTimetableSlot(userId: string, slot: TimetableSlot): Promise<void> {
  if (!db) return
  const { id, ...slotData } = slot
  await setDoc(doc(db, 'users', userId, 'timetable', id), {
    ...slotData,
    userId,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function deleteCloudTimetableSlot(userId: string, slotId: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, 'users', userId, 'timetable', slotId))
}

// ── Compartir horario por código ──────────────────────────────────────────────

/**
 * Publica el horario en timetableShares/{code} y devuelve el código de 6
 * caracteres (o null si falla). Quien tiene el código puede importarlo a su
 * propio horario (cada uno conserva su sitio, el de fuera solo copia).
 */
export async function publishTimetableShare(userId: string, slots: TimetableSlot[]): Promise<string | null> {
  if (!db) return null
  if (slots.length === 0) return null
  const code = generateShareCode()
  const payload: ShareSlot[] = slots.map(({ id: _id, ...rest }) => rest)
  try {
    await setDoc(doc(db, 'timetableShares', code), {
      ownerId: userId,
      slots: payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return code
  } catch (error) {
    console.error('[timetable] No se pudo publicar el horario compartido:', error)
    return null
  }
}

/** Lee un horario compartido por código y lo devuelve como slots (o null si no existe). */
export async function fetchTimetableShare(code: string): Promise<TimetableSlot[] | null> {
  if (!db) return null
  try {
    const snapshot = await getDoc(doc(db, 'timetableShares', code.trim().toUpperCase()))
    if (!snapshot.exists()) return null
    const data = snapshot.data() as Record<string, unknown>
    const slots = Array.isArray(data.slots) ? (data.slots as ShareSlot[]) : []
    return slots.map((slot) => ({
      id: crypto.randomUUID(),
      dayOfWeek: Number(slot.dayOfWeek ?? 0),
      startTime: String(slot.startTime ?? '08:00'),
      endTime: String(slot.endTime ?? '09:00'),
      subject: String(slot.subject ?? ''),
      color: String(slot.color ?? 'priority-medium'),
      isExtracurricular: Boolean(slot.isExtracurricular),
    }))
  } catch (error) {
    console.error('[timetable] No se pudo leer el horario compartido:', error)
    return null
  }
}

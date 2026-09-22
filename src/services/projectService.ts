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
import type { Project } from '../types/project'

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

function projectFromDocument(id: string, data: Record<string, unknown>): Project {
  return {
    id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    dueDate: String(data.dueDate ?? ''),
    progress: Number(data.progress ?? 0),
    code: String(data.code ?? ''),
    ownerId: String(data.ownerId ?? ''),
    collaboratorIds: Array.isArray(data.collaboratorIds) ? data.collaboratorIds.map(String) : [],
    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt),
  }
}

// ── Suscripción (propios + compartidos, en tiempo real) ───────────────────────

/**
 * Se suscribe a los proyectos del usuario: los propios y los que le han
 * compartido (vía users/{uid}/projectMemberships).
 */
export function subscribeToProjects(userId: string, onProjects: (projects: Project[]) => void): Unsubscribe | null {
  if (!db) return null
  const firestore = db
  const projects = new Map<string, Project>()
  let ownIds = new Set<string>()
  let sharedIds = new Set<string>()
  let sharedUnsubs: Unsubscribe[] = []

  const emit = () => {
    onProjects(
      Array.from(projects.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    )
  }

  const unsubOwn = onSnapshot(
    collection(firestore, 'users', userId, 'projects'),
    (snapshot) => {
      ownIds = new Set(snapshot.docs.map((docSnap) => docSnap.id))
      for (const id of Array.from(projects.keys())) {
        if (!ownIds.has(id) && !sharedIds.has(id)) projects.delete(id)
      }
      snapshot.docs.forEach((docSnap) => {
        projects.set(docSnap.id, projectFromDocument(docSnap.id, docSnap.data() as Record<string, unknown>))
      })
      emit()
    },
    (error) => console.error('[projects] No se pudieron cargar tus proyectos:', error),
  )

  const unsubMemberships = onSnapshot(
    collection(firestore, 'users', userId, 'projectMemberships'),
    (snapshot) => {
      sharedUnsubs.forEach((unsub) => unsub())
      sharedUnsubs = []
      sharedIds = new Set(snapshot.docs.map((docSnap) => docSnap.id))

      for (const id of Array.from(projects.keys())) {
        if (!sharedIds.has(id) && !ownIds.has(id)) projects.delete(id)
      }

      snapshot.docs.forEach((membership) => {
        const ownerId = String(membership.data().ownerId ?? '')
        if (!ownerId) return
        sharedUnsubs.push(
          onSnapshot(
            doc(firestore, 'users', ownerId, 'projects', membership.id),
            (projectSnap) => {
              if (projectSnap.exists()) {
                projects.set(projectSnap.id, projectFromDocument(projectSnap.id, projectSnap.data() as Record<string, unknown>))
              } else {
                projects.delete(projectSnap.id)
              }
              emit()
            },
            (error) => console.error('[projects] No se pudo leer el proyecto compartido:', error),
          ),
        )
      })
      emit()
    },
    (error) => console.error('[projects] No se pudieron cargar las colaboraciones:', error),
  )

  return () => {
    unsubOwn()
    unsubMemberships()
    sharedUnsubs.forEach((unsub) => unsub())
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/** Crea un proyecto nuevo (con código compartible) para el usuario. */
export async function createCloudProject(userId: string, project: Project): Promise<string | null> {
  if (!db) return null
  const firestore = db
  const code = generateCode()
  const projectRef = doc(firestore, 'users', userId, 'projects', project.id)

  // Dos escrituras SECUENCIALES (no batch): las reglas de Firestore no ven los
  // documentos escritos dentro de un mismo batch (exists() falla SIEMPRE ahí),
  // lo que hacía que crear un proyecto se denegara en silencio y «no apareciera».
  // Al escribir primero el proyecto y luego el código, la regla exists() de
  // projectCodes/{code} pasa incluso con reglas estrictas/antiguas desplegadas.
  try {
    await setDoc(projectRef, {
      title: project.title,
      description: project.description,
      dueDate: project.dueDate,
      progress: project.progress,
      userId,
      ownerId: userId,
      code,
      collaboratorIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await setDoc(doc(firestore, 'projectCodes', code), {
      projectId: project.id,
      ownerId: userId,
    })
  } catch (error) {
    console.error('[projects] No se pudo crear el proyecto:', error)
    return null
  }
  return project.id
}

/** Actualiza un proyecto (propio o compartido) escribiendo en el doc del dueño. */
export async function updateCloudProject(userId: string, project: Project): Promise<void> {
  if (!db) return
  const ownerId = project.ownerId || userId
  await setDoc(doc(db, 'users', ownerId, 'projects', project.id), {
    title: project.title,
    description: project.description,
    dueDate: project.dueDate,
    progress: project.progress,
    userId: ownerId,
    ownerId,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/** Elimina un proyecto del doc del dueño. */
export async function deleteCloudProject(ownerId: string, projectId: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, 'users', ownerId, 'projects', projectId))
}

// ── Compartir ─────────────────────────────────────────────────────────────────

/**
 * Une al usuario a un proyecto compartido mediante su código de 6 caracteres.
 * Devuelve `null` si todo fue bien o un mensaje de error.
 */
export async function joinProjectByCode(userId: string, code: string): Promise<string | null> {
  if (!db) return 'No hay conexión con la base de datos.'
  const firestore = db
  try {
    const codeSnap = await getDoc(doc(firestore, 'projectCodes', code.trim().toUpperCase()))
    if (!codeSnap.exists()) return 'Código incorrecto o proyecto no encontrado.'
    const data = codeSnap.data() as Record<string, unknown>
    const projectId = String(data.projectId ?? '')
    const ownerId = String(data.ownerId ?? '')
    if (!projectId || !ownerId) return 'Código incorrecto o proyecto no encontrado.'

    await setDoc(doc(firestore, 'users', userId, 'projectMemberships', projectId), {
      projectId,
      ownerId,
      userId,
      joinedAt: new Date().toISOString(),
    })
    return null
  } catch (error) {
    console.error('[projects] No se pudo unir al proyecto:', error)
    return 'No se pudo unir al proyecto. Inténtalo de nuevo.'
  }
}
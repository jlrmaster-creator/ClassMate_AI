import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Subtask } from '../types/subtask'

// Las subtareas viven en users/{ownerId}/projects/{projectId}/subtasks (misma
// ruta para propios y compartidos). Las reglas ya permiten lectura/escritura
// al dueño y a los miembros del proyecto (isProjectMember).

function subtaskFromDocument(id: string, data: Record<string, unknown>): Subtask {
  return {
    id,
    title: String(data.title ?? ''),
    done: Boolean(data.done),
  }
}

/** Suscripción en tiempo real a los pasos de un proyecto. */
export function subscribeToSubtasks(
  ownerId: string,
  projectId: string,
  onSubtasks: (subtasks: Subtask[]) => void,
): Unsubscribe | null {
  if (!db) return null
  return onSnapshot(
    collection(db, 'users', ownerId, 'projects', projectId, 'subtasks'),
    (snapshot) => {
      onSubtasks(snapshot.docs.map((docSnap) => subtaskFromDocument(docSnap.id, docSnap.data() as Record<string, unknown>)))
    },
    (error) => console.error('[subtasks] No se pudieron cargar los pasos del proyecto:', error),
  )
}

/** Crea un paso nuevo en el proyecto (dueño y miembros pueden). */
export async function createSubtask(ownerId: string, projectId: string, userId: string, subtask: Subtask): Promise<void> {
  if (!db) return
  await setDoc(doc(db, 'users', ownerId, 'projects', projectId, 'subtasks', subtask.id), {
    title: subtask.title,
    done: false,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** Marca/desmarca o renombra un paso (merge sobre el documento existente). */
export async function updateSubtask(ownerId: string, projectId: string, subtask: Subtask): Promise<void> {
  if (!db) return
  await setDoc(doc(db, 'users', ownerId, 'projects', projectId, 'subtasks', subtask.id), {
    title: subtask.title,
    done: subtask.done,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/** Elimina un paso del proyecto. */
export async function deleteSubtask(ownerId: string, projectId: string, subtaskId: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, 'users', ownerId, 'projects', projectId, 'subtasks', subtaskId))
}
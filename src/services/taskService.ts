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
import type { Task } from '../types/task'

function userTasksCollection(userId: string) {
  if (!db) return null
  return collection(db, 'users', userId, 'tasks')
}

function taskFromDocument(id: string, data: Record<string, unknown>): Task {
  return {
    id,
    type: (data.type === 'exam' ? 'exam' : 'task') as Task['type'],
    subject: String(data.subject ?? ''),
    title: String(data.title ?? ''),
    dueDate: typeof data.dueDate === 'string' ? data.dueDate : undefined,
    estimatedMinutes: Number(data.estimatedMinutes ?? 30),
    priority: (data.priority ?? 'medium') as Task['priority'],
    importance: (data.importance ?? 'normal') as Task['importance'],
    status: (data.status ?? 'pending') as Task['status'],
    completedAt: typeof data.completedAt === 'string' ? data.completedAt : undefined,
    examTopics: typeof data.examTopics === 'string' ? data.examTopics : undefined,
    parentExamId: typeof data.parentExamId === 'string' ? data.parentExamId : undefined,
  }
}


export function subscribeToTasks(userId: string, onTasks: (tasks: Task[]) => void): Unsubscribe | null {
  const tasksCollection = userTasksCollection(userId)
  if (!tasksCollection) return null
  return onSnapshot(tasksCollection, (snapshot) => {
    onTasks(snapshot.docs.map((item) => taskFromDocument(item.id, item.data() as Record<string, unknown>)))
  })
}

export async function createCloudTask(userId: string, task: Task): Promise<string | null> {
  const tasksCollection = userTasksCollection(userId)
  if (!tasksCollection) return null
  const { id, ...taskData } = task
  // Usa el id LOCAL de la tarea (crypto.randomUUID) como id del documento: así los updates/toggles
  // posteriores (que usan ese mismo id) siempre aciertan. Antes se usaba addDoc, que generaba un
  // id distinto en Firestore: completar/edit recién creada fallaba en silencio (doc inexistente).
  const taskRef = doc(tasksCollection, id)
  await setDoc(taskRef, {
    ...taskData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return id
}

export async function updateCloudTask(userId: string, task: Task): Promise<void> {
  if (!db) return
  const { id, ...taskData } = task
  const taskRef = doc(db, 'users', userId, 'tasks', id)
  try {
    await setDoc(taskRef, {
      ...taskData,
      userId,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  } catch (error) {
    // Si el doc aun no existe (p.ej. tarea creada por una version antigua sin createdAt, o se completa
    // justo al crearla), el setDoc-merge se evalua como un `create` y las reglas lo deniegan en silencio
    // por falta de createdAt. Lo creamos completo para que el completado/editado NUNCA se pierda.
    console.error('[tasks] No se pudo actualizar la tarea, recreando el doc completo:', error)
    const existing = await getDoc(taskRef)
    if (!existing.exists()) {
      await setDoc(taskRef, {
        ...taskData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  }
}

export async function deleteCloudTask(userId: string, taskId: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, 'users', userId, 'tasks', taskId))
}

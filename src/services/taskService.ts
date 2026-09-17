import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
    subject: String(data.subject ?? ''),
    title: String(data.title ?? ''),
    dueDate: typeof data.dueDate === 'string' ? data.dueDate : undefined,
    estimatedMinutes: Number(data.estimatedMinutes ?? 30),
    priority: (data.priority ?? 'medium') as Task['priority'],
    importance: (data.importance ?? 'normal') as Task['importance'],
    status: (data.status ?? 'pending') as Task['status'],
    completedAt: typeof data.completedAt === 'string' ? data.completedAt : undefined,
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
  const taskReference = await addDoc(tasksCollection, {
    ...taskData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return taskReference.id
}

export async function updateCloudTask(userId: string, task: Task): Promise<void> {
  if (!db) return
  const { id, ...taskData } = task
  await setDoc(doc(db, 'users', userId, 'tasks', id), {
    ...taskData,
    userId,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function deleteCloudTask(userId: string, taskId: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, 'users', userId, 'tasks', taskId))
}

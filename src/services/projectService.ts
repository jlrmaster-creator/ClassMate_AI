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
import type { Project } from '../types/project'

function userProjectsCollection(userId: string) {
  if (!db) return null
  return collection(db, 'users', userId, 'projects')
}

function projectFromDocument(id: string, data: Record<string, unknown>): Project {
  return {
    id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    dueDate: String(data.dueDate ?? ''),
    progress: Number(data.progress ?? 0),
    sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith.map(String) : [],
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
  }
}

export function subscribeToProjects(userId: string, onProjects: (projects: Project[]) => void): Unsubscribe | null {
  const projectsCollection = userProjectsCollection(userId)
  if (!projectsCollection) return null
  return onSnapshot(projectsCollection, (snapshot) => {
    onProjects(snapshot.docs.map((item) => projectFromDocument(item.id, item.data() as Record<string, unknown>)))
  })
}

export async function createCloudProject(userId: string, project: Project): Promise<string | null> {
  const projectsCollection = userProjectsCollection(userId)
  if (!projectsCollection) return null
  const { id, ...projectData } = project
  const projectReference = await addDoc(projectsCollection, {
    ...projectData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return projectReference.id
}

export async function updateCloudProject(userId: string, project: Project): Promise<void> {
  if (!db) return
  const { id, ...projectData } = project
  await setDoc(doc(db, 'users', userId, 'projects', id), {
    ...projectData,
    userId,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function deleteCloudProject(userId: string, projectId: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, 'users', userId, 'projects', projectId))
}

import type { Project } from '../types/project'
import { readStorage, writeStorage } from './safeStorage'

const STORAGE_KEY = 'classmate-projects'

export function getProjects(): Project[] {
  return readStorage<Project[]>(STORAGE_KEY, [])
}

export function saveProjects(projects: Project[]): void {
  writeStorage(STORAGE_KEY, projects)
}

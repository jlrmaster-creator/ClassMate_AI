import type { Project } from '../types/project'

const STORAGE_KEY = 'classmate-projects'

export function getProjects(): Project[] {
  const storedProjects = localStorage.getItem(STORAGE_KEY)
  if (!storedProjects) return []
  try {
    return JSON.parse(storedProjects) as Project[]
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

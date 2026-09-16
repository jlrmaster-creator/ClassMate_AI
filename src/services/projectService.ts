import type { Project } from '../types/project'

const STORAGE_KEY = 'classmate-projects'

export function getProjects(): Project[] {
  const storedProjects = localStorage.getItem(STORAGE_KEY)
  return storedProjects ? JSON.parse(storedProjects) as Project[] : []
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export interface Project {
  id: string
  title: string
  description: string
  dueDate: string
  progress: number
  sharedWith: string[]
  createdAt: string
  updatedAt: string
}

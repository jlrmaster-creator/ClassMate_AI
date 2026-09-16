export type TaskStatus = 'pending' | 'completed'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  subject: string
  title: string
  estimatedMinutes: number
  priority: TaskPriority
  status: TaskStatus
}

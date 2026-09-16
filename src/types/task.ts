export type TaskStatus = 'pending' | 'completed'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskImportance = 'essential' | 'important' | 'normal'

export interface Task {
  id: string
  subject: string
  title: string
  estimatedMinutes: number
  priority: TaskPriority
  importance: TaskImportance
  status: TaskStatus
}

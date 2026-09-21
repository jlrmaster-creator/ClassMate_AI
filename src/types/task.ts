export type TaskStatus = 'pending' | 'completed'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskImportance = 'essential' | 'important' | 'normal'
export type TaskType = 'task' | 'exam'

export interface Task {
  id: string
  type: TaskType
  subject: string
  title: string
  dueDate?: string
  estimatedMinutes: number
  priority: TaskPriority
  importance: TaskImportance
  status: TaskStatus
  completedAt?: string
  /** For exam tasks: comma-separated list of topics the student needs to study */
  examTopics?: string
  /** Links a study session back to its parent exam task */
  parentExamId?: string
}


import type { Task } from '../types/task'

const STORAGE_KEY = 'classmate-tasks'

const starterTasks: Task[] = [
  {
    id: 'math-12-25',
    subject: 'Matematicas',
    title: 'Ejercicios 12-25',
    estimatedMinutes: 35,
    priority: 'high',
    importance: 'essential',
    dueDate: '2026-09-18',
    status: 'pending',
  },
  {
    id: 'history-sources',
    subject: 'Historia',
    title: 'Buscar dos fuentes',
    estimatedMinutes: 20,
    priority: 'medium',
    importance: 'important',
    dueDate: '2026-09-19',
    status: 'pending',
  },
  {
    id: 'english-vocabulary',
    subject: 'Ingles',
    title: 'Repasar vocabulario',
    estimatedMinutes: 15,
    priority: 'low',
    importance: 'normal',
    dueDate: '2026-09-21',
    status: 'pending',
  },
]

export function getTasks(): Task[] {
  const storedTasks = localStorage.getItem(STORAGE_KEY)
  if (!storedTasks) return starterTasks
  try {
    const tasks = JSON.parse(storedTasks) as Partial<Task>[]
    return tasks.map((task) => ({ ...task, importance: task.importance ?? 'normal' })) as Task[]
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return starterTasks
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

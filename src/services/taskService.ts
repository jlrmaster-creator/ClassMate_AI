import type { Task } from '../types/task'

const STORAGE_KEY = 'classmate-tasks'

const starterTasks: Task[] = [
  {
    id: 'math-12-25',
    subject: 'Matematicas',
    title: 'Ejercicios 12-25',
    estimatedMinutes: 35,
    priority: 'high',
    status: 'pending',
  },
  {
    id: 'history-sources',
    subject: 'Historia',
    title: 'Buscar dos fuentes',
    estimatedMinutes: 20,
    priority: 'medium',
    status: 'pending',
  },
  {
    id: 'english-vocabulary',
    subject: 'Ingles',
    title: 'Repasar vocabulario',
    estimatedMinutes: 15,
    priority: 'low',
    status: 'pending',
  },
]

export function getTasks(): Task[] {
  const storedTasks = localStorage.getItem(STORAGE_KEY)
  return storedTasks ? JSON.parse(storedTasks) as Task[] : starterTasks
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

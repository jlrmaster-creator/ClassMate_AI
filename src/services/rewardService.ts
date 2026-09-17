import type { Task } from '../types/task'

export interface RewardSummary {
  dailyPoints: number
  weeklyPoints: number
}

const priorityPoints = { high: 5, medium: 3, low: 1 }
const importancePoints = { essential: 5, important: 3, normal: 1 }

export function pointsForTask(task: Task): number {
  const effortPoints = Math.max(1, Math.ceil(task.estimatedMinutes / 15))
  return effortPoints + priorityPoints[task.priority] + importancePoints[task.importance]
}

function isSameDay(date: Date, reference: Date): boolean {
  return date.getFullYear() === reference.getFullYear()
    && date.getMonth() === reference.getMonth()
    && date.getDate() === reference.getDate()
}

function isThisWeek(date: Date, reference: Date): boolean {
  const startOfWeek = new Date(reference)
  const day = (startOfWeek.getDay() + 6) % 7
  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(startOfWeek.getDate() - day)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 7)
  return date >= startOfWeek && date < endOfWeek
}

export function getRewardSummary(tasks: Task[], now = new Date()): RewardSummary {
  return tasks.reduce((summary, task) => {
    if (task.status !== 'completed' || !task.completedAt) return summary
    const completedAt = new Date(task.completedAt)
    const points = pointsForTask(task)
    if (isSameDay(completedAt, now)) summary.dailyPoints += points
    if (isThisWeek(completedAt, now)) summary.weeklyPoints += points
    return summary
  }, { dailyPoints: 0, weeklyPoints: 0 })
}

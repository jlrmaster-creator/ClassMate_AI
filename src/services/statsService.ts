import type { Task } from '../types/task'

export interface SubjectStat {
  subject: string
  minutesThisWeek: number
  tasksCompleted: number
  color: string
}

export interface StreakDay {
  label: string   // "L", "M", "X", ...
  date: string    // ISO yyyy-mm-dd
  hasActivity: boolean
  isToday: boolean
}

export interface StudyStats {
  subjectStats: SubjectStat[]
  streak: StreakDay[]
  currentStreakDays: number
  totalCompleted: number
  completedThisWeek: number
  completedToday: number
  totalMinutesThisWeek: number
}

const SUBJECT_COLORS = [
  '#397a60', '#8b5cf6', '#d56c4a', '#d2a83f',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function startOfWeek(ref: Date): Date {
  const d = new Date(ref)
  const day = (d.getDay() + 6) % 7 // Monday = 0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d
}

function isThisWeek(date: Date, ref: Date): boolean {
  const start = startOfWeek(ref)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return date >= start && date < end
}

export function computeStudyStats(tasks: Task[], now = new Date()): StudyStats {
  const completedTasks = tasks.filter((t) => t.status === 'completed' && t.completedAt)

  // Subject stats (this week, by minutes)
  const subjectMap = new Map<string, { minutes: number; count: number }>()
  for (const task of completedTasks) {
    const completedAt = new Date(task.completedAt!)
    if (!isThisWeek(completedAt, now)) continue
    const existing = subjectMap.get(task.subject) ?? { minutes: 0, count: 0 }
    subjectMap.set(task.subject, {
      minutes: existing.minutes + task.estimatedMinutes,
      count: existing.count + 1,
    })
  }
  const sortedSubjects = [...subjectMap.entries()]
    .sort((a, b) => b[1].minutes - a[1].minutes)
  const subjectStats: SubjectStat[] = sortedSubjects.map(([subject, data], i) => ({
    subject,
    minutesThisWeek: data.minutes,
    tasksCompleted: data.count,
    color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  }))
  const maxMinutes = subjectStats[0]?.minutesThisWeek ?? 1

  // Streak: last 7 days
  const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  const streak: StreakDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    const hasActivity = completedTasks.some((t) => isSameDay(new Date(t.completedAt!), d))
    return {
      label: DAY_LABELS[d.getDay()],
      date: d.toISOString().slice(0, 10),
      hasActivity,
      isToday: isSameDay(d, now),
    }
  })

  // Current streak: consecutive days with activity ending today/yesterday
  let currentStreakDays = 0
  const reversedStreak = [...streak].reverse()
  for (const day of reversedStreak) {
    if (day.hasActivity) currentStreakDays++
    else break
  }

  // Global counts
  const totalCompleted = completedTasks.length
  const completedThisWeek = completedTasks.filter((t) => isThisWeek(new Date(t.completedAt!), now)).length
  const completedToday = completedTasks.filter((t) => isSameDay(new Date(t.completedAt!), now)).length
  const totalMinutesThisWeek = sortedSubjects.reduce((sum, [, d]) => sum + d.minutes, 0)

  return {
    subjectStats: subjectStats.map((s) => ({ ...s, _maxMinutes: maxMinutes } as SubjectStat & { _maxMinutes: number })) as SubjectStat[],
    streak,
    currentStreakDays,
    totalCompleted,
    completedThisWeek,
    completedToday,
    totalMinutesThisWeek,
    _maxMinutes: maxMinutes,
  } as StudyStats & { _maxMinutes: number }
}

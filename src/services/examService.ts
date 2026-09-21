import type { Task, TaskPriority, TaskImportance } from '../types/task'

export interface StudySession {
  title: string
  dueDate: string
  estimatedMinutes: number
  priority: TaskPriority
  importance: TaskImportance
}

/**
 * Given an exam task, generates a list of study sessions spread across the
 * days before the exam. Each session maps to a topic the student provided.
 *
 * Strategy:
 *  - Parse the topic list (comma-separated).
 *  - Distribute topics evenly across the available days (excluding the exam day).
 *  - Sessions on days closer to the exam get higher priority.
 *  - A final "Repaso general" session is placed the day before the exam.
 */
export function generateStudySessions(
  subject: string,
  examDate: string,
  topics: string[],
  minutesPerSession: number,
  examPriority: TaskPriority,
): StudySession[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(`${examDate}T00:00:00`)
  const daysUntilExam = Math.round((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExam <= 0) return []

  const sessions: StudySession[] = []

  // We schedule sessions from today until (exam day - 1)
  // Reserve the last day for a general review
  const studyDays = daysUntilExam - 1
  const effectiveTopics = topics.length > 0 ? topics : ['Estudiar toda la materia']

  if (studyDays > 0) {
    // How many days per topic (may be fractional, we'll round)
    const topicsToSchedule = effectiveTopics.slice(0, Math.min(effectiveTopics.length, studyDays))

    topicsToSchedule.forEach((topic, index) => {
      // Spread evenly: first topic = today, last topic = studyDays-1 days from now
      const dayOffset = studyDays <= 1
        ? 0
        : Math.round((index / (topicsToSchedule.length - 1 || 1)) * (studyDays - 1))

      const sessionDate = new Date(today)
      sessionDate.setDate(today.getDate() + dayOffset)

      // Sessions closer to exam get higher priority
      const daysLeft = daysUntilExam - dayOffset
      const priority: TaskPriority = daysLeft <= 2 ? 'high' : daysLeft <= 4 ? 'medium' : 'low'
      const importance: TaskImportance = daysLeft <= 2 ? 'essential' : 'important'

      sessions.push({
        title: `${subject} · ${topic.trim()}`,
        dueDate: sessionDate.toISOString().slice(0, 10),
        estimatedMinutes: minutesPerSession,
        priority,
        importance,
      })
    })
  }

  // Always add a final "Repaso general" the day before the exam
  const reviewDate = new Date(exam)
  reviewDate.setDate(exam.getDate() - 1)
  if (reviewDate >= today) {
    sessions.push({
      title: `${subject} · Repaso general (víspera del examen)`,
      dueDate: reviewDate.toISOString().slice(0, 10),
      estimatedMinutes: Math.max(minutesPerSession, 45),
      priority: 'high',
      importance: 'essential',
    })
  }

  return sessions
}

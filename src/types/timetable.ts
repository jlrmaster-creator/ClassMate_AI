export interface TimetableSlot {
  id: string
  dayOfWeek: number // 0 = Lunes, 1 = Martes, ..., 4 = Viernes
  startTime: string // "08:00"
  endTime: string   // "09:00"
  subject: string
  color: string     // "priority-high", "priority-medium", "priority-low" (we can reuse these classes or add new ones)
}

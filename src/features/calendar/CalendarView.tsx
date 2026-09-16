import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Settings2, X } from 'lucide-react'
import type { Task } from '../../types/task'

interface CalendarViewProps {
  tasks: Task[]
  schoolDays: number[]
  onSchoolDaysChange: (days: number[]) => void
  onCreateTask: (date: string) => void
}

const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const weekdayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getMonthDays(month: Date): Date[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (firstDay.getDay() + 6) % 7
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  return Array.from({ length: offset + days }, (_, index) => index < offset ? new Date(NaN) : new Date(month.getFullYear(), month.getMonth(), index - offset + 1))
}

export default function CalendarView({ tasks, schoolDays, onSchoolDaysChange, onCreateTask }: CalendarViewProps) {
  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const [showSettings, setShowSettings] = useState(false)
  const monthDays = useMemo(() => getMonthDays(month), [month])
  const selectedTasks = tasks.filter((task) => task.dueDate === selectedDate)
  const monthLabel = month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  function changeMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <section className="calendar-view">
      <div className="calendar-heading"><div><p className="section-kicker">Organiza tu semana</p><h2>Calendario</h2><p className="muted-copy">Pulsa un día para ver o añadir tareas.</p></div><button className="icon-button" onClick={() => setShowSettings(true)} aria-label="Configurar días lectivos"><Settings2 size={19} /></button></div>
      <div className="calendar-card">
        <div className="calendar-toolbar"><button onClick={() => changeMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={19} /></button><strong>{monthLabel}</strong><button onClick={() => changeMonth(1)} aria-label="Mes siguiente"><ChevronRight size={19} /></button></div>
        <div className="calendar-grid weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">{monthDays.map((date, index) => {
          if (Number.isNaN(date.getTime())) return <span className="calendar-day empty" key={`empty-${index}`} />
          const dateKey = toDateKey(date)
          const dayTasks = tasks.filter((task) => task.dueDate === dateKey)
          const isSelected = dateKey === selectedDate
          const isToday = dateKey === toDateKey(new Date())
          return <button className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`} key={dateKey} onClick={() => setSelectedDate(dateKey)}><span>{date.getDate()}</span>{dayTasks.length > 0 && <b>{dayTasks.length}</b>}</button>
        })}</div>
      </div>
      <div className="calendar-day-detail"><div><p className="section-kicker">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h3>{selectedTasks.length ? `${selectedTasks.length} tarea${selectedTasks.length === 1 ? '' : 's'}` : 'Día libre'}</h3></div><button className="add-task-button" onClick={() => onCreateTask(selectedDate)} aria-label="Crear tarea en este día"><Plus size={21} /></button></div>
      {selectedTasks.length > 0 && <div className="calendar-task-list">{selectedTasks.map((task) => <div className="calendar-task" key={task.id}><span className={`calendar-task-dot ${task.priority}`} /><span>{task.title}</span><small>{task.estimatedMinutes} min</small></div>)}</div>}
      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="modal school-days-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowSettings(false)} aria-label="Cerrar"><X size={19} /></button><span className="modal-symbol"><CalendarDays size={22} /></span><p className="section-kicker">Configuración</p><h2>Días lectivos</h2><p className="muted-copy">Elige qué días sueles tener clase. Se usan para organizar tus planes.</p><div className="school-days-list">{weekdayNames.map((day, index) => <label key={day}><input type="checkbox" checked={schoolDays.includes(index)} onChange={() => onSchoolDaysChange(schoolDays.includes(index) ? schoolDays.filter((item) => item !== index) : [...schoolDays, index].sort())} /><span>{day}</span></label>)}</div><button className="primary-button" onClick={() => setShowSettings(false)}>Guardar configuración</button></section></div>}
    </section>
  )
}
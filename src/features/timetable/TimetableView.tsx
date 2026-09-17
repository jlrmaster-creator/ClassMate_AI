import { useState } from 'react'
import { Plus, Clock3, Edit3, X, ArrowRight, ListChecks } from 'lucide-react'
import type { TimetableSlot } from '../../types/timetable'

interface TimetableViewProps {
  slots: TimetableSlot[]
  onSaveSlot: (slot: TimetableSlot) => void
  onDeleteSlot: (slotId: string) => void
  onCreateTaskForSubject: (subject: string) => void
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export default function TimetableView({ slots, onSaveSlot, onDeleteSlot, onCreateTaskForSubject }: TimetableViewProps) {
  const [activeDay, setActiveDay] = useState(new Date().getDay() >= 1 && new Date().getDay() <= 5 ? new Date().getDay() - 1 : 0)
  const [showForm, setShowForm] = useState(false)
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null)

  const currentSlots = slots
    .filter((s) => s.dayOfWeek === activeDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  function openNewSlot() {
    setEditingSlot(null)
    setShowForm(true)
  }

  function openEditSlot(slot: TimetableSlot) {
    setEditingSlot(slot)
    setShowForm(true)
  }

  function saveSlot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const subject = String(formData.get('subject') ?? '').trim()
    const startTime = String(formData.get('startTime') ?? '')
    const endTime = String(formData.get('endTime') ?? '')
    const color = String(formData.get('color') ?? 'priority-medium')

    if (!subject || !startTime || !endTime) return

    onSaveSlot({
      id: editingSlot?.id ?? crypto.randomUUID(),
      dayOfWeek: activeDay,
      subject,
      startTime,
      endTime,
      color,
    })
    setShowForm(false)
    setEditingSlot(null)
  }

  return (
    <section className="timetable-view">
      <section className="section-heading">
        <div>
          <p className="section-kicker">Horario Escolar</p>
          <h2>Tus clases</h2>
        </div>
        <button className="add-task-button" onClick={openNewSlot} aria-label="Añadir clase">
          <Plus size={22} />
        </button>
      </section>

      <div className="days-nav">
        {DAYS.map((day, index) => (
          <button
            key={day}
            className={`day-tab ${activeDay === index ? 'active' : ''}`}
            onClick={() => setActiveDay(index)}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="slots-list">
        {currentSlots.length === 0 ? (
          <div className="empty-state">
            <span><Clock3 size={24} /></span>
            <h3>Día libre</h3>
            <p>No tienes clases registradas para este día.</p>
            <button onClick={openNewSlot} className="secondary-button" style={{ marginTop: '1rem' }}>Añadir clase</button>
          </div>
        ) : (
          currentSlots.map((slot) => (
            <article className={`slot-item ${slot.color}`} key={slot.id}>
              <div className="slot-time">
                <strong>{slot.startTime}</strong>
                <span>{slot.endTime}</span>
              </div>
              <div className="slot-body">
                <h3>{slot.subject}</h3>
                <div className="slot-actions">
                  <button onClick={() => onCreateTaskForSubject(slot.subject)} aria-label="Añadir tarea">
                    <ListChecks size={16} /> Tarea
                  </button>
                  <button onClick={() => openEditSlot(slot)} aria-label="Editar">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => onDeleteSlot(slot.id)} aria-label="Eliminar">
                    <X size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <form className="modal task-form" onSubmit={saveSlot} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowForm(false)}>
              <X size={19} />
            </button>
            <p className="section-kicker">{editingSlot ? 'Editar clase' : 'Nueva clase'}</p>
            <h2>{DAYS[activeDay]}</h2>
            
            <label>
              Asignatura
              <input name="subject" defaultValue={editingSlot?.subject} placeholder="Ej. Matemáticas" required autoFocus />
            </label>
            
            <div className="time-inputs">
              <label>
                Hora inicio
                <input name="startTime" type="time" defaultValue={editingSlot?.startTime ?? '08:00'} required />
              </label>
              <label>
                Hora fin
                <input name="endTime" type="time" defaultValue={editingSlot?.endTime ?? '09:00'} required />
              </label>
            </div>

            <label>
              Color
              <select name="color" defaultValue={editingSlot?.color ?? 'priority-medium'}>
                <option value="priority-high">Rojo (Prioridad Alta)</option>
                <option value="priority-medium">Amarillo (Prioridad Media)</option>
                <option value="priority-low">Azul (Prioridad Baja)</option>
              </select>
            </label>

            <button className="primary-button" type="submit">
              Guardar clase <ArrowRight size={17} />
            </button>
          </form>
        </div>
      )}
    </section>
  )
}

import { useState } from 'react'
import { ArrowRight, Check, Copy, Clock3, Edit3, ListChecks, LogIn, Palette, Plus, Share2, X } from 'lucide-react'
import type { TimetableSlot } from '../../types/timetable'
import { fetchTimetableShare, publishTimetableShare } from '../../services/timetableService'

interface TimetableViewProps {
  userId: string
  slots: TimetableSlot[]
  onSaveSlot: (slot: TimetableSlot) => void
  onDeleteSlot: (slotId: string) => void
  onCreateTaskForSubject: (subject: string) => void
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export default function TimetableView({ userId, slots, onSaveSlot, onDeleteSlot, onCreateTaskForSubject }: TimetableViewProps) {
  const [activeDay, setActiveDay] = useState(new Date().getDay() >= 1 && new Date().getDay() <= 5 ? new Date().getDay() - 1 : 0)
  const [showForm, setShowForm] = useState(false)
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null)
  const [newSlotExtra, setNewSlotExtra] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [shareCode, setShareCode] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const [copiedCode, setCopiedCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  const currentSlots = slots
    .filter((s) => s.dayOfWeek === activeDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const classSlots = currentSlots.filter((slot) => !slot.isExtracurricular)
  const extraSlots = currentSlots.filter((slot) => slot.isExtracurricular)

  function openNewSlot(preExtra = false) {
    setEditingSlot(null)
    setNewSlotExtra(preExtra)
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
    const isExtracurricular = formData.get('isExtracurricular') === 'on'

    if (!subject || !startTime || !endTime) return

    onSaveSlot({
      id: editingSlot?.id ?? crypto.randomUUID(),
      dayOfWeek: activeDay,
      subject,
      startTime,
      endTime,
      color,
      isExtracurricular,
    })
    setShowForm(false)
    setEditingSlot(null)
  }

  function openShare() {
    setShareCode('')
    setShareError('')
    setShowShare(true)
  }

  async function publishShare() {
    if (sharing) return
    if (slots.length === 0) {
      setShareError('Primero añade alguna clase a tu horario.')
      return
    }
    setSharing(true)
    setShareError('')
    const code = await publishTimetableShare(userId, slots)
    setSharing(false)
    if (code) setShareCode(code)
    else setShareError('No se pudo guardar el horario. Inténtalo de nuevo.')
  }

  function copyCode() {
    if (!shareCode) return
    navigator.clipboard.writeText(shareCode).then(() => {
      setCopiedCode(shareCode)
      setTimeout(() => setCopiedCode(''), 2000)
    })
  }

  async function joinShare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6 || joining) return
    setJoining(true)
    setJoinError('')
    const imported = await fetchTimetableShare(code)
    setJoining(false)
    if (!imported || imported.length === 0) {
      setJoinError('Código incorrecto o sin clases todavía.')
      return
    }
    imported.forEach((slot) => onSaveSlot(slot))
    setShowJoin(false)
    setJoinCode('')
  }

  return (
    <section className="timetable-view">
      <section className="section-heading">
        <div>
          <p className="section-kicker">Horario Escolar</p>
          <h2>Tus clases</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="add-task-button" onClick={() => setShowJoin(true)} aria-label="Unirse a un horario compartido por código" title="Usar código de otro horario"><LogIn size={20} /></button>
          <button className="add-task-button" onClick={openShare} aria-label="Compartir horario por código" title="Compartir horario"><Share2 size={20} /></button>
          <button className="add-task-button" onClick={() => openNewSlot(true)} aria-label="Añadir extraescolar" title="Añadir extraescolar"><Palette size={20} /></button>
          <button className="add-task-button" onClick={() => openNewSlot(false)} aria-label="Añadir clase">
            <Plus size={22} />
          </button>
        </div>
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
            <p>No tienes clases ni extraescolares registradas para este día.</p>
            <button onClick={() => openNewSlot(false)} className="secondary-button" style={{ marginTop: '1rem' }}>Añadir clase</button>
          </div>
        ) : (
          <>
            {classSlots.map((slot) => (
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
            ))}

            {extraSlots.length > 0 && (
              <div className="extra-section">
                <p className="extra-heading"><Palette size={14} /> Extraescolares</p>
                {extraSlots.map((slot) => (
                  <article className={`slot-item slot-extra ${slot.color}`} key={slot.id}>
                    <div className="slot-time">
                      <strong>{slot.startTime}</strong>
                      <span>{slot.endTime}</span>
                    </div>
                    <div className="slot-body">
                      <h3>{slot.subject}</h3>
                      <span className="extra-badge">Extraescolar</span>
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
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <form className="modal task-form" onSubmit={saveSlot} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowForm(false)}>
              <X size={19} />
            </button>
            <p className="section-kicker">{editingSlot ? 'Editar' : newSlotExtra ? 'Nueva extraescolar' : 'Nueva clase'}</p>
            <h2>{DAYS[activeDay]}</h2>
            
            <label>
              {newSlotExtra ? 'Actividad' : 'Asignatura'}
              <input name="subject" defaultValue={editingSlot?.subject} placeholder={newSlotExtra ? 'Ej. Natación, Piano…' : 'Ej. Matemáticas'} required autoFocus />
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

            <label className="extra-check">
              <input type="checkbox" name="isExtracurricular" defaultChecked={editingSlot?.isExtracurricular ?? newSlotExtra} />
              <span>Es una extraescolar <small>(se muestra debajo de las clases)</small></span>
            </label>

            <label>
              Color
              <select name="color" defaultValue={editingSlot?.color ?? 'priority-medium'}>
                <option value="priority-high">Rojo (Prioridad Alta)</option>
                <option value="priority-medium">Amarillo (Prioridad Media)</option>
                <option value="priority-low">Azul (Prioridad Baja)</option>
              </select>
            </label>

            <button className="primary-button" type="submit">
              Guardar {newSlotExtra ? 'extraescolar' : 'clase'} <ArrowRight size={17} />
            </button>
          </form>
        </div>
      )}
    {showShare && (
        <div className="modal-backdrop" onClick={() => setShowShare(false)}>
          <div className="modal task-form" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowShare(false)}>
              <X size={19} />
            </button>
            <p className="section-kicker">Compartir horario</p>
            <h2>Un código para tu clase</h2>
            <p className="muted-copy" style={{ marginTop: 0 }}>
              Quien introduzca este código copiará tu horario en su app. Puedes compartirlo por chat.
            </p>
            {!shareCode && !shareError && (
              <button className="primary-button" type="button" onClick={publishShare} disabled={sharing} style={{ marginTop: 8 }}>
                {sharing ? 'Generando…' : 'Generar código'} <ArrowRight size={17} />
              </button>
            )}
            {shareError && <p className="form-error">{shareError}</p>}
            {shareCode && (
              <div className="share-result">
                <span className="share-result-code">{shareCode}</span>
                <button className="share-code-button" onClick={copyCode} aria-label="Copiar código">
                  {copiedCode === shareCode ? <Check size={15} /> : <Copy size={15} />}
                  {copiedCode === shareCode ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showJoin && (
        <div className="modal-backdrop" onClick={() => setShowJoin(false)}>
          <form className="modal task-form" onSubmit={joinShare} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowJoin(false)}>
              <X size={19} />
            </button>
            <p className="section-kicker">Unirse a un horario</p>
            <h2>Introduce el código</h2>
            <label>
              Código de 6 caracteres
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Ej. ABC123"
                maxLength={6}
                autoFocus
                required
                className="code-input"
              />
            </label>
            {joinError && <p className="form-error">{joinError}</p>}
            <button className="primary-button" type="submit" disabled={joining}>
              {joining ? 'Importando…' : 'Importar horario'} <ArrowRight size={17} />
            </button>
          </form>
        </div>
      )}
    </section>
  )
}

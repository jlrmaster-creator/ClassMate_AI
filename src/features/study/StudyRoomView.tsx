import { useState, useEffect } from 'react'
import { Users, Plus, LogIn, Copy, Check, BookOpen, X, ArrowRight } from 'lucide-react'
import type { Room, RoomMemberPresence } from '../../types/room'
import { createRoom, joinRoomByCode, getUserRooms, subscribeToRoom, setStudyPresence } from '../../services/roomService'

interface StudyRoomViewProps {
  userId: string
  userNick: string
  pomodoroRunning: boolean
  pomodoroSubject: string
}

function formatSince(since: string): string {
  const diff = Math.floor((Date.now() - new Date(since).getTime()) / 60000)
  if (diff < 1) return 'ahora mismo'
  if (diff === 1) return 'hace 1 min'
  return `hace ${diff} min`
}

export default function StudyRoomView({ userId, userNick, pomodoroRunning, pomodoroSubject }: StudyRoomViewProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<RoomMemberPresence[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(true)

  // Load user's rooms on mount
  useEffect(() => {
    getUserRooms(userId).then((r) => { setRooms(r); setLoadingRooms(false) })
  }, [userId])

  // Subscribe to active room in real time
  useEffect(() => {
    if (!activeRoom) return undefined
    const unsub = subscribeToRoom(activeRoom.id, setMembers)
    return unsub ?? undefined
  }, [activeRoom?.id])

  // Sync study presence with the Pomodoro while inside a room
  useEffect(() => {
    if (!activeRoom) return
    const presence = pomodoroRunning
      ? { active: true, subject: pomodoroSubject, since: new Date().toISOString() }
      : null
    void setStudyPresence(activeRoom.id, userId, presence)
  }, [activeRoom?.id, pomodoroRunning, pomodoroSubject, userId])

  // Clear presence when leaving the room or closing the view
  useEffect(() => {
    return () => {
      if (activeRoom) void setStudyPresence(activeRoom.id, userId, null)
    }
  }, [activeRoom?.id, userId])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!roomName.trim()) return
    setLoading(true); setError('')
    const room = await createRoom(userId, userNick, roomName.trim())
    if (room) { setRooms((r) => [...r, room]); setActiveRoom(room) }
    else setError('No se pudo crear la sala.')
    setLoading(false); setShowCreate(false); setRoomName('')
  }

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault()
    if (!joinCode.trim()) return
    setLoading(true); setError('')
    const room = await joinRoomByCode(userId, userNick, joinCode.trim())
    if (room) {
      setRooms((r) => r.some((x) => x.id === room.id) ? r : [...r, room])
      setActiveRoom(room)
    } else {
      setError('Código incorrecto o sala no encontrada.')
    }
    setLoading(false); setShowJoin(false); setJoinCode('')
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  // Render member list
  function renderMember(m: RoomMemberPresence) {
    const isYou = m.userId === userId
    const studying = m.presence?.active
    return (
      <div key={m.userId} className={`room-member ${studying ? 'studying' : ''}`}>
        <div className={`member-avatar ${studying ? 'studying' : ''}`}>
          {m.nick.slice(0, 2).toUpperCase()}
          {studying && <span className="presence-pulse" />}
        </div>
        <div className="member-info">
          <strong>{m.nick}{isYou ? ' (tú)' : ''}</strong>
          {studying
            ? <span className="member-status studying">📚 Estudiando{m.presence?.subject ? ` · ${m.presence.subject}` : ''} · {formatSince(m.presence!.since)}</span>
            : <span className="member-status idle">💤 Desconectado</span>
          }
        </div>
      </div>
    )
  }

  if (activeRoom) {
    const studyingCount = members.filter((m) => m.presence?.active).length
    return (
      <section className="study-room-view">
        <div className="room-header">
          <button className="back-button" onClick={() => { setActiveRoom(null); setMembers([]) }}>
            <X size={18} />
          </button>
          <div>
            <p className="section-kicker">Sala de estudio</p>
            <h2>{activeRoom.name}</h2>
          </div>
          <button className="room-code-badge" onClick={() => copyCode(activeRoom.code)} title="Copiar código">
            <span>{activeRoom.code}</span>
            {codeCopied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>

        <div className="room-status-banner">
          <Users size={16} />
          <span>{members.length} miembro{members.length !== 1 ? 's' : ''}</span>
          {studyingCount > 0 && <strong className="studying-badge">{studyingCount} estudiando ahora 🔥</strong>}
          {pomodoroRunning
            ? <span className="your-status studying">Tú: estudiando</span>
            : <span className="your-status">Tú: pausado</span>
          }
        </div>

        <div className="members-list">
          {members.length === 0
            ? <p className="muted-copy" style={{ textAlign: 'center', padding: '20px 0' }}>Cargando miembros…</p>
            : members.map(renderMember)
          }
        </div>

        <p className="room-hint">
          <BookOpen size={13} />
          Activa el Pomodoro (botón ⏱ arriba) para aparecer como "estudiando" aquí en tiempo real.
        </p>
      </section>
    )
  }

  return (
    <section className="study-room-view">
      <section className="section-heading">
        <div>
          <p className="section-kicker">Estudia acompañado</p>
          <h2>Salas de estudio</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-button" onClick={() => { setShowJoin(true); setError('') }} title="Unirse"><LogIn size={20} /></button>
          <button className="icon-button" onClick={() => { setShowCreate(true); setError('') }} title="Crear"><Plus size={20} /></button>
        </div>
      </section>

      <p className="muted-copy" style={{ marginBottom: 20 }}>Crea una sala o únete con un código para estudiar con tus compañeros en tiempo real.</p>

      {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

      {loadingRooms
        ? <p className="muted-copy">Cargando salas…</p>
        : rooms.length === 0
          ? (
            <div className="empty-state">
              <span><Users size={24} /></span>
              <h3>Ninguna sala todavía</h3>
              <p>Crea una sala nueva o únete con el código de un amigo.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
                <button className="secondary-button" onClick={() => setShowCreate(true)}>Crear sala</button>
                <button className="secondary-button" onClick={() => setShowJoin(true)}>Unirse</button>
              </div>
            </div>
          )
          : (
            <div className="room-list">
              {rooms.map((room) => (
                <button key={room.id} className="room-card" onClick={() => setActiveRoom(room)}>
                  <div className="room-card-icon"><Users size={20} /></div>
                  <div className="room-card-body">
                    <strong>{room.name}</strong>
                    <span>{room.members.length} miembro{room.members.length !== 1 ? 's' : ''} · Código: <code>{room.code}</code></span>
                  </div>
                  <ArrowRight size={18} className="room-card-arrow" />
                </button>
              ))}
            </div>
          )
      }

      {/* Create modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <form className="modal task-form" onSubmit={handleCreate} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowCreate(false)}><X size={19} /></button>
            <p className="section-kicker">Nueva sala</p>
            <h2>¿Cómo se llama tu sala?</h2>
            <label>Nombre de la sala<input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Ej. Estudio nocturno" autoFocus required /></label>
            <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Creando…' : 'Crear sala'} <ArrowRight size={17} /></button>
          </form>
        </div>
      )}

      {/* Join modal */}
      {showJoin && (
        <div className="modal-backdrop" onClick={() => setShowJoin(false)}>
          <form className="modal task-form" onSubmit={handleJoin} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowJoin(false)}><X size={19} /></button>
            <p className="section-kicker">Unirse a sala</p>
            <h2>Introduce el código</h2>
            <label>Código de 6 caracteres<input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Ej. ABC123" maxLength={6} autoFocus required className="code-input" /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Buscando…' : 'Unirse'} <ArrowRight size={17} /></button>
          </form>
        </div>
      )}
    </section>
  )
}

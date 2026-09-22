import { useState } from 'react'
import { ArrowRight, CalendarDays, Check, Copy, Edit3, FolderKanban, LogIn, Plus, Share2, Trash2, Users, X } from 'lucide-react'
import type { Project } from '../../types/project'

interface ProjectsViewProps {
  userId: string
  projects: Project[]
  onSave: (project: Project) => void
  onDelete: (project: Project) => void
  onJoin: (code: string) => Promise<string | null>
}

const emptyProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  description: '',
  dueDate: '',
  progress: 0,
  code: '',
  ownerId: '',
  collaboratorIds: [],
}

export default function ProjectsView({ userId, projects, onSave, onDelete, onJoin }: ProjectsViewProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [copiedCode, setCopiedCode] = useState('')

  function openNewProject() {
    setEditingProject({ ...emptyProject, id: '', createdAt: '', updatedAt: '' })
    setShowForm(true)
  }

  function openEditProject(project: Project) {
    setEditingProject(project)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingProject(null)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingProject) return
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    if (!title) return
    const now = new Date().toISOString()
    onSave({
      ...editingProject,
      id: editingProject.id || crypto.randomUUID(),
      title,
      description: String(data.get('description') ?? '').trim(),
      dueDate: String(data.get('dueDate') ?? ''),
      progress: Number(data.get('progress') ?? 0),
      createdAt: editingProject.createdAt || now,
      updatedAt: now,
    })
    closeForm()
  }

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault()
    if (!joinCode.trim() || joining) return
    setJoining(true)
    setJoinError('')
    const error = await onJoin(joinCode)
    if (error) {
      setJoinError(error)
    } else {
      setShowJoin(false)
      setJoinCode('')
    }
    setJoining(false)
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(''), 2000)
    })
  }

  return (
    <section className="projects-view">
      <div className="projects-heading">
        <div><p className="section-kicker">Trabajos grandes</p><h2>Tus proyectos</h2><p className="muted-copy">Divide lo importante en pasos que puedas avanzar.</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="add-task-button" onClick={() => { setShowJoin(true); setJoinError('') }} aria-label="Unirse a proyecto compartido" title="Unirse por código"><LogIn size={20} /></button>
          <button className="add-task-button" onClick={openNewProject} aria-label="Crear proyecto"><Plus size={22} /></button>
        </div>
      </div>

      <div className="project-list">
        {projects.map((project) => {
          const isOwner = !project.ownerId || project.ownerId === userId
          const groupSize = (project.collaboratorIds?.length ?? 0) + 1
          return (
            <article className="project-card" key={project.id}>
              <div className="project-card-top"><span className="project-icon"><FolderKanban size={20} /></span><div className="project-actions">{project.code && <button className="share-code-button" onClick={() => copyCode(project.code)} title="Compartir por código" aria-label={`Compartir ${project.title} por código ${project.code}`}>{copiedCode === project.code ? <Check size={15} /> : <Share2 size={15} />}<span>{project.code}</span></button>}{project.code && copiedCode === project.code && <span className="code-copied-toast">¡Copiado!</span>}<button onClick={() => openEditProject(project)} aria-label={`Editar ${project.title}`}><Edit3 size={16} /></button>{isOwner && <button onClick={() => onDelete(project)} aria-label={`Eliminar ${project.title}`}><Trash2 size={16} /></button>}</div></div>
              <h3>{project.title}</h3>
              {project.description && <p>{project.description}</p>}
              <div className="project-meta">{project.dueDate && <span><CalendarDays size={14} /> {new Date(`${project.dueDate}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>}<span><Users size={14} /> {groupSize} en el grupo</span>{groupSize > 1 && !isOwner && <span className="shared-tag">Compartido</span>}</div>
              <div className="progress-row"><span>Progreso</span><strong>{project.progress}%</strong></div><div className="progress-track"><span style={{ width: `${project.progress}%` }} /></div>
            </article>
          )
        })}
      </div>
      {projects.length === 0 && <div className="empty-state"><span><FolderKanban size={24} /></span><h3>No tienes proyectos</h3><p>Cuando tengas un trabajo grande, podrás organizarlo aquí. Comparte el código de tu proyecto con tu grupo.</p><button className="primary-button" onClick={openNewProject}>Crear proyecto <ArrowRight size={17} /></button></div>}

      {showForm && editingProject && <div className="modal-backdrop" onClick={closeForm}><form className="modal project-form" onSubmit={submit} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={closeForm} aria-label="Cerrar"><X size={19} /></button><p className="section-kicker">{editingProject.id ? 'Editar proyecto' : 'Nuevo proyecto'}</p><h2>{editingProject.id ? 'Actualiza tu proyecto' : 'Dale forma a tu idea'}</h2><label>Título<input name="title" defaultValue={editingProject.title} placeholder="Ej. Trabajo de Historia" required autoFocus /></label><label>Descripción<textarea name="description" defaultValue={editingProject.description} placeholder="¿En qué consiste?" rows={3} /></label><label>Fecha de entrega<input name="dueDate" type="date" defaultValue={editingProject.dueDate} /></label><label>Progreso <output>{editingProject.progress}%</output><input name="progress" type="range" min="0" max="100" step="5" defaultValue={editingProject.progress} /></label>{!editingProject.id && <p className="exam-hint">✨ Al guardar se generará un código para compartir con tu grupo.</p>}<button className="primary-button" type="submit">Guardar proyecto <ArrowRight size={17} /></button></form></div>}

      {showJoin && <div className="modal-backdrop" onClick={() => setShowJoin(false)}><form className="modal task-form" onSubmit={handleJoin} onClick={(e) => e.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowJoin(false)}><X size={19} /></button><p className="section-kicker">Unirse a proyecto</p><h2>Introduce el código</h2><label>Código de 6 caracteres<input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Ej. ABC123" maxLength={6} autoFocus required className="code-input" /></label>{joinError && <p className="form-error">{joinError}</p>}<button className="primary-button" type="submit" disabled={joining}>{joining ? 'Buscando…' : 'Unirse'} <ArrowRight size={17} /></button></form></div>}
    </section>
  )
}
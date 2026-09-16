import { useState } from 'react'
import { ArrowRight, CalendarDays, Edit3, FolderKanban, Mail, Plus, Share2, Trash2, X } from 'lucide-react'
import type { Project } from '../../types/project'

interface ProjectsViewProps {
  projects: Project[]
  onSave: (project: Project) => void
  onDelete: (projectId: string) => void
}

const emptyProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  description: '',
  dueDate: '',
  progress: 0,
  sharedWith: [],
}

export default function ProjectsView({ projects, onSave, onDelete }: ProjectsViewProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showForm, setShowForm] = useState(false)

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
    const sharedWith = String(data.get('sharedWith') ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
    onSave({
      ...editingProject,
      id: editingProject.id || crypto.randomUUID(),
      title,
      description: String(data.get('description') ?? '').trim(),
      dueDate: String(data.get('dueDate') ?? ''),
      progress: Number(data.get('progress') ?? 0),
      sharedWith,
      createdAt: editingProject.createdAt || now,
      updatedAt: now,
    })
    closeForm()
  }

  return (
    <section className="projects-view">
      <div className="projects-heading">
        <div><p className="section-kicker">Trabajos grandes</p><h2>Tus proyectos</h2><p className="muted-copy">Divide lo importante en pasos que puedas avanzar.</p></div>
        <button className="add-task-button" onClick={openNewProject} aria-label="Crear proyecto"><Plus size={22} /></button>
      </div>
      <div className="project-list">
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <div className="project-card-top"><span className="project-icon"><FolderKanban size={20} /></span><div className="project-actions"><button onClick={() => openEditProject(project)} aria-label={`Editar ${project.title}`}><Edit3 size={16} /></button><button onClick={() => onDelete(project.id)} aria-label={`Eliminar ${project.title}`}><Trash2 size={16} /></button></div></div>
            <h3>{project.title}</h3>
            {project.description && <p>{project.description}</p>}
            <div className="project-meta">{project.dueDate && <span><CalendarDays size={14} /> {new Date(`${project.dueDate}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>}{project.sharedWith.length > 0 && <span><Share2 size={14} /> {project.sharedWith.length} compartido{project.sharedWith.length === 1 ? '' : 's'}</span>}</div>
            <div className="progress-row"><span>Progreso</span><strong>{project.progress}%</strong></div><div className="progress-track"><span style={{ width: `${project.progress}%` }} /></div>
          </article>
        ))}
      </div>
      {projects.length === 0 && <div className="empty-state"><span><FolderKanban size={24} /></span><h3>No tienes proyectos</h3><p>Cuando tengas un trabajo grande, podrás organizarlo aquí.</p><button className="primary-button" onClick={openNewProject}>Crear proyecto <ArrowRight size={17} /></button></div>}
      {showForm && editingProject && <div className="modal-backdrop" onClick={closeForm}><form className="modal project-form" onSubmit={submit} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={closeForm} aria-label="Cerrar"><X size={19} /></button><p className="section-kicker">{editingProject.id ? 'Editar proyecto' : 'Nuevo proyecto'}</p><h2>{editingProject.id ? 'Actualiza tu proyecto' : 'Dale forma a tu idea'}</h2><label>Título<input name="title" defaultValue={editingProject.title} placeholder="Ej. Trabajo de Historia" required autoFocus /></label><label>Descripción<textarea name="description" defaultValue={editingProject.description} placeholder="¿En qué consiste?" rows={3} /></label><label>Fecha de entrega<input name="dueDate" type="date" defaultValue={editingProject.dueDate} /></label><label>Progreso <output>{editingProject.progress}%</output><input name="progress" type="range" min="0" max="100" step="5" defaultValue={editingProject.progress} /></label><label><span><Mail size={15} /> Compartir con <small>correos separados por comas</small></span><input name="sharedWith" defaultValue={editingProject.sharedWith.join(', ')} placeholder="compañero@email.com" type="email" multiple /></label><button className="primary-button" type="submit">Guardar proyecto <ArrowRight size={17} /></button></form></div>}
    </section>
  )
}

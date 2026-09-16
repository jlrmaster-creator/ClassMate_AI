import { useState } from 'react'
import {
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  CirclePlus,
  Clock3,
  FolderKanban,
  Home,
  ListChecks,
  LogOut,
  Plus,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { getTasks, saveTasks } from './services/taskService'
import type { Task, TaskPriority } from './types/task'

const priorityLabels: Record<TaskPriority, string> = {
  high: 'Prioridad',
  medium: 'Despues',
  low: 'Si tienes tiempo',
}

const priorityColors: Record<TaskPriority, string> = {
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
}

interface AppProps {
  onLogout: () => Promise<void>
}

function App({ onLogout }: AppProps) {
  const [tasks, setTasks] = useState<Task[]>(getTasks)
  const [showMinutes, setShowMinutes] = useState(false)
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [activeTab, setActiveTab] = useState('Hoy')

  const pendingTasks = tasks.filter((task) => task.status === 'pending')
  const completedCount = tasks.length - pendingTasks.length
  const totalMinutes = pendingTasks.reduce((total, task) => total + task.estimatedMinutes, 0)

  function toggleTask(taskId: string) {
    const nextTasks: Task[] = tasks.map((task) =>
      task.id === taskId
        ? { ...task, status: task.status === 'completed' ? 'pending' : 'completed' }
        : task,
    )
    setTasks(nextTasks)
    saveTasks(nextTasks)
  }

  function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get('title') ?? '').trim()
    const subject = String(formData.get('subject') ?? '').trim()
    const minutes = Number(formData.get('minutes') ?? 30)
    if (!title || !subject || !minutes) return

    const nextTasks = [
      ...tasks,
      {
        id: crypto.randomUUID(),
        title,
        subject,
        estimatedMinutes: minutes,
        priority: 'medium' as const,
        status: 'pending' as const,
      },
    ]
    setTasks(nextTasks)
    saveTasks(nextTasks)
    setShowTaskForm(false)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-label="ClassMate AI">
          <span className="brand-icon"><Sparkles size={17} /></span>
          <span>ClassMate <strong>AI</strong></span>
        </div>
        <div className="topbar-actions"><button className="icon-button" aria-label="Notificaciones"><Bell size={20} /></button><button className="icon-button" onClick={onLogout} aria-label="Cerrar sesion"><LogOut size={18} /></button></div>
      </header>

      <main className="content">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">Miercoles, 16 de septiembre</p>
            <h1>Buenos dias, Alex <span aria-hidden="true">👋</span></h1>
            <p className="muted-copy">
              {pendingTasks.length > 0 ? `Tienes ${pendingTasks.length} cosas bajo control hoy.` : 'Estas al dia. Buen trabajo.'}
            </p>
          </div>
          <div className="streak" title="Dias activos esta semana">
            <span>5</span>
            <small>dias activos</small>
          </div>
        </section>

        <section className="focus-banner">
          <div className="focus-icon"><Sparkles size={22} /></div>
          <div>
            <p className="focus-label">Tu siguiente mejor paso</p>
            <p className="focus-text">Empieza por lo importante y deja espacio para respirar.</p>
          </div>
          <ArrowRight size={19} className="focus-arrow" />
        </section>

        <section className="section-heading">
          <div>
            <p className="section-kicker">Plan de hoy</p>
            <h2>{pendingTasks.length ? 'Lo que toca ahora' : 'Todo hecho por hoy'}</h2>
          </div>
          <span className="time-total"><Clock3 size={15} /> {totalMinutes} min</span>
        </section>

        <div className="task-list">
          {pendingTasks.map((task) => (
            <article className={`task-item ${priorityColors[task.priority]}`} key={task.id}>
              <button className="task-check" onClick={() => toggleTask(task.id)} aria-label={`Completar ${task.title}`}>
                <Check size={16} />
              </button>
              <div className="task-body">
                <span className="task-priority">{priorityLabels[task.priority]}</span>
                <p className="task-subject">{task.subject}</p>
                <h3>{task.title}</h3>
                <span className="task-time"><Clock3 size={14} /> {task.estimatedMinutes} min</span>
              </div>
              <ChevronDown size={18} className="task-chevron" />
            </article>
          ))}
          {completedCount > 0 && <p className="completed-note"><Check size={15} /> {completedCount} tarea{completedCount === 1 ? '' : 's'} completada{completedCount === 1 ? '' : 's'}</p>}
          {pendingTasks.length === 0 && <div className="empty-state"><span><Check size={24} /></span><h3>Estas al dia</h3><p>Parece que no tienes tareas pendientes.</p></div>}
        </div>

        <button className="minutes-button" onClick={() => setShowMinutes(true)}>
          <Clock3 size={20} />
          <span>Tengo X minutos</span>
          <ArrowRight size={18} />
        </button>

        <section className="quick-add">
          <div><span className="section-kicker">Anade sin complicarte</span><h2>Que tienes que hacer?</h2></div>
          <button className="add-task-button" onClick={() => setShowTaskForm(true)} aria-label="Anadir tarea"><Plus size={22} /></button>
        </section>
        <div className="input-options">
          <button onClick={() => setShowTaskForm(true)}><ListChecks size={18} /> Escribir</button>
          <button disabled><span>◌</span> Hablar</button>
          <button disabled><BookOpen size={18} /> Foto</button>
          <button disabled><FolderKanban size={18} /> Documento</button>
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Navegacion principal">
        {[
          { label: 'Hoy', icon: Home },
          { label: 'Tareas', icon: ListChecks },
          { label: 'Proyectos', icon: FolderKanban },
          { label: 'Anadir', icon: CirclePlus },
          { label: 'Perfil', icon: UserRound },
        ].map(({ label, icon: Icon }) => (
          <button className={activeTab === label ? 'nav-item active' : 'nav-item'} key={label} onClick={() => label === 'Anadir' ? setShowTaskForm(true) : setActiveTab(label)}>
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {showMinutes && <div className="modal-backdrop" onClick={() => setShowMinutes(false)}>
        <section className="modal" onClick={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowMinutes(false)} aria-label="Cerrar"><X size={19} /></button>
          <span className="modal-symbol"><Clock3 size={22} /></span>
          <p className="section-kicker">Plan rapido</p>
          <h2>Cuanto tiempo tienes?</h2>
          <p className="muted-copy">Te propondremos una combinacion realista.</p>
          <div className="minutes-grid">{[15, 30, 45, 60].map((minutes) => <button className={selectedMinutes === minutes ? 'selected' : ''} key={minutes} onClick={() => setSelectedMinutes(minutes)}>{minutes === 60 ? '1 hora' : `${minutes} min`}</button>)}</div>
          {selectedMinutes && <div className="plan-result"><strong>Tu plan de {selectedMinutes} minutos</strong><span>Empieza con {pendingTasks[0]?.title ?? 'tu siguiente tarea'}.</span><button onClick={() => setShowMinutes(false)}>Empezar plan <ArrowRight size={16} /></button></div>}
        </section>
      </div>}

      {showTaskForm && <div className="modal-backdrop" onClick={() => setShowTaskForm(false)}>
        <form className="modal task-form" onSubmit={addTask} onClick={(event) => event.stopPropagation()}>
          <button type="button" className="modal-close" onClick={() => setShowTaskForm(false)} aria-label="Cerrar"><X size={19} /></button>
          <p className="section-kicker">Nueva tarea</p><h2>Vamos a apuntarla</h2>
          <label>Que tienes que hacer?<input name="title" placeholder="Ej. Leer el capitulo 4" required autoFocus /></label>
          <label>Asignatura<input name="subject" placeholder="Ej. Historia" required /></label>
          <label>Tiempo estimado<select name="minutes" defaultValue="30"><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">1 hora</option></select></label>
          <button className="primary-button" type="submit">Guardar tarea <ArrowRight size={17} /></button>
        </form>
      </div>}
    </div>
  )
}

export default App

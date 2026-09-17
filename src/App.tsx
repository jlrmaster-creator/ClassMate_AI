import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Timer,
  BookOpen,
  Check,
  ChevronDown,
  CirclePlus,
  Clock3,
  CalendarDays,
  Edit3,
  FolderKanban,
  Home,
  ListChecks,
  LogOut,
  Plus,
  Share2,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { subscribeToTasks, createCloudTask, updateCloudTask, deleteCloudTask } from './services/taskService'
import { subscribeToProjects, createCloudProject, updateCloudProject, deleteCloudProject } from './services/projectService'
import { subscribeToProfile, updateCloudProfile } from './services/profileService'
import { getRewardSummary, pointsForTask } from './services/rewardService'
import type { Project } from './types/project'
import type { Task, TaskImportance, TaskPriority } from './types/task'
import type { UserProfile } from './types/userProfile'

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

const importanceLabels: Record<TaskImportance, string> = {
  essential: 'Esencial',
  important: 'Importante',
  normal: 'Normal',
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  return `${(minutes / 60).toString().replace('.', ',')} h`
}

interface AppProps {
  userId: string
  onLogout: () => Promise<void>
}

function App({ userId, onLogout }: AppProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [showMinutes, setShowMinutes] = useState(false)
  const [showPomodoro, setShowPomodoro] = useState(false)
  const [pomodoroMinutes, setPomodoroMinutes] = useState(15)
  const [pomodoroRemaining, setPomodoroRemaining] = useState(15 * 60)
  const [pomodoroRunning, setPomodoroRunning] = useState(false)
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(() => {
    const saved = localStorage.getItem('classmate-planner-minutes')
    return saved ? JSON.parse(saved) : null
  })
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [activeTab, setActiveTab] = useState('Hoy')
  const [profile, setProfile] = useState<UserProfile>({ name: '', nick: '', schoolYear: '', school: '', totalPoints: 0 })
  const [projects, setProjects] = useState<Project[]>([])
  const [schoolDays, setSchoolDays] = useState<number[]>(() => {
    const saved = localStorage.getItem('classmate-school-days')
    return saved ? JSON.parse(saved) : [0, 1, 2, 3, 4]
  })

  useEffect(() => subscribeToTasks(userId, setTasks) ?? undefined, [userId])
  useEffect(() => subscribeToProjects(userId, setProjects) ?? undefined, [userId])
  useEffect(() => subscribeToProfile(userId, setProfile) ?? undefined, [userId])

  const pendingTasks = tasks.filter((task) => task.status === 'pending')
  const completedTasks = tasks.filter((task) => task.status === 'completed')
  const completedCount = tasks.length - pendingTasks.length
  const totalMinutes = pendingTasks.reduce((total, task) => total + task.estimatedMinutes, 0)
  const recommendedTasks = pendingTasks
    .filter((task) => task.estimatedMinutes <= (selectedMinutes ?? Number.MAX_SAFE_INTEGER))
    .sort((first, second) => taskScore(second) - taskScore(first))

  function taskScore(task: Task): number {
    const priorityScore = { high: 30, medium: 20, low: 10 }[task.priority]
    const importanceScore = { essential: 30, important: 20, normal: 10 }[task.importance]
    const shortTaskBonus = task.estimatedMinutes <= (selectedMinutes ?? 30) ? 5 : 0
    return priorityScore + importanceScore + shortTaskBonus
  }

  useEffect(() => {
    if (!pomodoroRunning) return undefined
    const interval = window.setInterval(() => {
      setPomodoroRemaining((remaining) => Math.max(remaining - 1, 0))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [pomodoroRunning])

  useEffect(() => {
    if (!pomodoroRunning || pomodoroRemaining > 0) return
    setPomodoroRunning(false)
    playPomodoroAlarm()
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('ClassMate AI', { body: 'Tu sesión de estudio ha terminado.' })
    }
  }, [pomodoroRemaining, pomodoroRunning])

  function playPomodoroAlarm() {
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.35, audioContext.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.45)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.45)
    oscillator.addEventListener('ended', () => void audioContext.close())
  }

  function choosePomodoro(minutes: number) {
    setPomodoroMinutes(minutes)
    setPomodoroRemaining(minutes * 60)
    setPomodoroRunning(false)
  }

  async function startPomodoro() {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
    setPomodoroRunning(true)
  }

  function resetPomodoro() {
    setPomodoroRunning(false)
    setPomodoroRemaining(pomodoroMinutes * 60)
  }

  function formatPomodoroTime(seconds: number) {
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  }

  function toggleTask(taskId: string) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const isCompleted = task.status === 'completed'
    
    const nextTask: Task = {
      ...task,
      status: isCompleted ? 'pending' : 'completed',
      completedAt: isCompleted ? undefined : new Date().toISOString(),
    }
    
    setTasks(tasks.map((t) => t.id === taskId ? nextTask : t))
    void updateCloudTask(userId, nextTask)

    if (!isCompleted) {
      const points = pointsForTask(task)
      updateProfile({ ...profile, totalPoints: (profile.totalPoints || 0) + points })
    }
  }

  function saveTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get('title') ?? '').trim()
    const subject = String(formData.get('subject') ?? '').trim()
    const minutes = Number(formData.get('minutes') ?? 30)
    if (!title || !subject || !minutes) return

    const task: Task = {
      id: editingTask?.id ?? crypto.randomUUID(),
      title,
      subject,
      dueDate: String(formData.get('dueDate') ?? ''),
      estimatedMinutes: minutes,
      priority: String(formData.get('priority') ?? 'medium') as TaskPriority,
      importance: String(formData.get('importance') ?? 'normal') as TaskImportance,
      status: editingTask?.status ?? 'pending',
    }
    const nextTasks = editingTask
      ? tasks.map((item) => item.id === editingTask.id ? task : item)
      : [...tasks, task]
    setTasks(nextTasks)
    
    if (editingTask) void updateCloudTask(userId, task)
    else void createCloudTask(userId, task)
    setShowTaskForm(false)
    setEditingTask(null)
  }

  function openNewTask() {
    setEditingTask(null)
    setNewTaskDueDate('')
    setShowTaskForm(true)
  }

  function openTaskForDate(date: string) {
    if (date < new Date().toISOString().slice(0, 10)) return
    setEditingTask(null)
    setNewTaskDueDate(date)
    setShowTaskForm(true)
  }

  function openEditTask(task: Task) {
    setEditingTask(task)
    setShowTaskForm(true)
  }

  function deleteTask(taskId: string) {
    const nextTasks = tasks.filter((task) => task.id !== taskId)
    setTasks(nextTasks)
    void deleteCloudTask(userId, taskId)
  }

  function shareTask(task: Task) {
    const dueDate = task.dueDate
      ? new Date(`${task.dueDate}T12:00:00`).toLocaleDateString('es-ES')
      : 'sin fecha asignada'
    const text = [
      `Tarea: ${task.title}`,
      `Asignatura: ${task.subject}`,
      `Tiempo estimado: ${formatDuration(task.estimatedMinutes)}`,
      `Entrega: ${dueDate}`,
      `Prioridad: ${priorityLabels[task.priority]}`,
    ].join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  function updateProfile(nextProfile: UserProfile) {
    setProfile(nextProfile)
    void updateCloudProfile(userId, nextProfile)
  }

  function saveProject(project: Project) {
    const isExisting = projects.some((item) => item.id === project.id)
    const nextProjects = isExisting
      ? projects.map((item) => item.id === project.id ? project : item)
      : [...projects, project]
    setProjects(nextProjects)
    
    if (isExisting) void updateCloudProject(userId, project)
    else void createCloudProject(userId, project)
  }

  function deleteProject(projectId: string) {
    const nextProjects = projects.filter((project) => project.id !== projectId)
    setProjects(nextProjects)
    void deleteCloudProject(userId, projectId)
  }

  function updateSchoolDays(days: number[]) {
    setSchoolDays(days)
    localStorage.setItem('classmate-school-days', JSON.stringify(days))
  }

  function renderTask(task: Task, showActions = false) {
    const isCompleted = task.status === 'completed'
    return (
      <article className={`task-item ${priorityColors[task.priority]} ${isCompleted ? 'task-completed' : ''}`} key={task.id}>
        <button className="task-check" onClick={() => toggleTask(task.id)} aria-label={`${isCompleted ? 'Reabrir' : 'Completar'} ${task.title}`}>
          {isCompleted && <Check size={16} />}
        </button>
        <div className="task-body">
          <span className="task-priority">{isCompleted ? 'Completada' : `${priorityLabels[task.priority]} · ${importanceLabels[task.importance]}`}</span>
          <p className="task-subject">{task.subject}</p>
          <h3>{task.title}</h3>
          <span className="task-time"><Clock3 size={14} /> {task.estimatedMinutes} min</span>
        </div>
        {showActions ? <span className="task-actions"><button className="task-share" onClick={() => shareTask(task)} aria-label={`Compartir ${task.title} por WhatsApp`}><Share2 size={16} /></button><button className="task-edit" onClick={() => openEditTask(task)} aria-label={`Editar ${task.title}`}><Edit3 size={16} /></button><button className="task-delete" onClick={() => deleteTask(task.id)} aria-label={`Eliminar ${task.title}`}><X size={16} /></button></span> : <ChevronDown size={18} className="task-chevron" />}
      </article>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-label="ClassMate AI">
          <span className="brand-icon"><Sparkles size={17} /></span>
          <span>ClassMate <strong>AI</strong></span>
        </div>
        <div className="topbar-actions"><button className="icon-button" onClick={() => setShowPomodoro(true)} aria-label="Abrir temporizador Pomodoro"><Timer size={20} /></button><button className="icon-button" onClick={onLogout} aria-label="Cerrar sesion"><LogOut size={18} /></button></div>
      </header>

      <main className="content">
        {activeTab === 'Perfil' ? <ProfileView profile={profile} tasks={tasks} onSave={updateProfile} /> : activeTab === 'Proyectos' ? <ProjectsView projects={projects} onSave={saveProject} onDelete={deleteProject} /> : activeTab === 'Calendario' ? <CalendarView tasks={tasks} schoolDays={schoolDays} onSchoolDaysChange={updateSchoolDays} onCreateTask={openTaskForDate} /> : <>
        <section className="welcome-row">
          <div>
            <p className="eyebrow">Miercoles, 16 de septiembre</p>
            <h1>Buenos dias{profile.nick ? `, ${profile.nick}` : ''} <span aria-hidden="true">👋</span></h1>
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

        {activeTab === 'Tareas' ? <section className="tasks-view">
          <section className="section-heading">
            <div><p className="section-kicker">Tu lista completa</p><h2>Todas tus tareas</h2></div>
            <span className="time-total">{tasks.length} en total</span>
          </section>
          <div className="task-list">
            {tasks.map((task) => renderTask(task, true))}
            {tasks.length === 0 && <div className="empty-state"><span><ListChecks size={24} /></span><h3>No tienes tareas</h3><p>Añade una para empezar a organizarte.</p></div>}
          </div>
          {tasks.length > 0 && <p className="tasks-retention"><Check size={15} /> Las tareas completadas seguirán aquí hasta que las elimines.</p>}
        </section> : <>
        <section className="section-heading">
          <div>
            <p className="section-kicker">Plan de hoy</p>
            <h2>{pendingTasks.length ? 'Lo que toca ahora' : 'Todo hecho por hoy'}</h2>
          </div>
          <span className="time-total"><Clock3 size={15} /> {totalMinutes} min</span>
        </section>

        <div className="task-list">
          {pendingTasks.map((task) => renderTask(task, true))}
          {completedCount > 0 && <p className="completed-note"><Check size={15} /> {completedCount} tarea{completedCount === 1 ? '' : 's'} completada{completedCount === 1 ? '' : 's'}</p>}
          {pendingTasks.length === 0 && <div className="empty-state"><span><Check size={24} /></span><h3>Estas al dia</h3><p>Parece que no tienes tareas pendientes.</p></div>}
        </div>

        <button className="minutes-button" onClick={() => setShowMinutes(true)}>
          <Clock3 size={20} />
          <span>{selectedMinutes ? `Tengo ${formatDuration(selectedMinutes)}` : 'Tengo X minutos'}</span>
          <ArrowRight size={18} />
        </button>

        <section className="quick-add">
          <div><span className="section-kicker">Anade sin complicarte</span><h2>Que tienes que hacer?</h2></div>
          <button className="add-task-button" onClick={openNewTask} aria-label="Anadir tarea"><Plus size={22} /></button>
        </section>
        <div className="input-options">
          <button onClick={openNewTask}><ListChecks size={18} /> Escribir</button>
          <button disabled><span>◌</span> Hablar</button>
          <button disabled><BookOpen size={18} /> Foto</button>
          <button disabled><FolderKanban size={18} /> Documento</button>
        </div>
        </>}
        </>}
      </main>

      <nav className="bottom-nav" aria-label="Navegacion principal">
        {[
          { label: 'Hoy', icon: Home },
          { label: 'Tareas', icon: ListChecks },
          { label: 'Proyectos', icon: FolderKanban },
          { label: 'Calendario', icon: CalendarDays },
          { label: 'Anadir', icon: CirclePlus },
          { label: 'Perfil', icon: UserRound },
        ].map(({ label, icon: Icon }) => (
          <button className={activeTab === label ? 'nav-item active' : 'nav-item'} key={label} onClick={() => label === 'Anadir' ? openNewTask() : setActiveTab(label)}>
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
          <div className="minutes-grid">{[15, 30, 45, 60, 90, 120, 150, 180].map((minutes) => <button className={selectedMinutes === minutes ? 'selected' : ''} key={minutes} onClick={() => { setSelectedMinutes(minutes); localStorage.setItem('classmate-planner-minutes', JSON.stringify(minutes)) }}>{formatDuration(minutes)}</button>)}</div>
          {selectedMinutes && <p className="selected-time"><Clock3 size={15} /> Tiempo elegido: <strong>{formatDuration(selectedMinutes)}</strong></p>}
          {selectedMinutes && <div className="plan-result"><strong>Tu plan de {formatDuration(selectedMinutes)}</strong><span>{recommendedTasks[0] ? `Te recomendamos empezar por ${recommendedTasks[0].title}.` : 'No hay una tarea que encaje en ese tiempo.'}</span>{recommendedTasks.length > 0 && <small>Prioridad: {importanceLabels[recommendedTasks[0].importance].toLowerCase()} · {priorityLabels[recommendedTasks[0].priority].toLowerCase()}</small>}<button onClick={() => setShowMinutes(false)}>Empezar plan <ArrowRight size={16} /></button></div>}
        </section>
      </div>}

      {showPomodoro && <div className="modal-backdrop" onClick={() => setShowPomodoro(false)}>
        <section className="modal pomodoro-modal" onClick={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowPomodoro(false)} aria-label="Cerrar"><X size={19} /></button>
          <span className="modal-symbol"><Timer size={22} /></span>
          <p className="section-kicker">Temporizador de estudio</p>
          <h2>Pomodoro</h2>
          <p className="muted-copy">Concéntrate durante un tiempo y recibe una alarma al terminar.</p>
          <div className="pomodoro-time">{formatPomodoroTime(pomodoroRemaining)}</div>
          <div className="pomodoro-options">{[15, 30, 60].map((minutes) => <button className={pomodoroMinutes === minutes ? 'selected' : ''} key={minutes} onClick={() => choosePomodoro(minutes)} disabled={pomodoroRunning}>{minutes === 60 ? '1 hora' : `${minutes} min`}</button>)}</div>
          <div className="pomodoro-actions"><button className="primary-button" onClick={pomodoroRunning ? () => setPomodoroRunning(false) : startPomodoro}>{pomodoroRunning ? 'Pausar' : pomodoroRemaining === 0 ? 'Empezar de nuevo' : 'Empezar sesión'} <Timer size={17} /></button><button className="pomodoro-reset" onClick={resetPomodoro}>Reiniciar</button></div>
        </section>
      </div>}

      {showTaskForm && <div className="modal-backdrop" onClick={() => { setShowTaskForm(false); setEditingTask(null) }}>
        <form className="modal task-form" onSubmit={saveTask} onClick={(event) => event.stopPropagation()}>
          <button type="button" className="modal-close" onClick={() => { setShowTaskForm(false); setEditingTask(null) }} aria-label="Cerrar"><X size={19} /></button>
          <p className="section-kicker">{editingTask ? 'Editar tarea' : 'Nueva tarea'}</p><h2>{editingTask ? 'Actualiza tu tarea' : 'Vamos a apuntarla'}</h2>
          <label>Que tienes que hacer?<input name="title" defaultValue={editingTask?.title} placeholder="Ej. Leer el capitulo 4" required autoFocus /></label>
          <label>Asignatura<input name="subject" defaultValue={editingTask?.subject} placeholder="Ej. Historia" required /></label>
          <label>Importancia<select name="importance" defaultValue={editingTask?.importance ?? 'normal'}><option value="essential">Esencial</option><option value="important">Importante</option><option value="normal">Normal</option></select></label>
          <label>Prioridad<select name="priority" defaultValue={editingTask?.priority ?? 'medium'}><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></label>
          <label>Tiempo estimado<select name="minutes" defaultValue={String(editingTask?.estimatedMinutes ?? 30)}><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">1 hora</option><option value="90">1,5 horas</option><option value="120">2 horas</option><option value="150">2,5 horas</option><option value="180">3 horas</option></select></label>
          <label>Fecha de entrega<input name="dueDate" type="date" min={new Date().toISOString().slice(0, 10)} defaultValue={editingTask?.dueDate ?? newTaskDueDate} /></label>
          <button className="primary-button" type="submit">Guardar tarea <ArrowRight size={17} /></button>
        </form>
      </div>}
    </div>
  )
}

export default App

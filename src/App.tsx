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
  Search,
  Share2,
  Sparkles,
  Table,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { subscribeToTasks, createCloudTask, updateCloudTask, deleteCloudTask } from './services/taskService'
import ProfileView from './features/profile/ProfileView'
import PhotoView from './features/photo/PhotoView'
import ProjectsView from './features/projects/ProjectsView'
import CalendarView from './features/calendar/CalendarView'
import TimetableView from './features/timetable/TimetableView'
import StudyRoomView from './features/study/StudyRoomView'
import { subscribeToProjects, createCloudProject, updateCloudProject, deleteCloudProject, joinProjectByCode } from './services/projectService'
import { subscribeToTimetable, createCloudTimetableSlot, updateCloudTimetableSlot, deleteCloudTimetableSlot } from './services/timetableService'
import { subscribeToProfile, updateCloudProfile, ensureCloudProfile, awardCloudPoints } from './services/profileService'
import { getRewardSummary, pointsForTask } from './services/rewardService'
import { buyItem, useItem, type StoreItem } from './services/storeService'
import { generateStudySessions } from './services/examService'
import type { Project } from './types/project'
import type { Task, TaskImportance, TaskPriority, TaskType } from './types/task'
import type { TimetableSlot } from './types/timetable'
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

/** Clave de día local (YYYY-MM-DD) para calcular la racha sin errores de zona horaria. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Días consecutivos (hasta hoy, o hasta ayer si hoy aún no hay actividad) con tareas completadas. */
function computeStreak(tasks: Task[]): number {
  const activeDays = new Set<string>()
  tasks.forEach((task) => {
    if (task.status === 'completed' && task.completedAt) {
      activeDays.add(dayKey(new Date(task.completedAt)))
    }
  })
  let streak = 0
  const cursor = new Date()
  if (!activeDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (activeDays.has(dayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
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
  const [pomodoroSubject, setPomodoroSubject] = useState('')
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(() => {
    const saved = localStorage.getItem('classmate-planner-minutes')
    return saved ? JSON.parse(saved) : null
  })
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [newTaskSubject, setNewTaskSubject] = useState('')
  const [taskFormType, setTaskFormType] = useState<TaskType>('task')
  const [activeTab, setActiveTab] = useState('Hoy')
  const [profile, setProfile] = useState<UserProfile>({ name: '', nick: '', schoolYear: '', school: '', totalPoints: 0 })
  const [projects, setProjects] = useState<Project[]>([])
  const [timetable, setTimetable] = useState<TimetableSlot[]>([])
  const [schoolDays, setSchoolDays] = useState<number[]>(() => {
    const saved = localStorage.getItem('classmate-school-days')
    return saved ? JSON.parse(saved) : [0, 1, 2, 3, 4]
  })
  const [taskSearch, setTaskSearch] = useState('')
  const [taskSubjectFilter, setTaskSubjectFilter] = useState('all')
  const [taskStatusFilter, setTaskStatusFilter] = useState('all')
  const [taskSort, setTaskSort] = useState<'score' | 'due' | 'title'>('score')
  const [voiceDraft, setVoiceDraft] = useState('')
  const [voiceListening, setVoiceListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [showPhoto, setShowPhoto] = useState(false)

  useEffect(() => subscribeToTasks(userId, setTasks) ?? undefined, [userId])
  useEffect(() => subscribeToProjects(userId, setProjects) ?? undefined, [userId])
  useEffect(() => subscribeToTimetable(userId, setTimetable) ?? undefined, [userId])
  useEffect(() => subscribeToProfile(userId, setProfile) ?? undefined, [userId])
  // Garantiza que el doc del perfil exista con los campos que exigen las reglas
  // (id/createdAt/updatedAt); si no, las escrituras de totalPoints se deniegan en silencio
  // y el saldo de la tienda nunca se actualiza al completar tareas.
  useEffect(() => { void ensureCloudProfile(userId) }, [userId])

  // Aplica el tema de color comprado en la tienda
  useEffect(() => {
    document.documentElement.dataset.theme = profile.theme || 'esmeralda'
  }, [profile.theme])

  const pendingTasks = tasks.filter((task) => task.status === 'pending')
  const completedTasks = tasks.filter((task) => task.status === 'completed')
  const completedCount = tasks.length - pendingTasks.length
  const totalMinutes = pendingTasks.reduce((total, task) => total + task.estimatedMinutes, 0)
  const recommendedTasks = pendingTasks
    .filter((task) => task.estimatedMinutes <= (selectedMinutes ?? Number.MAX_SAFE_INTEGER))
    .sort((first, second) => taskScore(second) - taskScore(first))

  const activeStreak = computeStreak(tasks)
  const rewardSummary = getRewardSummary(tasks)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const weekTasks = tasks.filter((task) => task.status === 'completed' && task.completedAt && new Date(task.completedAt) >= weekStart)
  const weekMinutes = weekTasks.reduce((total, task) => total + task.estimatedMinutes, 0)
  const focusTask = recommendedTasks[0] ?? null

  const taskSubjects = Array.from(new Set(tasks.map((task) => task.subject))).sort()
  const filteredTasks = tasks
    .filter((task) => {
      const query = taskSearch.trim().toLowerCase()
      const matchesQuery = !query || task.title.toLowerCase().includes(query) || task.subject.toLowerCase().includes(query)
      const matchesSubject = taskSubjectFilter === 'all' || task.subject === taskSubjectFilter
      const matchesStatus = taskStatusFilter === 'all' || (taskStatusFilter === 'completed' ? task.status === 'completed' : task.status === 'pending')
      return matchesQuery && matchesSubject && matchesStatus
    })
    .sort((first, second) => {
      if (taskSort === 'due') return (first.dueDate || '9999').localeCompare(second.dueDate || '9999')
      if (taskSort === 'title') return first.title.localeCompare(second.title)
      return taskScore(second) - taskScore(first)
    })

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
      // Suma ATOMICA en Firestore + update funcional local: evita lost-updates por closure
      // desfasada y garantiza que la tienda reciba el saldo actualizado vía onSnapshot.
      awardCloudPoints(userId, points)
      setProfile((current) => ({ ...current, totalPoints: (current.totalPoints || 0) + points }))
    }
  }

  function saveTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get('title') ?? '').trim()
    const subject = String(formData.get('subject') ?? '').trim()
    const minutes = Number(formData.get('minutes') ?? 30)
    const type = String(formData.get('type') ?? 'task') as TaskType
    const dueDate = String(formData.get('dueDate') ?? '')
    const examTopicsRaw = String(formData.get('examTopics') ?? '').trim()
    if (!title || !subject || !minutes) return

    const task: Task = {
      id: editingTask?.id ?? crypto.randomUUID(),
      type,
      title,
      subject,
      dueDate,
      estimatedMinutes: minutes,
      priority: String(formData.get('priority') ?? 'medium') as TaskPriority,
      importance: String(formData.get('importance') ?? 'normal') as TaskImportance,
      status: editingTask?.status ?? 'pending',
      examTopics: type === 'exam' ? examTopicsRaw : undefined,
    }

    if (editingTask) {
      setTasks(tasks.map((item) => item.id === editingTask.id ? task : item))
      void updateCloudTask(userId, task)
    } else {
      setTasks([...tasks, task])
      void createCloudTask(userId, task)

      // If exam mode: auto-generate study sessions
      if (type === 'exam' && dueDate) {
        const topics = examTopicsRaw ? examTopicsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []
        const sessions = generateStudySessions(subject, dueDate, topics, minutes, task.priority)
        sessions.forEach((session) => {
          const sessionTask: Task = {
            id: crypto.randomUUID(),
            type: 'task',
            subject,
            title: session.title,
            dueDate: session.dueDate,
            estimatedMinutes: session.estimatedMinutes,
            priority: session.priority,
            importance: session.importance,
            status: 'pending',
            parentExamId: task.id,
          }
          void createCloudTask(userId, sessionTask)
        })
      }
    }

    setShowTaskForm(false)
    setEditingTask(null)
    setTaskFormType('task')
  }

  function openNewTask() {
    setEditingTask(null)
    setNewTaskDueDate('')
    setNewTaskSubject('')
    setTaskFormType('task')
    setShowTaskForm(true)
  }

  function openTaskForDate(date: string) {
    if (date < new Date().toISOString().slice(0, 10)) return
    setEditingTask(null)
    setNewTaskDueDate(date)
    setNewTaskSubject('')
    setShowTaskForm(true)
  }

  function openTaskForSubject(subject: string) {
    setEditingTask(null)
    setNewTaskDueDate('')
    setNewTaskSubject(subject)
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

  function startVoiceInput() {
    type RecognitionLike = {
      lang: string
      interimResults: boolean
      maxAlternatives: number
      start: () => void
      stop: () => void
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
      onerror: (() => void) | null
      onend: (() => void) | null
    }
    type RecognitionCtor = new () => RecognitionLike
    const windowWithSpeech = window as Window & {
      SpeechRecognition?: RecognitionCtor
      webkitSpeechRecognition?: RecognitionCtor
    }
    const SpeechRecognition = windowWithSpeech.SpeechRecognition ?? windowWithSpeech.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setVoiceError('Tu navegador no soporta dictado por voz. Prueba con Chrome o Edge.')
      return
    }

    setVoiceError('')
    const recognition = new SpeechRecognition()
    recognition.lang = 'es-ES'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    setVoiceListening(true)

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? ''
      setVoiceListening(false)
      if (!transcript) {
        setVoiceError('No te he entendido. Inténtalo otra vez.')
        return
      }
      setVoiceDraft(transcript)
      setEditingTask(null)
      setNewTaskDueDate('')
      setNewTaskSubject('')
      setTaskFormType('task')
      setShowTaskForm(true)
    }
    recognition.onerror = () => {
      setVoiceListening(false)
      setVoiceError('No se pudo capturar el audio.')
    }
    recognition.onend = () => setVoiceListening(false)

    try {
      recognition.start()
    } catch {
      setVoiceListening(false)
      setVoiceError('No se pudo iniciar el micrófono.')
    }
  }

  function createTasksFromPhoto(titles: string[], subject: string, minutes: number) {
    const newTasks: Task[] = titles.map((title) => ({
      id: crypto.randomUUID(),
      type: 'task',
      title,
      subject,
      estimatedMinutes: minutes,
      priority: 'medium',
      importance: 'normal',
      status: 'pending',
    }))
    setTasks([...tasks, ...newTasks])
    newTasks.forEach((task) => void createCloudTask(userId, task))
    setShowPhoto(false)
  }

  function updateProfile(nextProfile: UserProfile) {
    setProfile(nextProfile)
    void updateCloudProfile(userId, nextProfile)
  }

  function buyStoreItem(item: StoreItem): string | null {
    const result = buyItem(profile, item)
    if (!result.ok || !result.profile) {
      return result.message ?? 'No se pudo completar la compra.'
    }
    // Descuento ATOMICO (increment negativo) + estado funcional local para evitar lost-updates
    // al comprar rápido; el saldo real siempre llega vía onSnapshot.
    awardCloudPoints(userId, -item.price)
    setProfile((current) => buyItem(current, item).profile ?? current)
    return null
  }

  function applyStoreItem(item: StoreItem) {
    updateProfile(useItem(profile, item))
  }

  function saveProject(project: Project) {
    // Update FUNCIONAL: evita lost-update local cuando cambias el progreso rápido
    // y el onSnapshot de proyectos llega con un valor previo (mismo patrón que los puntos).
    const isExisting = projects.some((item) => item.id === project.id)
    setProjects((current) => {
      return current.some((item) => item.id === project.id)
        ? current.map((item) => item.id === project.id ? project : item)
        : [...current, project]
    })
    
    if (isExisting) void updateCloudProject(userId, project)
    else void createCloudProject(userId, project)
  }

  function deleteProject(project: Project) {
    const nextProjects = projects.filter((item) => item.id !== project.id)
    setProjects(nextProjects)
    void deleteCloudProject(project.ownerId || userId, project.id)
  }

  function saveTimetableSlot(slot: TimetableSlot) {
    const isExisting = timetable.some((item) => item.id === slot.id)
    const nextTimetable = isExisting
      ? timetable.map((item) => item.id === slot.id ? slot : item)
      : [...timetable, slot]
    setTimetable(nextTimetable)
    
    if (isExisting) void updateCloudTimetableSlot(userId, slot)
    else void createCloudTimetableSlot(userId, slot)
  }

  function deleteTimetableSlot(slotId: string) {
    const nextTimetable = timetable.filter((slot) => slot.id !== slotId)
    setTimetable(nextTimetable)
    void deleteCloudTimetableSlot(userId, slotId)
  }

  function updateSchoolDays(days: number[]) {
    setSchoolDays(days)
    localStorage.setItem('classmate-school-days', JSON.stringify(days))
  }

  function renderTask(task: Task, showActions = false) {
    const isCompleted = task.status === 'completed'
    const isExam = task.type === 'exam'
    return (
      <article className={`task-item ${priorityColors[task.priority]} ${isCompleted ? 'task-completed' : ''} ${isExam ? 'task-exam' : ''}`} key={task.id}>
        <button className="task-check" onClick={() => toggleTask(task.id)} aria-label={`${isCompleted ? 'Reabrir' : 'Completar'} ${task.title}`}>
          {isCompleted && <Check size={16} />}
        </button>
        <div className="task-body">
          <span className="task-priority">
            {isExam && <span className="exam-badge">📝 Examen</span>}
            {!isExam && (isCompleted ? 'Completada' : `${priorityLabels[task.priority]} · ${importanceLabels[task.importance]}`)}
          </span>
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
        {activeTab === 'Perfil' ? <ProfileView profile={profile} tasks={tasks} onSave={updateProfile} onBuy={buyStoreItem} onUse={applyStoreItem} /> : activeTab === 'Horario' ? <TimetableView slots={timetable} onSaveSlot={saveTimetableSlot} onDeleteSlot={deleteTimetableSlot} onCreateTaskForSubject={openTaskForSubject} /> : activeTab === 'Estudio' ? <StudyRoomView userId={userId} userNick={profile.nick || 'Estudiante'} pomodoroRunning={pomodoroRunning} pomodoroSubject={pomodoroSubject} /> : activeTab === 'Calendario' ? <CalendarView tasks={tasks} schoolDays={schoolDays} onSchoolDaysChange={updateSchoolDays} onCreateTask={openTaskForDate} /> : <>
        <section className="welcome-row">
          <div>
            <p className="eyebrow">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1>Buenos dias{profile.nick ? `, ${profile.nick}` : ''} {profile.badge && <span className="name-badge" aria-hidden="true">{profile.badge}</span>} <span aria-hidden="true">👋</span></h1>
            <p className="muted-copy">
              {pendingTasks.length > 0 ? `Tienes ${pendingTasks.length} cosas bajo control hoy.` : 'Estas al dia. Buen trabajo.'}
            </p>
          </div>
          <div className="streak" title="Dias seguidos con tareas completadas">
            <span>{activeStreak}</span>
            <small>{activeStreak === 1 ? 'dia de racha' : 'dias de racha'}</small>
          </div>
        </section>

        <section className="week-stats" aria-label="Resumen de la semana">
          <span className="week-stat"><strong>{weekTasks.length}</strong><small>tareas hechas</small></span>
          <span className="week-stat"><strong>{formatDuration(weekMinutes)}</strong><small>de estudio</small></span>
          <span className="week-stat"><strong>{rewardSummary.weeklyPoints} pts</strong><small>esta semana</small></span>
        </section>

        <section className="focus-banner">
          <div className="focus-icon"><Sparkles size={22} /></div>
          <div>
            <p className="focus-label">Tu siguiente mejor paso</p>
            {focusTask ? (
              <>
                <p className="focus-text"><strong>{focusTask.title}</strong> · {focusTask.subject}</p>
                <p className="focus-sub">{formatDuration(focusTask.estimatedMinutes)} · {importanceLabels[focusTask.importance].toLowerCase()}</p>
              </>
            ) : (
              <p className="focus-text">Estás al día. Descansa o adelanta trabajo.</p>
            )}
          </div>
          <ArrowRight size={19} className="focus-arrow" />
        </section>

        {activeTab === 'Tareas' ? <section className="tasks-view">
          <section className="section-heading">
            <div><p className="section-kicker">Tu lista completa</p><h2>Todas tus tareas</h2></div>
            <span className="time-total">{filteredTasks.length} de {tasks.length}</span>
          </section>
          <div className="task-filters" role="search">
            <label className="task-search"><Search size={15} /><input value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Buscar tarea…" aria-label="Buscar tarea" /></label>
            <select value={taskSubjectFilter} onChange={(event) => setTaskSubjectFilter(event.target.value)} aria-label="Filtrar por asignatura">
              <option value="all">Todas las asignaturas</option>
              {taskSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
            </select>
            <select value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value)} aria-label="Filtrar por estado">
              <option value="all">Todas</option>
              <option value="pending">Pendientes</option>
              <option value="completed">Completadas</option>
            </select>
            <select value={taskSort} onChange={(event) => setTaskSort(event.target.value as 'score' | 'due' | 'title')} aria-label="Ordenar tareas">
              <option value="score">Por prioridad</option>
              <option value="due">Por fecha</option>
              <option value="title">Por nombre</option>
            </select>
          </div>
          <section className="quick-add">
            <div><span className="section-kicker">Añade sin complicarte</span><h2>¿Qué tienes que hacer?</h2></div>
            <button className="add-task-button" onClick={openNewTask} aria-label="Anadir tarea"><Plus size={22} /></button>
          </section>
          <div className="task-list">
            {filteredTasks.map((task) => renderTask(task, true))}
            {filteredTasks.length === 0 && <div className="empty-state"><span><ListChecks size={24} /></span><h3>{tasks.length === 0 ? 'No tienes tareas' : 'Nada coincide'}</h3><p>{tasks.length === 0 ? 'Añade una para empezar a organizarte.' : 'Prueba a cambiar el filtro o la búsqueda.'}</p></div>}
          </div>
          {tasks.length > 0 && <p className="tasks-retention"><Check size={15} /> Las tareas completadas seguirán aquí hasta que las elimines.</p>}

          <ProjectsView userId={userId} projects={projects} onSave={saveProject} onDelete={deleteProject} onJoin={(code) => joinProjectByCode(userId, code)} />
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
          <button onClick={startVoiceInput} aria-label="Crear tarea por voz"><span>◌</span> {voiceListening ? 'Escuchando…' : 'Hablar'}</button>
          <button onClick={() => setShowPhoto(true)}><BookOpen size={18} /> Foto</button>
          <button onClick={() => setShowPhoto(true)}><FolderKanban size={18} /> Documento</button>
        </div>
        {voiceError && <p className="voice-error" role="alert">{voiceError}</p>}
        </>}
        </>}
      </main>

      <nav className="bottom-nav" aria-label="Navegacion principal">
        {[
          { label: 'Hoy', icon: Home },
          { label: 'Horario', icon: Table },
          { label: 'Estudio', icon: Users },
          { label: 'Tareas', icon: ListChecks },
          { label: 'Calendario', icon: CalendarDays },
          { label: 'Perfil', icon: UserRound },
        ].map(({ label, icon: Icon }) => (
          <button className={activeTab === label ? 'nav-item active' : 'nav-item'} key={label} onClick={() => setActiveTab(label)}>
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
          <input className="pomodoro-subject" value={pomodoroSubject} onChange={(e) => setPomodoroSubject(e.target.value)} placeholder="¿Qué vas a estudiar?" maxLength={60} />
          <div className="pomodoro-time">{formatPomodoroTime(pomodoroRemaining)}</div>
          <div className="pomodoro-options">{[15, 30, 60].map((minutes) => <button className={pomodoroMinutes === minutes ? 'selected' : ''} key={minutes} onClick={() => choosePomodoro(minutes)} disabled={pomodoroRunning}>{minutes === 60 ? '1 hora' : `${minutes} min`}</button>)}</div>
          <div className="pomodoro-actions"><button className="primary-button" onClick={pomodoroRunning ? () => setPomodoroRunning(false) : startPomodoro}>{pomodoroRunning ? 'Pausar' : pomodoroRemaining === 0 ? 'Empezar de nuevo' : 'Empezar sesión'} <Timer size={17} /></button><button className="pomodoro-reset" onClick={resetPomodoro}>Reiniciar</button></div>
        </section>
      </div>}

      {showTaskForm && <div className="modal-backdrop" onClick={() => { setShowTaskForm(false); setEditingTask(null); setTaskFormType('task') }}>
        <form className="modal task-form" onSubmit={saveTask} onClick={(event) => event.stopPropagation()}>
          <button type="button" className="modal-close" onClick={() => { setShowTaskForm(false); setEditingTask(null); setTaskFormType('task') }} aria-label="Cerrar"><X size={19} /></button>

          {/* Task type toggle — only shown when creating (not editing) */}
          {!editingTask && (
            <div className="task-type-toggle">
              <button type="button" className={taskFormType === 'task' ? 'active' : ''} onClick={() => setTaskFormType('task')}>📋 Tarea</button>
              <button type="button" className={taskFormType === 'exam' ? 'active' : ''} onClick={() => setTaskFormType('exam')}>📝 Examen</button>
            </div>
          )}

          <input type="hidden" name="type" value={taskFormType} />

          <p className="section-kicker">{editingTask ? 'Editar tarea' : taskFormType === 'exam' ? 'Nuevo examen' : 'Nueva tarea'}</p>
          <h2>{editingTask ? 'Actualiza tu tarea' : taskFormType === 'exam' ? '¿Cuándo es el examen?' : 'Vamos a apuntarla'}</h2>

          <label>Asignatura<input name="subject" defaultValue={editingTask?.subject ?? newTaskSubject} placeholder="Ej. Historia" required autoFocus /></label>
          <label>{taskFormType === 'exam' ? 'Nombre del examen' : '¿Qué tienes que hacer?'}<input name="title" defaultValue={editingTask?.title ?? voiceDraft} placeholder={taskFormType === 'exam' ? 'Ej. Examen Tema 4-6' : 'Ej. Leer el capítulo 4'} required /></label>

          {taskFormType === 'exam' && (
            <label>
              Temas a estudiar <span className="label-hint">(separados por comas)</span>
              <input name="examTopics" defaultValue={editingTask?.examTopics} placeholder="Ej. Revolución Francesa, Napoleón, Restauración" />
            </label>
          )}

          <label>Prioridad<select name="priority" defaultValue={editingTask?.priority ?? (taskFormType === 'exam' ? 'high' : 'medium')}><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></label>
          <label>Importancia<select name="importance" defaultValue={editingTask?.importance ?? (taskFormType === 'exam' ? 'essential' : 'normal')}><option value="essential">Esencial</option><option value="important">Importante</option><option value="normal">Normal</option></select></label>
          <label>{taskFormType === 'exam' ? 'Minutos por sesión de estudio' : 'Tiempo estimado'}<select name="minutes" defaultValue={String(editingTask?.estimatedMinutes ?? 45)}><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">1 hora</option><option value="90">1,5 horas</option><option value="120">2 horas</option><option value="150">2,5 horas</option><option value="180">3 horas</option></select></label>
          <label>{taskFormType === 'exam' ? 'Fecha del examen' : 'Fecha de entrega'}<input name="dueDate" type="date" min={new Date().toISOString().slice(0, 10)} defaultValue={editingTask?.dueDate ?? newTaskDueDate} required={taskFormType === 'exam'} /></label>

          {taskFormType === 'exam' && !editingTask && (
            <p className="exam-hint">✨ ClassMate AI creará sesiones de estudio automáticamente repartidas entre hoy y la víspera del examen.</p>
          )}

          <button className="primary-button" type="submit">{taskFormType === 'exam' ? 'Planificar examen' : 'Guardar tarea'} <ArrowRight size={17} /></button>
        </form>
      </div>}

      {showPhoto && <div className="modal-backdrop" onClick={() => setShowPhoto(false)}>
        <PhotoView subjects={taskSubjects} onClose={() => setShowPhoto(false)} onCreateTasks={createTasksFromPhoto} />
      </div>}
    </div>
  )
}

export default App

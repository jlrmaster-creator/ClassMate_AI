import { useState } from 'react'
import { ArrowRight, Check, GraduationCap, MapPin, UserRound, Flame, BookOpen, TrendingUp } from 'lucide-react'
import type { UserProfile } from '../../types/userProfile'
import type { Task } from '../../types/task'
import { getRewardSummary } from '../../services/rewardService'
import { computeStudyStats } from '../../services/statsService'

interface ProfileViewProps {
  profile: UserProfile
  tasks: Task[]
  onSave: (profile: UserProfile) => void
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function ProfileView({ profile, tasks, onSave }: ProfileViewProps) {
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const rewards = getRewardSummary(tasks)
  const stats = computeStudyStats(tasks)
  // Access hidden _maxMinutes for bar widths
  const maxMinutes = (stats as ReturnType<typeof computeStudyStats> & { _maxMinutes: number })._maxMinutes || 1

  function updateField(field: keyof UserProfile, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(draft)
    setSaved(true)
  }

  return (
    <section className="profile-view">
      <div className="profile-heading">
        <div className="profile-avatar"><UserRound size={27} /></div>
        <div><p className="section-kicker">Tu espacio personal</p><h2>Tu perfil</h2><p className="muted-copy">Personaliza cómo te acompaña ClassMate.</p></div>
      </div>

      <form className="profile-form" onSubmit={submit}>
        <label><span>Nombre completo</span><input value={draft.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Ej. Alejandro López" autoComplete="name" /></label>
        <label><span>Nick o nombre corto</span><input value={draft.nick} onChange={(event) => updateField('nick', event.target.value)} placeholder="Ej. Alex" maxLength={30} /></label>
        <label><span><GraduationCap size={15} /> Curso</span><input value={draft.schoolYear} onChange={(event) => updateField('schoolYear', event.target.value)} placeholder="Ej. 3º ESO" /></label>
        <label><span><MapPin size={15} /> Colegio o instituto <small>opcional</small></span><input value={draft.school} onChange={(event) => updateField('school', event.target.value)} placeholder="Ej. IES Central" /></label>
        <button className="primary-button" type="submit">Guardar perfil <ArrowRight size={17} /></button>
        {saved && <p className="form-success" role="status"><Check size={15} /> Perfil guardado</p>}
      </form>

      {/* ── STATS ── */}
      <section className="stats-panel" aria-labelledby="stats-title">
        <div className="stats-heading">
          <div><p className="section-kicker">Tu progreso</p><h2 id="stats-title">Estadísticas</h2></div>
          <span className="stats-icon"><TrendingUp size={20} /></span>
        </div>

        {/* Quick numbers */}
        <div className="stats-grid">
          <div className="stat-card">
            <strong>{profile.totalPoints ?? 0}</strong>
            <span>Puntos totales</span>
          </div>
          <div className="stat-card">
            <strong>{stats.completedToday}</strong>
            <span>Tareas hoy</span>
          </div>
          <div className="stat-card">
            <strong>{stats.completedThisWeek}</strong>
            <span>Esta semana</span>
          </div>
          <div className="stat-card">
            <strong>{formatMinutes(stats.totalMinutesThisWeek)}</strong>
            <span>Estudiado (sem.)</span>
          </div>
        </div>

        {/* Streak: last 7 days */}
        <div className="streak-section">
          <div className="streak-header">
            <Flame size={16} className="streak-flame" />
            <span>Racha — últimos 7 días</span>
            {stats.currentStreakDays > 0 && (
              <strong className="streak-count">{stats.currentStreakDays} día{stats.currentStreakDays > 1 ? 's' : ''} seguido{stats.currentStreakDays > 1 ? 's' : ''} 🔥</strong>
            )}
          </div>
          <div className="streak-dots">
            {stats.streak.map((day) => (
              <div key={day.date} className={`streak-dot ${day.hasActivity ? 'active' : ''} ${day.isToday ? 'today' : ''}`}>
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hours by subject this week */}
        {stats.subjectStats.length > 0 && (
          <div className="subject-stats">
            <div className="subject-stats-header">
              <BookOpen size={15} />
              <span>Horas por asignatura esta semana</span>
            </div>
            <div className="subject-bars">
              {stats.subjectStats.map((s) => (
                <div key={s.subject} className="subject-bar-row">
                  <span className="subject-bar-name">{s.subject}</span>
                  <div className="subject-bar-track">
                    <div
                      className="subject-bar-fill"
                      style={{
                        width: `${Math.max(4, (s.minutesThisWeek / maxMinutes) * 100)}%`,
                        background: s.color,
                      }}
                    />
                  </div>
                  <span className="subject-bar-label">{formatMinutes(s.minutesThisWeek)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.subjectStats.length === 0 && (
          <p className="stats-empty">Completa tareas esta semana para ver tus estadísticas por asignatura.</p>
        )}
      </section>

      {/* Rewards */}
      <section className="rewards-panel" aria-labelledby="rewards-title">
        <div className="rewards-heading"><div><p className="section-kicker">Avanza a tu ritmo</p><h2 id="rewards-title">Tus recompensas</h2></div><span className="rewards-spark">✦</span></div>
        <p className="muted-copy">Cada tarea completada suma según el tiempo, la prioridad y el esfuerzo.</p>
        <div className="rewards-stats">
          <div><strong>{rewards.dailyPoints}</strong><span>Puntos de hoy</span></div>
          <div><strong>{rewards.weeklyPoints}</strong><span>Puntos esta semana</span></div>
        </div>
      </section>

      <p className="profile-credit">Created by: José López - Romero Moraleda</p>
    </section>
  )
}

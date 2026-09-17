import { useState } from 'react'
import { ArrowRight, Check, GraduationCap, MapPin, UserRound } from 'lucide-react'
import type { UserProfile } from '../../types/userProfile'
import type { Task } from '../../types/task'
import { getRewardSummary } from '../../services/rewardService'

interface ProfileViewProps {
  profile: UserProfile
  tasks: Task[]
  onSave: (profile: UserProfile) => void
}

export default function ProfileView({ profile, tasks, onSave }: ProfileViewProps) {
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const rewards = getRewardSummary(tasks)

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
      <section className="rewards-panel" aria-labelledby="rewards-title">
        <div className="rewards-heading"><div><p className="section-kicker">Avanza a tu ritmo</p><h2 id="rewards-title">Tus recompensas</h2></div><span className="rewards-spark">✦</span></div>
        <p className="muted-copy">Cada tarea completada suma según el tiempo, la prioridad y el esfuerzo.</p>
        <div className="rewards-stats"><div><strong>{rewards.dailyPoints}</strong><span>Puntos de hoy</span></div><div><strong>{rewards.weeklyPoints}</strong><span>Puntos esta semana</span></div></div>
      </section>
      <p className="profile-credit">Created by: José López - Romero Moraleda</p>
    </section>
  )
}

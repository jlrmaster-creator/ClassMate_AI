import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { ArrowRight, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { auth } from '../../firebase/config'
import { login, logout, register, resetPassword } from '../../services/authService'
import App from '../../App'

function getAuthMessage(code: string | undefined): string {
  if (code === 'auth/invalid-credential') return 'El correo o la contrasena no son correctos.'
  if (code === 'auth/email-already-in-use') return 'Ya existe una cuenta con este correo.'
  if (code === 'auth/weak-password') return 'La contrasena debe tener al menos 6 caracteres.'
  if (code === 'auth/invalid-email') return 'Introduce un correo valido.'
  return 'No hemos podido completar la operacion. Intentalo de nuevo.'
}

export default function AuthGate() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [registerMode, setRegisterMode] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser)
    setChecking(false)
  }), [])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')

    try {
      if (resetMode) {
        await resetPassword(email)
        setMessage('Te hemos enviado un enlace para recuperar tu contrasena.')
      } else if (registerMode) {
        await register(email, password)
      } else {
        await login(email, password)
      }
    } catch (authError) {
      setError(getAuthMessage((authError as { code?: string }).code))
    }
  }

  if (checking) return <div className="auth-loading"><Sparkles size={22} /> Preparando tu espacio...</div>
  if (user) return <App onLogout={logout} />

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-mark"><span className="brand-icon"><Sparkles size={17} /></span><span>ClassMate <strong>AI</strong></span></div>
        <div className="auth-intro"><span className="auth-symbol"><LockKeyhole size={23} /></span><p className="section-kicker">Tu espacio de estudio</p><h1>{resetMode ? 'Recupera tu acceso' : registerMode ? 'Empieza a organizarte' : 'Vuelve a lo importante'}</h1><p className="muted-copy">{resetMode ? 'Te enviaremos un enlace para crear una nueva contrasena.' : 'Tus tareas, proyectos y planes en un solo lugar.'}</p></div>
        <form className="auth-form" onSubmit={submit}>
          <label><span><Mail size={15} /> Correo electronico</span><input name="email" type="email" autoComplete="email" placeholder="tu@email.com" required /></label>
          {!resetMode && <label><span><LockKeyhole size={15} /> Contrasena</span><input name="password" type="password" autoComplete={registerMode ? 'new-password' : 'current-password'} placeholder="Minimo 6 caracteres" minLength={6} required /></label>}
          {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
          <button className="primary-button" type="submit">{resetMode ? 'Enviar enlace' : registerMode ? 'Crear cuenta' : 'Iniciar sesion'} <ArrowRight size={17} /></button>
        </form>
        <div className="auth-links">
          {!resetMode && !registerMode && <button onClick={() => setResetMode(true)}>He olvidado mi contrasena</button>}
          <button onClick={() => { setRegisterMode(!registerMode); setResetMode(false); setError(''); setMessage('') }}>{registerMode ? 'Ya tengo una cuenta' : 'Crear una cuenta nueva'}</button>
          {resetMode && <button onClick={() => { setResetMode(false); setError(''); setMessage('') }}>Volver a iniciar sesion</button>}
        </div>
      </section>
    </main>
  )
}

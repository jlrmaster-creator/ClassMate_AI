import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from '../firebase/config'

function requireAuth() {
  if (!auth) throw new Error('Firebase Auth is not configured')
  return auth
}

export function register(email: string, password: string) {
  return createUserWithEmailAndPassword(requireAuth(), email, password)
}

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(requireAuth(), email, password)
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(requireAuth(), email)
}

export function logout() {
  return signOut(requireAuth())
}

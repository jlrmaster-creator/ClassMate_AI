import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from '../firebase/config'

export function register(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email)
}

export function logout() {
  return signOut(auth)
}

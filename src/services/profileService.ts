import { doc, getDoc, increment, onSnapshot, serverTimestamp, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { UserProfile } from '../types/userProfile'

const emptyProfile: UserProfile = {
  name: '',
  nick: '',
  schoolYear: '',
  school: '',
  totalPoints: 0,
  avatar: '',
  badge: '',
  theme: '',
  ownedItems: [],
}

export function subscribeToProfile(userId: string, onProfile: (profile: UserProfile) => void): Unsubscribe | null {
  if (!db) return null
  return onSnapshot(doc(db, 'users', userId), (snapshot) => {
    if (snapshot.exists()) {
      onProfile({ ...emptyProfile, ...(snapshot.data() as Partial<UserProfile>) })
    } else {
      onProfile({ ...emptyProfile })
    }
  })
}

export async function updateCloudProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  if (!db) return
  await setDoc(doc(db, 'users', userId), profile, { merge: true })
}

/** Garantiza que el doc del perfil exista con los campos que exigen las reglas (id, createdAt, updatedAt).
 *  Sin esto, la primera escritura es un `create` que las reglas deniegan en silencio y totalPoints nunca persiste. */
export async function ensureCloudProfile(userId: string): Promise<void> {
  if (!db) return
  const userRef = doc(db, 'users', userId)
  const snapshot = await getDoc(userRef)
  if (!snapshot.exists()) {
    await setDoc(userRef, {
      id: userId,
      totalPoints: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
}

/** Suma puntos al perfil de forma ATOMICA (Firestore increment) para evitar lost-updates
 *  al completar varias tareas seguidas; la tienda siempre recibe el saldo actualizado vía onSnapshot.
 *  Usa `updateDoc` directo porque `increment()` es un FieldValue y las reglas exigen
 *  `updatedAt is timestamp` (que se escribe con serverTimestamp). */
export async function awardCloudPoints(userId: string, points: number): Promise<void> {
  if (!db || points <= 0) return
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, {
    totalPoints: increment(points),
    updatedAt: serverTimestamp(),
  })
}

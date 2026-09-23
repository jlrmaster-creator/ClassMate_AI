import { arrayUnion, doc, getDoc, increment, onSnapshot, serverTimestamp, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { UserProfile } from '../types/userProfile'
import type { StoreItem } from './storeService'

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
 *  Sin esto, la primera escritura es un `create` que las reglas deniegan en silencio y totalPoints nunca persiste.
 *  También REPARA docs legacy: si el doc ya existe pero le faltan esos campos (creados en versiones
 *  anteriores a estas reglas), lo recrea con los campos obligatorios para que los updates no se
 *  denieguen en silencio. */
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
    return
  }
  const data = snapshot.data() as Record<string, unknown>
  const needsRepair = data.id !== userId || !data.createdAt || !data.updatedAt
  if (needsRepair) {
    try {
      await updateDoc(userRef, {
        ...(data.id !== userId ? { id: userId } : {}),
        ...(!data.createdAt ? { createdAt: serverTimestamp() } : {}),
        ...(!data.updatedAt ? { updatedAt: serverTimestamp() } : {}),
      })
    } catch (error) {
      // Si la regla de update rechaza el doc legacy (createdAt no comparable), lo recreamos entero.
      console.warn('[profile] Reparando perfil legacy...', error)
      await setDoc(userRef, {
        ...data,
        id: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  }
}

/** Suma puntos al perfil de forma ATOMICA (Firestore increment) para evitar lost-updates
 *  al completar varias tareas seguidas; la tienda siempre recibe el saldo actualizado vía onSnapshot.
 *  Usa `updateDoc` directo porque `increment()` es un FieldValue y las reglas exigen
 *  `updatedAt is timestamp` (que se escribe con serverTimestamp).
 *  Si el doc del perfil aún no existe (carrera con ensureCloudProfile), lo crea en el momento
 *  y reintenta para que los puntos NUNCA se pierdan en silencio. */
export async function awardCloudPoints(userId: string, points: number): Promise<void> {
  if (!db || points === 0) return
  const userRef = doc(db, 'users', userId)
  try {
    await updateDoc(userRef, {
      totalPoints: increment(points),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('[profile] No se pudieron sumar los puntos, creando el perfil y reintentando:', error)
    await ensureCloudProfile(userId)
    await updateDoc(userRef, {
      totalPoints: increment(points),
      updatedAt: serverTimestamp(),
    })
  }
}

/** Compra ATOMICA en la nube: descuenta los puntos, registra el artículo como propio (arrayUnion,
 *  sin duplicados) y aplica el tema/avatar/insignia en un UNICO updateDoc.
 *  Antes la compra solo tocaba el estado local: al recargar o cambiar de sesión se perdía todo lo
 *  comprado y los puntos volvían al valor anterior a la compra. */
export async function purchaseCloudItem(userId: string, item: StoreItem): Promise<void> {
  if (!db) return
  const userRef = doc(db, 'users', userId)
  const patch: Record<string, unknown> = {
    totalPoints: increment(-item.price),
    ownedItems: arrayUnion(item.id),
    updatedAt: serverTimestamp(),
  }
  if (item.category === 'theme' && item.themeId) patch.theme = item.themeId
  if (item.category === 'avatar' && item.emoji) patch.avatar = item.emoji
  if (item.category === 'badge' && item.emoji) patch.badge = item.emoji
  try {
    await updateDoc(userRef, patch)
  } catch (error) {
    console.error('[profile] No se pudo registrar la compra, creando el perfil y reintentando:', error)
    await ensureCloudProfile(userId)
    await updateDoc(userRef, patch)
  }
}

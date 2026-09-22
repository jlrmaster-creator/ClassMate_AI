import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
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

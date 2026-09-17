import type { UserProfile } from '../types/userProfile'
import { readStorage, writeStorage } from './safeStorage'

const STORAGE_KEY = 'classmate-profile'

const emptyProfile: UserProfile = {
  name: '',
  nick: '',
  schoolYear: '',
  school: '',
}

export function getProfile(): UserProfile {
  return { ...emptyProfile, ...readStorage<Partial<UserProfile> | null>(STORAGE_KEY, null) }
}

export function saveProfile(profile: UserProfile): void {
  writeStorage(STORAGE_KEY, profile)
}

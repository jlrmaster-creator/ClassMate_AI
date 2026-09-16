import type { UserProfile } from '../types/userProfile'

const STORAGE_KEY = 'classmate-profile'

const emptyProfile: UserProfile = {
  name: '',
  nick: '',
  schoolYear: '',
  school: '',
}

export function getProfile(): UserProfile {
  const storedProfile = localStorage.getItem(STORAGE_KEY)
  return storedProfile ? { ...emptyProfile, ...JSON.parse(storedProfile) as Partial<UserProfile> } : emptyProfile
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

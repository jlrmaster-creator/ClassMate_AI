import type { UserProfile } from '../types/userProfile'

export type StoreCategory = 'theme' | 'avatar' | 'badge'

export interface StoreItem {
  id: string
  category: StoreCategory
  name: string
  emoji?: string    // vista previa para avatares e insignias
  themeId?: string  // para temas
  price: number
}

export const STORE_ITEMS: StoreItem[] = [
  // Temas de color
  { id: 'theme-esmeralda', category: 'theme', name: 'Esmeralda', themeId: 'esmeralda', price: 0 },
  { id: 'theme-marina', category: 'theme', name: 'Marina', themeId: 'marina', price: 120 },
  { id: 'theme-uva', category: 'theme', name: 'Uva', themeId: 'uva', price: 120 },
  { id: 'theme-fuego', category: 'theme', name: 'Fuego', themeId: 'fuego', price: 120 },
  { id: 'theme-rosa', category: 'theme', name: 'Rosa', themeId: 'rosa', price: 120 },

  // Avatares
  { id: 'avatar-fox', category: 'avatar', name: 'Zorro', emoji: '🦊', price: 60 },
  { id: 'avatar-panda', category: 'avatar', name: 'Panda', emoji: '🐼', price: 60 },
  { id: 'avatar-lion', category: 'avatar', name: 'León', emoji: '🦁', price: 60 },
  { id: 'avatar-frog', category: 'avatar', name: 'Rana', emoji: '🐸', price: 60 },
  { id: 'avatar-owl', category: 'avatar', name: 'Búho', emoji: '🦉', price: 60 },
  { id: 'avatar-octopus', category: 'avatar', name: 'Pulpo', emoji: '🐙', price: 60 },
  { id: 'avatar-unicorn', category: 'avatar', name: 'Unicornio', emoji: '🦄', price: 60 },
  { id: 'avatar-tiger', category: 'avatar', name: 'Tigre', emoji: '🐯', price: 60 },

  // Insignias (icono junto al nombre)
  { id: 'badge-rocket', category: 'badge', name: 'Cohete', emoji: '🚀', price: 40 },
  { id: 'badge-bolt', category: 'badge', name: 'Rayo', emoji: '⚡', price: 40 },
  { id: 'badge-star', category: 'badge', name: 'Estrella', emoji: '🌟', price: 40 },
  { id: 'badge-trophy', category: 'badge', name: 'Trofeo', emoji: '🏆', price: 40 },
  { id: 'badge-target', category: 'badge', name: 'Diana', emoji: '🎯', price: 40 },
  { id: 'badge-diamond', category: 'badge', name: 'Diamante', emoji: '💎', price: 40 },
  { id: 'badge-flame', category: 'badge', name: 'Llama', emoji: '🔥', price: 40 },
  { id: 'badge-headphones', category: 'badge', name: 'Audífonos', emoji: '🎧', price: 40 },
]

function defaultOwned(profile: UserProfile): string[] {
  return profile.ownedItems ?? (profile.theme ? [] : ['theme-esmeralda'])
}

export interface PurchaseResult {
  ok: boolean
  message?: string
  profile?: UserProfile
}

/**
 * Intenta comprar un artículo con los puntos del perfil.
 * Devuelve el perfil actualizado si la compra se realiza.
 */
export function buyItem(profile: UserProfile, item: StoreItem): PurchaseResult {
  const owned = defaultOwned(profile)

  if (owned.includes(item.id)) {
    return { ok: false, message: 'Ya tienes este artículo.' }
  }

  const points = profile.totalPoints ?? 0
  if (points < item.price) {
    return { ok: false, message: `Te faltan ${item.price - points} puntos.` }
  }

  const nextProfile: UserProfile = {
    ...profile,
    totalPoints: points - item.price,
    ownedItems: [...owned, item.id],
  }

  if (item.category === 'theme') nextProfile.theme = item.themeId
  if (item.category === 'avatar') nextProfile.avatar = item.emoji
  if (item.category === 'badge') nextProfile.badge = item.emoji

  return { ok: true, profile: nextProfile }
}

/** Devuelve `true` si el perfil ya posee el artículo (el tema por defecto se considera propio). */
export function ownsItem(profile: UserProfile, item: StoreItem): boolean {
  return defaultOwned(profile).includes(item.id)
}

/** Aplica un artículo ya poseído (cambia el tema, avatar o insignia activos) sin coste. */
export function useItem(profile: UserProfile, item: StoreItem): UserProfile {
  const nextProfile = { ...profile }
  if (item.category === 'theme') nextProfile.theme = item.themeId
  if (item.category === 'avatar') nextProfile.avatar = item.emoji
  if (item.category === 'badge') nextProfile.badge = item.emoji
  return nextProfile
}
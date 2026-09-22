export interface UserProfile {
  name: string
  nick: string
  schoolYear: string
  school: string
  totalPoints?: number
  avatar?: string   // emoji de avatar comprado
  badge?: string    // emoji de insignia junto al nombre
  theme?: string    // id del tema activo ('esmeralda' | 'marina' | ...)
  ownedItems?: string[] // ids de artículos comprados en la tienda
}
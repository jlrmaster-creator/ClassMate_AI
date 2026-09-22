export interface RoomMember {
  userId: string
  nick: string
  joinedAt: string
}

export interface StudyPresence {
  active: boolean
  subject: string
  since: string // ISO timestamp
}

export interface Room {
  id: string
  code: string   // 6-char uppercase code e.g. "ABC123"
  name: string
  createdBy: string
  createdAt: string
  members: RoomMember[]
}

export interface RoomMemberPresence extends RoomMember {
  presence: StudyPresence | null
}

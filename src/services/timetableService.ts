import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { TimetableSlot } from '../types/timetable'

function userTimetableCollection(userId: string) {
  if (!db) return null
  return collection(db, 'users', userId, 'timetable')
}

function slotFromDocument(id: string, data: Record<string, unknown>): TimetableSlot {
  return {
    id,
    dayOfWeek: Number(data.dayOfWeek ?? 0),
    startTime: String(data.startTime ?? '08:00'),
    endTime: String(data.endTime ?? '09:00'),
    subject: String(data.subject ?? ''),
    color: String(data.color ?? 'priority-medium'),
  }
}

export function subscribeToTimetable(userId: string, onTimetable: (slots: TimetableSlot[]) => void): Unsubscribe | null {
  const timetableCol = userTimetableCollection(userId)
  if (!timetableCol) return null
  return onSnapshot(timetableCol, (snapshot) => {
    onTimetable(snapshot.docs.map((item) => slotFromDocument(item.id, item.data() as Record<string, unknown>)))
  })
}

export async function createCloudTimetableSlot(userId: string, slot: TimetableSlot): Promise<string | null> {
  const timetableCol = userTimetableCollection(userId)
  if (!timetableCol) return null
  const { id, ...slotData } = slot
  const slotRef = await addDoc(timetableCol, {
    ...slotData,
    userId,
    createdAt: serverTimestamp(),
  })
  return slotRef.id
}

export async function updateCloudTimetableSlot(userId: string, slot: TimetableSlot): Promise<void> {
  if (!db) return
  const { id, ...slotData } = slot
  await setDoc(doc(db, 'users', userId, 'timetable', id), {
    ...slotData,
    userId,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function deleteCloudTimetableSlot(userId: string, slotId: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, 'users', userId, 'timetable', slotId))
}

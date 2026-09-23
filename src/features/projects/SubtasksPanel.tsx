import { useEffect, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import type { Subtask } from '../../types/subtask'
import { createSubtask, deleteSubtask, subscribeToSubtasks, updateSubtask } from '../../services/subtaskService'

interface SubtasksPanelProps {
  ownerId: string
  projectId: string
  userId: string
}

export default function SubtasksPanel({ ownerId, projectId, userId }: SubtasksPanelProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    if (!ownerId || !projectId) return
    const unsubscribe = subscribeToSubtasks(ownerId, projectId, setSubtasks)
    return () => unsubscribe?.()
  }, [ownerId, projectId])

  function addSubtask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    void createSubtask(ownerId, projectId, userId, { id: crypto.randomUUID(), title, done: false })
    setNewTitle('')
  }

  function toggleSubtask(subtask: Subtask) {
    void updateSubtask(ownerId, projectId, { ...subtask, done: !subtask.done })
  }

  function removeSubtask(subtask: Subtask) {
    void deleteSubtask(ownerId, projectId, subtask.id)
  }

  const doneCount = subtasks.filter((subtask) => subtask.done).length
  const progress = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0

  return (
    <div className="subtask-panel">
      <div className="subtask-head">
        <span className="subtask-count">
          {subtasks.length === 0 ? 'Desglosa el trabajo en pasos' : `${doneCount} de ${subtasks.length} pasos`}
        </span>
        {subtasks.length > 0 && (
          <span className="subtask-bar"><span style={{ width: `${progress}%` }} /></span>
        )}
      </div>

      {subtasks.length > 0 && (
        <ul className="subtask-list">
          {subtasks.map((subtask) => (
            <li className={`subtask-item ${subtask.done ? 'done' : ''}`} key={subtask.id}>
              <button className="subtask-check" onClick={() => toggleSubtask(subtask)} aria-label={subtask.done ? 'Reabrir paso' : 'Completar paso'}>
                {subtask.done && <Check size={13} />}
              </button>
              <span className="subtask-title" onClick={() => toggleSubtask(subtask)}>{subtask.title}</span>
              <button className="subtask-delete" onClick={() => removeSubtask(subtask)} aria-label={`Eliminar ${subtask.title}`}>
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="subtask-add" onSubmit={addSubtask}>
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Nuevo paso…"
          maxLength={120}
          aria-label="Título del nuevo paso"
        />
        <button className="add-task-button" type="submit" aria-label="Añadir paso"><Plus size={17} /></button>
      </form>
    </div>
  )
}
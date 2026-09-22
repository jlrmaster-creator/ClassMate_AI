export interface Project {
  id: string
  title: string
  description: string
  dueDate: string
  progress: number
  code: string          // código de 6 caracteres para compartir, p.ej. "ABC123"
  ownerId: string       // uid del propietario (dueño del documento)
  collaboratorIds: string[] // uids de los compañeros con acceso al proyecto
  createdAt: string
  updatedAt: string
}
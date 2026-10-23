export type Usuario = {
  id: string
  nombre: string
  correo: string
  zonaHoraria: string
  horaInicio: string
  horaFin: string
  iaActivada: boolean
}

export type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA'
export type EstadoTarea = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA'

export type Tarea = {
  id: string
  titulo: string
  descripcion: string | null
  fechaEntrega: string | null
  prioridad: Prioridad
  duracionEstimadaMin: number
  tiempoRealMin: number | null
  estado: EstadoTarea
  creadaEn: string
  actualizadaEn: string
}

// Datos que se envían al crear o editar una tarea
export type DatosTarea = {
  titulo: string
  descripcion: string | null
  fechaEntrega: string | null
  prioridad: Prioridad
  duracionEstimadaMin: number
  estado?: EstadoTarea
  tiempoRealMin?: number | null
}
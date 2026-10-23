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

export type TipoBloque = 'ESTUDIO' | 'TRABAJO' | 'ENFOQUE' | 'DESCANSO' | 'PERSONAL'

export type BloquePlantilla = {
  id: number
  tipo: TipoBloque
  titulo: string
  horaInicio: string
  duracionMin: number
  orden: number
}

export type Plantilla = {
  id: number
  clave: string
  nombre: string
  descripcion: string
  bloques: BloquePlantilla[]
}

// Lo que el día necesita saber de la tarea asignada a un bloque
export type TareaResumen = Pick<Tarea, 'id' | 'titulo' | 'prioridad' | 'estado' | 'duracionEstimadaMin'>

export type Bloque = {
  id: string
  tipo: TipoBloque
  titulo: string
  horaInicio: string
  horaFin: string
  tareaId: string | null
  tarea: TareaResumen | null
}

// Datos que se envían al agregar o editar un bloque
export type DatosBloque = Pick<Bloque, 'tipo' | 'titulo' | 'horaInicio' | 'horaFin' | 'tareaId'>

export type DiaPlanificado = {
  id: string
  fecha: string
  plantilla: { id: number; nombre: string } | null
  bloques: Bloque[]
}

// Forma común para dibujar bloques, vengan de una plantilla o de un día ya planificado
export type BloqueVista = Pick<Bloque, 'tipo' | 'titulo' | 'horaInicio' | 'horaFin'> & { tarea?: TareaResumen | null }
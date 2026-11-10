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


// Resultado del motor de reglas para "Por dónde empezar"
// vencida y no_alcanza → "Necesitan una decisión"; a_tiempo y ajustada → "Orden sugerido"
export type EstadoPrioridad = 'vencida' | 'no_alcanza' | 'ajustada' | 'a_tiempo' | 'sin_fecha'

export type ResultadoPrioridad = {
  tareaId: string
  orden: number | null // posición en el orden sugerido (solo para las tareas que caben)

  estado: EstadoPrioridad
  disponibleMin: number | null
  holguraMin: number | null
  razon: string
  tarea: Tarea
}

// Análisis de un día planificado (sobrecarga y sugerencia de distribución)
export type CargaDia = {
  capacidadMin: number
  necesitanMin: number
  excesoMin: number
  tareasUbicadas: number
  moverIds: string[]
  mensaje: string | null
  cubiertasIds: string[]
  nota: string | null
}

export type PropuestaBloque = {
  fecha: string // día del bloque (la sugerencia puede repartir en varios días)
  bloqueId: string
  bloque: { titulo: string; horaInicio: string; horaFin: string }
  tareaId: string
  tarea: { titulo: string; prioridad: Prioridad; duracionEstimadaMin: number }
  minutos: number
  razon: string
}


// Un bloque de otro día (desde hoy) que ya tiene asignada una tarea pendiente
export type PlanOtroDia = { tareaId: string; fecha: string; minutos: number }

export type AnalisisDia = { carga: CargaDia | null; propuesta: PropuestaBloque[]; avisos: string[]; otrosDias: PlanOtroDia[] }


// Reflexiona: diario
export type EntradaDiario = {
  id: string
  fecha: string // "2026-11-09"
  texto: string
  actualizadaEn: string
  etiquetas: string[]
}

export type ResumenDiaDiario = {
  plan: {
    nombre: string
    bloques: { titulo: string; horaInicio: string; horaFin: string; tarea: { titulo: string; completada: boolean } | null }[]
  } | null
  completadas: { id: string; titulo: string; duracionEstimadaMin: number; tiempoRealMin: number | null }[]
}

export type DiaDiario = { fecha: string; esFuturo: boolean; entrada: EntradaDiario | null; resumen: ResumenDiaDiario }

export type EtiquetaUso = { nombre: string; usos: number }


// IA: respuestas guardadas (reflexión de un día y resumen de la semana)
export type RespuestaIA<T> = {
  id: string
  estado: 'PENDIENTE' | 'ACEPTADA' | 'DESCARTADA' | 'EDITADA'
  creadaEn: string
  proveedor: 'gemini' | 'groq'
  respuesta: T
}

export type ReflexionIA = RespuestaIA<{ observacion: string; aprendizaje: string; sugerencias: string[] }> & { desactualizada: boolean }

export type EstadisticasSemana = {
  desde: string
  hasta: string
  diasPlanificados: number
  diasConEntrada: number
  tareasCompletadas: number
  conTiempoReal: number
  minutosEstimados: number
  minutosReales: number
  desviacionPct: number | null
  descripcionPrecision: string
  etiquetas: { nombre: string; veces: number }[]
}

export type SemanaIA = {
  estadisticas: EstadisticasSemana
  resumen: RespuestaIA<{ resumen: string; patrones: string[]; recomendaciones: string[] }> | null
}
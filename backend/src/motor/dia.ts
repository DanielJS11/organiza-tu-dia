// ─────────────────────────────────────────────────────────────
// Motor del día: sobrecarga y sugerencia de distribución
//
// Igual que planificador.ts, son funciones puras: reciben los bloques del día
// y las tareas, y devuelven un análisis. No tocan la base de datos.
// ─────────────────────────────────────────────────────────────

import { enZona, formatearMinutos, type Prioridad, type TareaMotor } from './planificador.js'

export type TipoBloque = 'ESTUDIO' | 'TRABAJO' | 'ENFOQUE' | 'DESCANSO' | 'PERSONAL'

export type BloqueDia = {
  id: string
  tipo: TipoBloque
  titulo: string
  horaInicio: string // "08:30"
  horaFin: string
  tareaId: string | null
}

// Bloques en los que se puede avanzar en tareas
export const TIPOS_DE_TRABAJO: TipoBloque[] = ['ESTUDIO', 'TRABAJO', 'ENFOQUE']

const VALOR_PRIORIDAD: Record<Prioridad, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 }

const aMinutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

const duracionBloque = (b: BloqueDia) => aMinutos(b.horaFin) - aMinutos(b.horaInicio)

// Minutos de un bloque que todavía no han pasado (si "desde" es la hora actual de hoy)
function minutosRestantes(b: BloqueDia, desdeMin: number) {
  return Math.max(0, aMinutos(b.horaFin) - Math.max(aMinutos(b.horaInicio), desdeMin))
}

// Instante (Date) que corresponde a una fecha y una hora en la zona del usuario
export function instanteEnZona(fecha: string, minutos: number, zonaHoraria: string) {
  const [a, m, d] = fecha.split('-').map(Number)
  const deseado = Date.UTC(a, m - 1, d, 0, minutos)
  let t = deseado
  // Dos ajustes bastan para encontrar la diferencia horaria de la zona
  for (let i = 0; i < 2; i++) {
    const visto = enZona(new Date(t), zonaHoraria)
    t -= Date.parse(`${visto.fecha}T00:00:00Z`) + visto.minutos * 60_000 - deseado
  }
  return new Date(t)
}

// "A" · "A" y "B" · "A, B y C"
function lista(titulos: string[]) {
  const q = titulos.map((t) => `"${t}"`)
  return q.length <= 1 ? q.join('') : `${q.slice(0, -1).join(', ')} y ${q.at(-1)}`
}

// ─── Tiempo planeado en otros días ─────────────────────────

// Un bloque de otro día (desde hoy) que ya tiene asignada una tarea pendiente
export type PlanOtroDia = { tareaId: string; fecha: string; minutos: number }

// Suma los minutos que cada tarea tiene planeados en la lista de bloques dada
export function minutosPorTarea(planes: PlanOtroDia[]) {
  const total = new Map<string, number>()
  for (const p of planes) total.set(p.tareaId, (total.get(p.tareaId) ?? 0) + p.minutos)
  return total
}

// ─── Sobrecarga del día (RF-12) ────────────────────────────

export type CargaDia = {
  capacidadMin: number // tiempo de bloques de trabajo (o con tarea asignada) que queda en el día
  necesitanMin: number // lo que les falta a las tareas ubicadas en el día, según su estimación
  excesoMin: number // cuánto se pasa (0 si cabe)
  tareasUbicadas: number
  moverIds: string[] // tareas que convendría mover para que el día sea realista
  mensaje: string | null
  cubiertasIds: string[] // tareas ubicadas aquí que ya tienen todo su tiempo en días anteriores
  nota: string | null
}

/*
  Compara lo que pediste hacer en el día con el tiempo que tienes para hacerlo.
  - Tiempo del día: bloques de estudio, trabajo y enfoque, más cualquier otro bloque al que le
    hayas asignado una tarea. Si el día es hoy, solo cuenta lo que no ha pasado.
  - Lo que se pide: a cada tarea pendiente ubicada en el día (una vez por tarea) se le cuenta su
    estimación MENOS lo que ya tiene planeado en otros días (desde hoy). Una tarea repartida en
    varios días solo pide aquí la parte que no está en los demás.
  - Si la tarea "puede esperar" (vence después de este día o no tiene fecha), lo que le falte se
    puede hacer otro día: aquí solo pide el tiempo de sus bloques. Ese faltante se avisa aparte
    (avisosSinTiempo), porque es un asunto de la semana, no de este día.
  - Si una tarea ya tiene todo su tiempo en días ANTERIORES a este, se avisa que su bloque quedó
    libre (el tiempo se reparte en orden de fechas: el día que sobra es el último).
  - Si no alcanza, sugiere qué mover: primero las de menor prioridad y, entre ellas,
    las que vencen más tarde (o no tienen fecha), hasta cubrir lo que sobra.
*/
export function analizarCargaDia(
  bloques: BloqueDia[],
  tareasPendientes: TareaMotor[],
  desdeMin = 0,
  planeadoAntesMin: Map<string, number> = new Map(), // minutos de cada tarea en días anteriores a este
  planeadoDespuesMin: Map<string, number> = new Map(), // minutos de cada tarea en días posteriores
  puedenEsperar: Set<string> = new Set(), // tareas que vencen después de este día o no tienen fecha
): CargaDia {
  const capacidadMin = bloques
    .filter((b) => TIPOS_DE_TRABAJO.includes(b.tipo) || b.tareaId)
    .reduce((total, b) => total + minutosRestantes(b, desdeMin), 0)

  const porId = new Map(tareasPendientes.map((t) => [t.id, t]))
  const ubicadas = [...new Set(bloques.map((b) => b.tareaId).filter((id): id is string => !!id))]
    .map((id) => porId.get(id))
    .filter((t): t is TareaMotor => !!t) // las completadas ya no piden tiempo

  // Minutos que cada tarea tiene en los bloques de este día
  const enEsteDia = minutosPorTarea(bloques.filter((b) => b.tareaId).map((b) => ({ tareaId: b.tareaId!, fecha: '', minutos: duracionBloque(b) })))
  const antes = (t: TareaMotor) => planeadoAntesMin.get(t.id) ?? 0
  const pide = (t: TareaMotor) => {
    const falta = Math.max(0, t.duracionEstimadaMin - antes(t) - (planeadoDespuesMin.get(t.id) ?? 0))
    return puedenEsperar.has(t.id) ? Math.min(falta, enEsteDia.get(t.id) ?? 0) : falta
  }
  const cubiertas = ubicadas.filter((t) => antes(t) >= t.duracionEstimadaMin)
  const nota =
    cubiertas.length === 0
      ? null
      : `${lista(cubiertas.map((t) => t.titulo))} ${cubiertas.length === 1 ? 'ya tiene' : 'ya tienen'} todo su tiempo estimado planeado en días anteriores: ${cubiertas.length === 1 ? 'el bloque que le diste aquí te queda libre' : 'los bloques que les diste aquí te quedan libres'} para otra cosa.`
  const base = { tareasUbicadas: ubicadas.length, cubiertasIds: cubiertas.map((t) => t.id), nota }

  const necesitanMin = ubicadas.reduce((total, t) => total + pide(t), 0)
  const excesoMin = Math.max(0, necesitanMin - capacidadMin)

  if (excesoMin === 0) {
    return { capacidadMin, necesitanMin, excesoMin, moverIds: [], mensaje: null, ...base }
  }

  const candidatas = ubicadas
    .filter((t) => pide(t) > 0)
    .sort(
      (a, b) =>
        VALOR_PRIORIDAD[b.prioridad] - VALOR_PRIORIDAD[a.prioridad] ||
        (b.fechaEntrega?.getTime() ?? Infinity) - (a.fechaEntrega?.getTime() ?? Infinity) ||
        pide(b) - pide(a) ||
        a.titulo.localeCompare(b.titulo),
    )
  const mover: TareaMotor[] = []
  let liberado = 0
  for (const t of candidatas) {
    if (liberado >= excesoMin) break
    mover.push(t)
    liberado += pide(t)
  }

  return {
    capacidadMin,
    necesitanMin,
    excesoMin,
    moverIds: mover.map((t) => t.id),
    mensaje: `Las tareas que ubicaste necesitan ${formatearMinutos(necesitanMin)} y tus bloques de trabajo suman ${formatearMinutos(capacidadMin)}: te pasas por ${formatearMinutos(excesoMin)}. Para que el día sea realista podrías mover ${lista(mover.map((t) => t.titulo))} a otro día. Si solo vas a avanzar una parte, puedes dejarlo así.`,
    ...base,
  }
}

// ─── Sugerir distribución (RF-14) ──────────────────────────

// faltabaMin: lo que a la tarea le faltaba por planear justo antes de este bloque
export type Asignacion = { bloqueId: string; tareaId: string; minutos: number; faltabaMin: number }

/*
  Propone qué tarea poner en cada bloque de trabajo libre del día.
  - "cola" son las tareas en el orden en que conviene hacerlas (lo calcula analizarPrioridades).
  - Cada bloque libre, en orden de hora, recibe la primera tarea de la cola que aún necesite
    tiempo y cuya entrega sea después de que empiece el bloque.
  - Al tiempo que pide cada tarea se le resta lo que ya tiene planeado ese día y en otros días
    (desde hoy). Una tarea que ya tiene todo su tiempo no se vuelve a proponer.
  - Un bloque no se parte: si a la tarea le falta menos de lo que dura el bloque, el sobrante
    queda como margen (y el usuario lo ve en la razón para acortar el bloque si quiere).
  - Nada se aplica solo: el usuario decide qué aceptar.
*/
export function proponerDistribucion(params: {
  fecha: string
  bloques: BloqueDia[]
  cola: TareaMotor[]
  zonaHoraria: string
  desdeMin?: number // si el día es hoy: la hora actual, para no proponer bloques que ya pasaron
  planeadoOtrosDiasMin?: Map<string, number> // minutos de cada tarea en otros días (desde hoy)
}): Asignacion[] {
  const { fecha, bloques, cola, zonaHoraria, desdeMin = 0, planeadoOtrosDiasMin = new Map() } = params

  // Lo que a cada tarea le falta por planear: su estimación menos lo que ya tiene en otros días y en este
  const falta = new Map(cola.map((t) => [t.id, t.duracionEstimadaMin - (planeadoOtrosDiasMin.get(t.id) ?? 0)]))
  for (const b of bloques) {
    if (b.tareaId && falta.has(b.tareaId)) {
      falta.set(b.tareaId, falta.get(b.tareaId)! - (aMinutos(b.horaFin) - aMinutos(b.horaInicio)))
    }
  }

  const libres = bloques
    .filter((b) => TIPOS_DE_TRABAJO.includes(b.tipo) && !b.tareaId && minutosRestantes(b, desdeMin) > 0)
    .sort((a, b) => aMinutos(a.horaInicio) - aMinutos(b.horaInicio))

  const asignaciones: Asignacion[] = []
  for (const b of libres) {
    const inicio = instanteEnZona(fecha, Math.max(aMinutos(b.horaInicio), desdeMin), zonaHoraria)
    const tarea = cola.find((t) => falta.get(t.id)! > 0 && (!t.fechaEntrega || t.fechaEntrega > inicio))
    if (!tarea) continue
    const minutos = minutosRestantes(b, desdeMin)
    asignaciones.push({ bloqueId: b.id, tareaId: tarea.id, minutos, faltabaMin: falta.get(tarea.id)! })
    falta.set(tarea.id, falta.get(tarea.id)! - minutos)
  }
  return asignaciones
}

// ─── Sugerir distribución en varios días ───────────────────

export type DiaConBloques = { fecha: string; bloques: BloqueDia[] }
export type AsignacionDia = Asignacion & { fecha: string }

// "2026-11-10" + 1 → "2026-11-11"
export function sumarDiasFecha(fecha: string, dias: number) {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/*
  Reparte las tareas en los bloques libres de TODOS los días planificados desde hoy.
  - Los días se recorren en orden de fecha y en cada uno se usa proponerDistribucion.
  - A cada tarea se le descuenta lo que ya tiene asignado en cualquier día y lo que se le
    va proponiendo en los días anteriores: nunca se pasa de su estimación ni se duplica.
  - Como la cola va en el orden de las entregas, lo que vence antes recibe primero los
    bloques; una tarea grande con entrega lejana no se come los días de las urgentes.
  - Devuelve también lo que a cada tarea le sigue faltando después de la propuesta.
*/
export function proponerVariosDias(params: {
  dias: DiaConBloques[]
  cola: TareaMotor[]
  zonaHoraria: string
  hoy: string
  ahoraMin: number // minuto actual de hoy, para no proponer bloques que ya pasaron
}): { asignaciones: AsignacionDia[]; faltaMin: Map<string, number> } {
  const { cola, zonaHoraria, hoy, ahoraMin } = params
  const dias = params.dias.filter((d) => d.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Lo que cada tarea ya tiene asignado en cada día
  const asignadoPorDia = new Map(
    dias.map((d) => [d.fecha, minutosPorTarea(d.bloques.filter((b) => b.tareaId).map((b) => ({ tareaId: b.tareaId!, fecha: d.fecha, minutos: duracionBloque(b) })))]),
  )
  const propuesto = new Map<string, number>()
  const asignaciones: AsignacionDia[] = []

  for (const dia of dias) {
    // Fuera de este día: lo asignado en los demás días + lo ya propuesto en días anteriores
    const otros = new Map(propuesto)
    for (const [fecha, porTarea] of asignadoPorDia) {
      if (fecha === dia.fecha) continue
      for (const [id, min] of porTarea) otros.set(id, (otros.get(id) ?? 0) + min)
    }
    const delDia = proponerDistribucion({
      fecha: dia.fecha,
      bloques: dia.bloques,
      cola,
      zonaHoraria,
      desdeMin: dia.fecha === hoy ? ahoraMin : 0,
      planeadoOtrosDiasMin: otros,
    })
    for (const a of delDia) {
      asignaciones.push({ ...a, fecha: dia.fecha })
      propuesto.set(a.tareaId, (propuesto.get(a.tareaId) ?? 0) + a.minutos)
    }
  }

  const faltaMin = new Map<string, number>()
  for (const t of cola) {
    let planeado = propuesto.get(t.id) ?? 0
    for (const porTarea of asignadoPorDia.values()) planeado += porTarea.get(t.id) ?? 0
    faltaMin.set(t.id, Math.max(0, t.duracionEstimadaMin - planeado))
  }
  return { asignaciones, faltaMin }
}

const formatoDia = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
// "2026-11-12" → "jueves 12 de noviembre"
export const nombreDia = (fecha: string) => formatoDia.format(new Date(`${fecha}T12:00:00Z`)).replace(',', '')

/*
  Avisos para las tareas con fecha que, aun con la propuesta, no tienen todo su tiempo
  planeado antes de la entrega:
  - Si antes de la entrega hay días sin plan, se nombran para que el usuario les aplique una
    plantilla (desde hoy si la jornada no ha terminado; si no, desde mañana).
  - Si todos esos días ya tienen plan, se dice que no quedan bloques libres y qué se puede hacer.
  Las tareas sin fecha no generan aviso: pueden esperar a que haya tiempo.
*/
export function avisosSinTiempo(params: {
  cola: TareaMotor[]
  faltaMin: Map<string, number>
  diasConPlan: Set<string>
  hoy: string
  ahoraMin: number
  jornada: { inicio: number; fin: number }
  zonaHoraria: string
}): string[] {
  const { cola, faltaMin, diasConPlan, hoy, ahoraMin, jornada, zonaHoraria } = params
  const avisos: string[] = []
  const primerDia = ahoraMin < jornada.fin ? hoy : sumarDiasFecha(hoy, 1)

  for (const t of cola) {
    const falta = faltaMin.get(t.id) ?? 0
    if (!t.fechaEntrega || falta <= 0) continue
    const entrega = enZona(t.fechaEntrega, zonaHoraria)

    const sinPlan: string[] = []
    for (let d = primerDia; d <= entrega.fecha; d = sumarDiasFecha(d, 1)) {
      const sirve = d < entrega.fecha || entrega.minutos > jornada.inicio // el día de la entrega solo sirve si vence después de empezar la jornada
      if (sirve && !diasConPlan.has(d)) sinPlan.push(d)
    }

    const inicio = `"${t.titulo}" aún necesita ${formatearMinutos(falta)} antes de su entrega`
    if (sinPlan.length > 0) {
      const nombres = sinPlan.slice(0, 3).map(nombreDia)
      const resto = sinPlan.length > 3 ? ` y ${sinPlan.length - 3} ${sinPlan.length - 3 === 1 ? 'día' : 'días'} más` : ''
      const textoDias = sinPlan.length > 3 || nombres.length === 1 ? nombres.join(', ') + resto : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
      avisos.push(
        `${inicio}. ${sinPlan.length === 1 ? 'Este día no tiene plan' : 'Estos días no tienen plan'}: ${textoDias}. Aplícales una plantilla y vuelve a pedir la sugerencia.`,
      )
    } else {
      avisos.push(`${inicio} y ya no quedan bloques de trabajo libres hasta esa fecha. Puedes agregar bloques, alargar los que tienes o cambiar la fecha.`)
    }
  }
  return avisos
}
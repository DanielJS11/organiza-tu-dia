// ─────────────────────────────────────────────────────────────
// Motor de planificación por reglas
//
// Funciones puras: no leen la base de datos ni el reloj por su cuenta.
// Todo lo que necesitan llega como parámetro, así se pueden probar con
// datos inventados y siempre dan el mismo resultado.
// ─────────────────────────────────────────────────────────────

export type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA'

export type TareaMotor = {
  id: string
  titulo: string
  prioridad: Prioridad
  fechaEntrega: Date | null
  duracionEstimadaMin: number
}

// Un tramo de tiempo dentro de un día, en minutos desde la medianoche (8:00 a. m. = 480)
export type Intervalo = { inicio: number; fin: number }

export type ContextoMotor = {
  ahora: Date
  zonaHoraria: string
  // Jornada del perfil (por defecto 8:00 a. m. – 10:00 p. m.)
  jornada: Intervalo
  // Minutos de trabajo que se asumen en un día sin plan
  capacidadPorDefectoMin: number
  // Días que tienen plan: fecha "2026-10-23" → tramos de sus bloques de estudio, trabajo o enfoque
  diasPlanificados: Map<string, Intervalo[]>
}

export type EstadoPrioridad = 'vencida' | 'en_riesgo' | 'ajustada' | 'a_tiempo' | 'sin_fecha'

export type ResultadoPrioridad = {
  tareaId: string
  orden: number
  estado: EstadoPrioridad
  disponibleMin: number | null // tiempo de trabajo disponible desde ahora hasta la entrega
  holguraMin: number | null // margen que queda contando las tareas que vencen antes
  razon: string
}

export const MINUTOS_DIA = 24 * 60
const MARGEN_AJUSTADO_MIN = 120 // con menos de 2 h de margen, la tarea se considera "ajustada"
const VALOR_PRIORIDAD: Record<Prioridad, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 }
const NOMBRE_PRIORIDAD: Record<Prioridad, string> = { ALTA: 'alta', MEDIA: 'media', BAJA: 'baja' }

// ─── Utilidades de tiempo ──────────────────────────────────

// Fecha y minuto del día de un instante, vistos en la zona horaria del usuario
export function enZona(instante: Date, zonaHoraria: string) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instante)
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)!.value
  return {
    fecha: `${valor('year')}-${valor('month')}-${valor('day')}`,
    minutos: Number(valor('hour')) * 60 + Number(valor('minute')),
  }
}

// "2026-10-23" + 1 → "2026-10-24"
export function siguienteFecha(fecha: string) {
  const d = new Date(`${fecha}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// Días entre dos fechas "AAAA-MM-DD" (0 si son la misma)
export function diasEntre(desde: string, hasta: string) {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000)
}

function solapamiento(a: Intervalo, b: Intervalo) {
  return Math.max(0, Math.min(a.fin, b.fin) - Math.max(a.inicio, b.inicio))
}

// 150 → "2 h 30 min"
export function formatearMinutos(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

// ─── Tiempo disponible ─────────────────────────────────────

// Minutos de trabajo de UN día dentro de una ventana de ese día
export function disponibleEnDia(fecha: string, ventana: Intervalo, ctx: ContextoMotor) {
  const bloques = ctx.diasPlanificados.get(fecha)
  if (bloques) {
    // Día con plan: cuentan sus bloques de estudio, trabajo y enfoque
    return bloques.reduce((total, b) => total + solapamiento(b, ventana), 0)
  }
  // Día sin plan: la capacidad por defecto, sin salirse de la jornada
  return Math.min(ctx.capacidadPorDefectoMin, solapamiento(ctx.jornada, ventana))
}

// Minutos de trabajo disponibles entre dos instantes (por ejemplo, desde ahora hasta una entrega)
export function disponibleEntre(desde: Date, hasta: Date, ctx: ContextoMotor) {
  if (hasta <= desde) return 0
  const inicio = enZona(desde, ctx.zonaHoraria)
  const fin = enZona(hasta, ctx.zonaHoraria)

  let total = 0
  let fecha = inicio.fecha
  for (let i = 0; i <= 366; i++) {
    const ventana = {
      inicio: fecha === inicio.fecha ? inicio.minutos : 0,
      fin: fecha === fin.fecha ? fin.minutos : MINUTOS_DIA,
    }
    total += disponibleEnDia(fecha, ventana, ctx)
    if (fecha === fin.fecha) break
    fecha = siguienteFecha(fecha)
  }
  return total
}

// ─── Por dónde empezar ─────────────────────────────────────

// "hoy", "mañana", "en 3 días"
function cuando(fechaEntrega: Date, ctx: ContextoMotor) {
  const dias = diasEntre(enZona(ctx.ahora, ctx.zonaHoraria).fecha, enZona(fechaEntrega, ctx.zonaHoraria).fecha)
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  return `en ${dias} días`
}

function fechaLegible(fecha: Date, zonaHoraria: string) {
  return new Intl.DateTimeFormat('es-CO', { timeZone: zonaHoraria, weekday: 'short', day: 'numeric', month: 'short' }).format(fecha)
}

// "Trabajo A" · "Trabajo A" y "Trabajo B" · "las 3 tareas anteriores"
function nombrar(titulos: string[]) {
  return titulos.length <= 2 ? titulos.map((t) => `"${t}"`).join(' y ') : `las ${titulos.length} tareas anteriores`
}

/*
  Propone un ORDEN para hacer las tareas pendientes y dice qué pasa si se sigue.

  1. Orden sugerido: primero lo que vence antes (regla "Earliest Deadline First"), medido en tiempo
     de trabajo: se ordena por el tiempo disponible desde ahora hasta cada entrega.
     Si dos tareas tienen el mismo tiempo disponible (vencen a la vez, o entre sus entregas no hay
     tiempo de trabajo), va primero la de mayor prioridad y, si empatan, la más corta.
     Con una sola persona trabajando, este es el orden que mejor cumple las entregas.
  2. Se recorre la lista en ese orden sumando el tiempo que piden las tareas.
     Para cada una: margen = tiempo disponible hasta su entrega − tiempo acumulado (ella y las anteriores).
     Lo que no alcanza a hacerse antes de una entrega NO se arrastra a las tareas siguientes: esa tarea
     queda en riesgo para que el usuario decida (mover la fecha, reducirla), y no castiga a las demás.
  3. Estado según el margen: en riesgo (negativo), margen corto (menos de 2 h) o a tiempo.
     Las vencidas van arriba y no consumen tiempo futuro. Las tareas sin fecha van al final, por prioridad.
*/
export function analizarPrioridades(tareas: TareaMotor[], ctx: ContextoMotor): ResultadoPrioridad[] {
  // Desempate: mayor prioridad, luego la más corta, luego la que vence antes y por último el título
  const porEntrega = (a: TareaMotor, b: TareaMotor) =>
    VALOR_PRIORIDAD[a.prioridad] - VALOR_PRIORIDAD[b.prioridad] ||
    a.duracionEstimadaMin - b.duracionEstimadaMin ||
    a.fechaEntrega!.getTime() - b.fechaEntrega!.getTime() ||
    a.titulo.localeCompare(b.titulo)

  // Una tarea vencida no compite por el tiempo futuro: primero el usuario decide qué hacer con ella
  const vencidas = tareas.filter((t) => t.fechaEntrega && t.fechaEntrega <= ctx.ahora).sort(porEntrega)
  const futuras = tareas
    .filter((t) => t.fechaEntrega && t.fechaEntrega > ctx.ahora)
    .map((t) => ({ t, disponible: disponibleEntre(ctx.ahora, t.fechaEntrega!, ctx) }))
    .sort((a, b) => a.disponible - b.disponible || porEntrega(a.t, b.t))
  const sinFecha = tareas
    .filter((t) => !t.fechaEntrega)
    .sort((a, b) => VALOR_PRIORIDAD[a.prioridad] - VALOR_PRIORIDAD[b.prioridad] || a.titulo.localeCompare(b.titulo))

  const resultados: Omit<ResultadoPrioridad, 'orden'>[] = []

  for (const t of vencidas) {
    resultados.push({
      tareaId: t.id,
      estado: 'vencida',
      disponibleMin: 0,
      holguraMin: -t.duracionEstimadaMin,
      razon: `Venció el ${fechaLegible(t.fechaEntrega!, ctx.zonaHoraria)}. Decide si aún la haces, le cambias la fecha o la eliminas.`,
    })
  }

  let acumuladoMin = 0
  const anteriores: string[] = []
  for (const { t, disponible } of futuras) {
    const entrega = t.fechaEntrega!
    acumuladoMin += t.duracionEstimadaMin
    const margen = disponible - acumuladoMin
    const vence = `Vence ${cuando(entrega, ctx)}`
    const necesita = formatearMinutos(t.duracionEstimadaMin)

    let estado: EstadoPrioridad
    let razon: string
    if (disponible < t.duracionEstimadaMin) {
      estado = 'en_riesgo'
      razon = `No alcanza aunque le dediques todo tu tiempo: ${vence.toLowerCase()}, necesita ${necesita} y solo tienes ${formatearMinutos(disponible)} disponibles antes de la entrega.`
    } else if (margen < 0) {
      estado = 'en_riesgo'
      razon = `${vence} y necesita ${necesita}, pero antes vas a hacer ${nombrar(anteriores)}: te faltarían ${formatearMinutos(-margen)}. Puedes mover alguna fecha o dejar para después lo menos importante.`
    } else if (margen < MARGEN_AJUSTADO_MIN) {
      estado = 'ajustada'
      const queda = margen === 0 ? 'cabe justo, sin tiempo de sobra' : `te queda un margen corto: ${formatearMinutos(margen)}`
      razon = anteriores.length
        ? `${vence} y necesita ${necesita}. Después de ${nombrar(anteriores)} ${queda}.`
        : `${vence} y necesita ${necesita}. ${queda[0].toUpperCase()}${queda.slice(1)}.`
    } else {
      estado = 'a_tiempo'
      razon = anteriores.length
        ? `${vence} y necesita ${necesita}; después de ${nombrar(anteriores)} aún te sobran ${formatearMinutos(margen)}.`
        : `${vence} y necesita ${necesita}; tienes ${formatearMinutos(disponible)} disponibles hasta entonces.`
    }

    resultados.push({ tareaId: t.id, estado, disponibleMin: disponible, holguraMin: margen, razon })
    anteriores.push(t.titulo)
    // Si esta tarea no cabía, solo se cuenta el tiempo que había hasta su entrega
    acumuladoMin = Math.min(acumuladoMin, disponible)
  }

  for (const t of sinFecha) {
    resultados.push({
      tareaId: t.id,
      estado: 'sin_fecha',
      disponibleMin: null,
      holguraMin: null,
      razon: `Sin fecha de entrega · prioridad ${NOMBRE_PRIORIDAD[t.prioridad]}. Puedes hacerla cuando te quede tiempo libre.`,
    })
  }

  return resultados.map((r, i) => ({ ...r, orden: i + 1 }))
}
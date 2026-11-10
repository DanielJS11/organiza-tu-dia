// ─────────────────────────────────────────────────────────────
// Motor de planificación por reglas
//
// Funciones puras: no leen la base de datos ni el reloj por su cuenta.
// Todo lo que necesitan llega como parámetro, así se pueden probar con
// datos inventados y siempre dan el mismo resultado.
//
// Modelo en tres reglas:
//   1. Tiempo disponible realista: en días con plan cuentan los bloques de trabajo;
//      en días sin plan, la capacidad diaria se reparte a lo largo de la jornada.
//   2. Si no alcanza para todo, se protege lo más importante: sale la tarea de menor
//      prioridad (y, si empatan, la más larga). Variante con prioridades del algoritmo
//      de Moore-Hodgson, que deja a tiempo el mayor número posible de entregas.
//   3. Orden sugerido = orden de las entregas ("Earliest Deadline First"): si todo lo
//      que queda en la lista cabe, siguiéndola en ese orden se cumplen todas las entregas.
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

// vencida y no_alcanza → "Necesitan una decisión"; a_tiempo y ajustada → "Orden sugerido"
export type EstadoPrioridad = 'vencida' | 'no_alcanza' | 'ajustada' | 'a_tiempo' | 'sin_fecha'

export type ResultadoPrioridad = {
  tareaId: string
  orden: number | null // posición en el orden sugerido (solo para las tareas que caben)
  estado: EstadoPrioridad
  disponibleMin: number | null // tiempo de trabajo disponible desde ahora hasta la entrega
  holguraMin: number | null // margen que queda siguiendo el orden sugerido
  razon: string
}

export const MINUTOS_DIA = 24 * 60
const MARGEN_MINIMO_MIN = 60 // con menos de 1 h de margen la tarea queda "ajustada"…
const MARGEN_RELATIVO = 0.25 // …o con menos del 25 % de lo que dura (solemos subestimar cuánto tardamos)
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

// 150 → "2 h 30 min" (redondea al minuto)
export function formatearMinutos(minutos: number) {
  const total = Math.round(minutos)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

// ─── Regla 1: tiempo disponible realista ───────────────────

// Minutos de trabajo de UN día dentro de una ventana de ese día
export function disponibleEnDia(fecha: string, ventana: Intervalo, ctx: ContextoMotor) {
  const bloques = ctx.diasPlanificados.get(fecha)
  if (bloques) {
    // Día con plan: cuentan sus bloques de estudio, trabajo y enfoque
    return bloques.reduce((total, b) => total + solapamiento(b, ventana), 0)
  }
  // Día sin plan: la capacidad diaria se reparte de forma pareja a lo largo de la jornada.
  // Ejemplo: 4 h en una jornada de 8 a. m. a 10 p. m. → unos 17 min de trabajo por cada hora de reloj.
  const largoJornada = ctx.jornada.fin - ctx.jornada.inicio
  if (largoJornada <= 0) return 0
  return (ctx.capacidadPorDefectoMin * solapamiento(ctx.jornada, ventana)) / largoJornada
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

// ─── Textos ────────────────────────────────────────────────

// "hoy", "mañana", "en 3 días"
export function cuando(fechaEntrega: Date, ctx: ContextoMotor) {
  const dias = diasEntre(enZona(ctx.ahora, ctx.zonaHoraria).fecha, enZona(fechaEntrega, ctx.zonaHoraria).fecha)
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  return `en ${dias} días`
}

// "hasta tu entrega de hoy", "hasta mañana", "en los próximos 3 días"
function hastaCuando(fechaEntrega: Date, ctx: ContextoMotor) {
  const c = cuando(fechaEntrega, ctx)
  if (c === 'hoy') return 'hasta la entrega de hoy'
  if (c === 'mañana') return 'hasta mañana'
  return `en los próximos ${c.replace('en ', '')}`
}

function fechaLegible(fecha: Date, zonaHoraria: string) {
  return new Intl.DateTimeFormat('es-CO', { timeZone: zonaHoraria, weekday: 'short', day: 'numeric', month: 'short' }).format(fecha)
}

// "A" · "A" y "B" · "otras 3 tareas"
function nombrar(titulos: string[]) {
  return titulos.length <= 2 ? titulos.map((t) => `"${t}"`).join(' y ') : `otras ${titulos.length} tareas`
}

// ─── Por dónde empezar ─────────────────────────────────────

type Candidata = TareaMotor & { fechaEntrega: Date; disponible: number }

// Orden de las entregas; si vencen al mismo tiempo: mayor prioridad, luego la más corta
function porEntrega(a: TareaMotor, b: TareaMotor) {
  return (
    a.fechaEntrega!.getTime() - b.fechaEntrega!.getTime() ||
    VALOR_PRIORIDAD[a.prioridad] - VALOR_PRIORIDAD[b.prioridad] ||
    a.duracionEstimadaMin - b.duracionEstimadaMin ||
    a.titulo.localeCompare(b.titulo)
  )
}

// La que sale cuando no alcanza el tiempo: la de menor prioridad; si empatan, la más larga
function menosProtegida(a: TareaMotor, b: TareaMotor) {
  return (
    VALOR_PRIORIDAD[b.prioridad] - VALOR_PRIORIDAD[a.prioridad] ||
    b.duracionEstimadaMin - a.duracionEstimadaMin ||
    b.fechaEntrega!.getTime() - a.fechaEntrega!.getTime() ||
    a.titulo.localeCompare(b.titulo)
  )
}

export function analizarPrioridades(tareas: TareaMotor[], ctx: ContextoMotor): ResultadoPrioridad[] {
  const vencidas = tareas.filter((t) => t.fechaEntrega && t.fechaEntrega <= ctx.ahora).sort(porEntrega)
  const sinFecha = tareas
    .filter((t) => !t.fechaEntrega)
    .sort((a, b) => VALOR_PRIORIDAD[a.prioridad] - VALOR_PRIORIDAD[b.prioridad] || a.titulo.localeCompare(b.titulo))
  const futuras: Candidata[] = tareas
    .filter((t) => t.fechaEntrega && t.fechaEntrega > ctx.ahora)
    .map((t) => ({ ...t, fechaEntrega: t.fechaEntrega!, disponible: disponibleEntre(ctx.ahora, t.fechaEntrega!, ctx) }))
    .sort(porEntrega)

  const decisiones: (Omit<ResultadoPrioridad, 'orden'> & { entrega: number })[] = []

  // Las tareas que no caben ni dedicándoles todo el tiempo se apartan primero,
  // para que no le quiten espacio a las que sí pueden cumplirse
  const posibles: Candidata[] = []
  for (const t of futuras) {
    if (t.duracionEstimadaMin > t.disponible) {
      decisiones.push({
        tareaId: t.id,
        entrega: t.fechaEntrega.getTime(),
        estado: 'no_alcanza',
        disponibleMin: Math.round(t.disponible),
        holguraMin: Math.round(t.disponible - t.duracionEstimadaMin),
        razon: `Aunque le dediques todo tu tiempo no alcanza: vence ${cuando(t.fechaEntrega, ctx)}, necesita ${formatearMinutos(t.duracionEstimadaMin)} y hasta su entrega solo tienes ${formatearMinutos(t.disponible)} de trabajo. Puedes mover la fecha o reducir lo que harás.`,
      })
    } else {
      posibles.push(t)
    }
  }

  // Regla 2: se recorren en orden de entrega; si se pasan del tiempo disponible, sale la menos protegida
  const caben: Candidata[] = []
  let totalMin = 0
  for (const t of posibles) {
    caben.push(t)
    totalMin += t.duracionEstimadaMin
    while (totalMin > t.disponible) {
      const sale = [...caben].sort(menosProtegida)[0]
      const otras = caben.filter((o) => o !== sale).map((o) => o.titulo)
      const motivo = caben.every((o) => o === sale || VALOR_PRIORIDAD[o.prioridad] < VALOR_PRIORIDAD[sale.prioridad])
        ? 'es la de menor prioridad'
        : 'es la más larga entre las de su misma prioridad'
      decisiones.push({
        tareaId: sale.id,
        entrega: sale.fechaEntrega.getTime(),
        estado: 'no_alcanza',
        disponibleMin: Math.round(sale.disponible),
        holguraMin: null,
        razon: `No alcanza junto con ${nombrar(otras)}: ${hastaCuando(t.fechaEntrega, ctx)} tienes ${formatearMinutos(t.disponible)} de trabajo y entre todas piden ${formatearMinutos(totalMin)}. Se deja por fuera porque ${motivo}. Puedes mover su fecha o reducirla.`,
      })
      caben.splice(caben.indexOf(sale), 1)
      totalMin -= sale.duracionEstimadaMin
    }
  }

  // Regla 3: orden sugerido = orden de las entregas, con el margen que queda al seguirlo
  const sugeridas: Omit<ResultadoPrioridad, 'orden'>[] = []
  let acumuladoMin = 0
  const anteriores: string[] = []
  for (const t of caben) {
    acumuladoMin += t.duracionEstimadaMin
    const margen = t.disponible - acumuladoMin
    const vence = `Vence ${cuando(t.fechaEntrega, ctx)} y necesita ${formatearMinutos(t.duracionEstimadaMin)}`
    const ajustada = margen < Math.max(MARGEN_MINIMO_MIN, MARGEN_RELATIVO * t.duracionEstimadaMin)

    let razon: string
    if (!ajustada) {
      razon = anteriores.length
        ? `${vence}; después de ${nombrar(anteriores)} aún te sobran ${formatearMinutos(margen)}.`
        : `${vence}; tienes ${formatearMinutos(t.disponible)} de trabajo hasta entonces.`
    } else {
      const queda = Math.round(margen) === 0 ? 'cabe justo, sin tiempo de sobra' : `te queda un margen corto: ${formatearMinutos(margen)}`
      razon = anteriores.length
        ? `${vence}. Después de ${nombrar(anteriores)} ${queda}.`
        : `${vence}. ${queda[0].toUpperCase()}${queda.slice(1)}.`
    }

    sugeridas.push({
      tareaId: t.id,
      estado: ajustada ? 'ajustada' : 'a_tiempo',
      disponibleMin: Math.round(t.disponible),
      holguraMin: Math.round(margen),
      razon,
    })
    anteriores.push(t.titulo)
  }

  const resultadoVencidas: Omit<ResultadoPrioridad, 'orden'>[] = vencidas.map((t) => ({
    tareaId: t.id,
    estado: 'vencida',
    disponibleMin: 0,
    holguraMin: null,
    razon: `Venció el ${fechaLegible(t.fechaEntrega!, ctx.zonaHoraria)}. Decide si aún la haces, le cambias la fecha o la eliminas.`,
  }))

  const resultadoSinFecha: Omit<ResultadoPrioridad, 'orden'>[] = sinFecha.map((t) => ({
    tareaId: t.id,
    estado: 'sin_fecha',
    disponibleMin: null,
    holguraMin: null,
    razon: `Sin fecha de entrega · prioridad ${NOMBRE_PRIORIDAD[t.prioridad]}. Puedes hacerla cuando te quede tiempo libre.`,
  }))

  const resultadoDecisiones = decisiones.sort((a, b) => a.entrega - b.entrega).map(({ entrega: _e, ...r }) => r)

  return [
    ...resultadoVencidas.map((r) => ({ ...r, orden: null })),
    ...resultadoDecisiones.map((r) => ({ ...r, orden: null })),
    ...sugeridas.map((r, i) => ({ ...r, orden: i + 1 })),
    ...resultadoSinFecha.map((r) => ({ ...r, orden: null })),
  ]
}
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requiereSesion } from '../middleware/autenticacion.js'
import { analizarPrioridades, cuando, enZona, formatearMinutos, type ContextoMotor, type Intervalo } from '../motor/planificador.js'
import { analizarCargaDia, avisosSinTiempo, minutosPorTarea, proponerVariosDias, TIPOS_DE_TRABAJO, type PlanOtroDia } from '../motor/dia.js'
import { aFechaBD, aHora, aMinutos, hoyEnZona } from '../utilidades/tiempo.js'
import { devolverDia, validarFecha } from './dias.js'

const router = Router()
router.use(requiereSesion)

// Minutos de trabajo que se asumen en un día que no tiene plan
export const CAPACIDAD_POR_DEFECTO_MIN = 4 * 60

// Reúne lo que el motor necesita saber del usuario: su jornada y sus días planificados desde hoy
async function crearContexto(usuarioId: string): Promise<ContextoMotor> {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } })
  const dias = await prisma.diaPlanificado.findMany({
    where: { usuarioId, fecha: { gte: aFechaBD(hoyEnZona(usuario.zonaHoraria)) } },
    include: { bloques: { where: { tipo: { in: TIPOS_DE_TRABAJO } } } },
  })

  const diasPlanificados = new Map<string, Intervalo[]>()
  for (const dia of dias) {
    const fecha = dia.fecha.toISOString().slice(0, 10)
    diasPlanificados.set(
      fecha,
      dia.bloques.map((b) => ({ inicio: aMinutos(b.horaInicio), fin: aMinutos(b.horaFin) })),
    )
  }

  return {
    ahora: new Date(),
    zonaHoraria: usuario.zonaHoraria,
    jornada: { inicio: aMinutos(usuario.horaInicio), fin: aMinutos(usuario.horaFin) },
    capacidadPorDefectoMin: CAPACIDAD_POR_DEFECTO_MIN,
    diasPlanificados,
  }
}

const tareasPendientes = (usuarioId: string) =>
  prisma.tarea.findMany({ where: { usuarioId, estado: { not: 'COMPLETADA' } } })

// Bloques de OTROS días (desde hoy) que ya tienen asignada una tarea pendiente
async function planeadoEnOtrosDias(usuarioId: string, fecha: string, hoy: string, idsPendientes: Set<string>): Promise<PlanOtroDia[]> {
  const bloques = await prisma.bloque.findMany({
    where: { tareaId: { not: null }, dia: { usuarioId, fecha: { gte: aFechaBD(hoy), not: aFechaBD(fecha) } } },
    include: { dia: { select: { fecha: true } } },
  })
  return bloques
    .filter((b) => idsPendientes.has(b.tareaId!))
    .map((b) => ({
      tareaId: b.tareaId!,
      fecha: b.dia.fecha.toISOString().slice(0, 10),
      minutos: aMinutos(b.horaFin) - aMinutos(b.horaInicio),
    }))
}

// Por dónde empezar: tareas pendientes ordenadas, cada una con la razón de su lugar
router.get('/prioridades', async (req, res) => {
  const ctx = await crearContexto(req.usuarioId!)
  const tareas = await tareasPendientes(req.usuarioId!)

  const resultados = analizarPrioridades(tareas, ctx)
  const porId = new Map(tareas.map((t) => [t.id, t]))

  res.json({
    capacidadPorDefectoMin: CAPACIDAD_POR_DEFECTO_MIN,
    jornada: { inicio: aHora(ctx.jornada.inicio), fin: aHora(ctx.jornada.fin) },
    resultados: resultados.map((r) => ({ ...r, tarea: porId.get(r.tareaId) })),
  })
})

// ─── Análisis de un día: sobrecarga y sugerencia de distribución ───

router.get('/dia/:fecha', validarFecha, async (req, res) => {
  const fecha = String(req.params.fecha)
  const ctx = await crearContexto(req.usuarioId!)
  const dia = await prisma.diaPlanificado.findUnique({
    where: { usuarioId_fecha: { usuarioId: req.usuarioId!, fecha: aFechaBD(fecha) } },
    include: { bloques: true },
  })
  if (!dia) return res.json({ carga: null, propuesta: [], avisos: [], otrosDias: [] })

  // Si el día es hoy, solo cuenta lo que no ha pasado; un día pasado ya no tiene tiempo
  const ahora = enZona(ctx.ahora, ctx.zonaHoraria)
  const desdeMin = fecha === ahora.fecha ? ahora.minutos : fecha < ahora.fecha ? 24 * 60 : 0

  const tareas = await tareasPendientes(req.usuarioId!)
  const porId = new Map(tareas.map((t) => [t.id, t]))

  // Lo que cada tarea ya tiene planeado en otros días (desde hoy): el día solo carga con la parte
  // de cada tarea que no está en los demás días
  const otrosDias = await planeadoEnOtrosDias(req.usuarioId!, fecha, ahora.fecha, new Set(porId.keys()))
  const planeadoAntes = minutosPorTarea(otrosDias.filter((p) => p.fecha < fecha))
  const planeadoDespues = minutosPorTarea(otrosDias.filter((p) => p.fecha > fecha))
  // Las que vencen después de este día (o no tienen fecha) pueden terminarse otro día
  const puedenEsperar = new Set(
    tareas.filter((t) => !t.fechaEntrega || enZona(t.fechaEntrega, ctx.zonaHoraria).fecha > fecha).map((t) => t.id),
  )
  const carga = analizarCargaDia(dia.bloques, tareas, desdeMin, planeadoAntes, planeadoDespues, puedenEsperar)

  // La cola para llenar bloques: primero el orden sugerido, luego las que no alcanzan
  // (aún se puede avanzar en ellas) y al final las que no tienen fecha. Las vencidas no entran.
  const resultados = analizarPrioridades(tareas, ctx)
  const enCola = [
    ...resultados.filter((r) => r.orden !== null),
    ...resultados.filter((r) => r.estado === 'no_alcanza'),
    ...resultados.filter((r) => r.estado === 'sin_fecha'),
  ]
  const cola = enCola.map((r) => porId.get(r.tareaId)!)

  // La sugerencia reparte las tareas en todos los días planificados desde hoy, no solo en este
  const diasDesdeHoy = await prisma.diaPlanificado.findMany({
    where: { usuarioId: req.usuarioId!, fecha: { gte: aFechaBD(ahora.fecha) } },
    include: { bloques: true },
  })
  const dias = diasDesdeHoy.map((d) => ({ fecha: d.fecha.toISOString().slice(0, 10), bloques: d.bloques }))
  const { asignaciones, faltaMin } = proponerVariosDias({ dias, cola, zonaHoraria: ctx.zonaHoraria, hoy: ahora.fecha, ahoraMin: ahora.minutos })
  const avisos = avisosSinTiempo({
    cola,
    faltaMin,
    diasConPlan: new Set(dias.map((d) => d.fecha)),
    hoy: ahora.fecha,
    ahoraMin: ahora.minutos,
    jornada: ctx.jornada,
    zonaHoraria: ctx.zonaHoraria,
  })

  const bloquesPorId = new Map(diasDesdeHoy.flatMap((d) => d.bloques).map((b) => [b.id, b]))
  const resultadoPorId = new Map(resultados.map((r) => [r.tareaId, r]))
  const propuesta = asignaciones.map((a) => {
    const tarea = porId.get(a.tareaId)!
    const bloque = bloquesPorId.get(a.bloqueId)!
    const r = resultadoPorId.get(a.tareaId)!
    // Si a la tarea le falta menos de lo que dura el bloque, se dice para que el usuario pueda acortarlo
    const sobra =
      a.faltabaMin < a.minutos
        ? ` · Le falta ${formatearMinutos(a.faltabaMin)} y el bloque dura ${formatearMinutos(a.minutos)}: el resto te queda libre`
        : ''
    const razon =
      (r.orden !== null
        ? `N.º ${r.orden} en tu orden sugerido · vence ${cuando(tarea.fechaEntrega!, ctx)}`
        : r.estado === 'no_alcanza'
          ? 'No alcanza a terminarse antes de su entrega, pero aquí puedes avanzar en ella'
          : 'Sin fecha de entrega: aprovecha este tiempo libre') + sobra
    return {
      fecha: a.fecha,
      bloqueId: a.bloqueId,
      bloque: { titulo: bloque.titulo, horaInicio: bloque.horaInicio, horaFin: bloque.horaFin },
      tareaId: a.tareaId,
      tarea: { titulo: tarea.titulo, prioridad: tarea.prioridad, duracionEstimadaMin: tarea.duracionEstimadaMin },
      minutos: a.minutos,
      razon,
    }
  })

  // Para el formulario de bloque: en qué otros días ya está planeada cada tarea
  res.json({ carga, propuesta, avisos, otrosDias })
})

const esquemaAplicar = z.object({
  asignaciones: z.array(z.object({ bloqueId: z.string(), tareaId: z.string() })).min(1, 'Elige al menos una sugerencia'),
  propuestas: z.number().int().min(1),
})

// Aplica las sugerencias que el usuario aceptó (pueden ser de varios días) y registra la decisión.
// Responde con el día que el usuario está viendo, ya actualizado.
router.post('/dia/:fecha/aplicar', validarFecha, async (req, res) => {
  const resultado = esquemaAplicar.safeParse(req.body)
  if (!resultado.success) return res.status(400).json({ error: resultado.error.issues[0].message })
  const { asignaciones, propuestas } = resultado.data
  const fecha = String(req.params.fecha)
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: req.usuarioId! } })
  const hoy = hoyEnZona(usuario.zonaHoraria)

  const bloques = await prisma.bloque.findMany({
    where: { id: { in: asignaciones.map((a) => a.bloqueId) }, dia: { usuarioId: req.usuarioId! } },
    include: { dia: { select: { fecha: true } } },
  })
  const bloquesPorId = new Map(bloques.map((b) => [b.id, b]))
  const tareas = await tareasPendientes(req.usuarioId!)
  const idsTareas = new Set(tareas.map((t) => t.id))
  for (const a of asignaciones) {
    const bloque = bloquesPorId.get(a.bloqueId)
    if (!bloque) return res.status(404).json({ error: 'Bloque no encontrado' })
    if (bloque.dia.fecha.toISOString().slice(0, 10) < hoy) return res.status(400).json({ error: 'No puedes modificar un día que ya pasó' })
    if (bloque.tareaId) return res.status(409).json({ error: `El bloque "${bloque.titulo}" ya tiene una tarea` })
    if (!idsTareas.has(a.tareaId)) return res.status(404).json({ error: 'Tarea no encontrada o ya completada' })
  }

  const estado = asignaciones.length === propuestas ? 'ACEPTADA' : 'EDITADA'
  await prisma.$transaction([
    ...asignaciones.map((a) => prisma.bloque.update({ where: { id: a.bloqueId }, data: { tareaId: a.tareaId } })),
    prisma.sugerencia.create({
      data: {
        usuarioId: req.usuarioId!,
        fecha: aFechaBD(fecha),
        estado,
        contenido: JSON.stringify({ propuestas, aplicadas: asignaciones.length, asignaciones }),
      },
    }),
  ])

  const dia = await prisma.diaPlanificado.findUnique({ where: { usuarioId_fecha: { usuarioId: req.usuarioId!, fecha: aFechaBD(fecha) } } })
  res.json(dia ? await devolverDia(dia.id) : null)
})

// Registra que el usuario descartó la sugerencia (sirve para medir si las sugerencias son útiles)
router.post('/dia/:fecha/descartar', validarFecha, async (req, res) => {
  const propuestas = z.number().int().min(0).safeParse(req.body?.propuestas)
  await prisma.sugerencia.create({
    data: {
      usuarioId: req.usuarioId!,
      fecha: aFechaBD(String(req.params.fecha)),
      estado: 'DESCARTADA',
      contenido: JSON.stringify({ propuestas: propuestas.success ? propuestas.data : 0, aplicadas: 0 }),
    },
  })
  res.json({ mensaje: 'Sugerencia descartada' })
})

export default router
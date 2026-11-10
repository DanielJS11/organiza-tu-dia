import { Router, type NextFunction, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requiereSesion } from '../middleware/autenticacion.js'
import { ErrorIA, generarJSON } from '../ia/cliente.js'
import { esquemaReflexion, esquemaSemana, promptReflexion, promptSemana } from '../ia/prompts.js'
import { instanteEnZona, nombreDia, sumarDiasFecha } from '../motor/dia.js'
import { calcularSemana } from '../motor/semana.js'
import { aFechaBD, hoyEnZona } from '../utilidades/tiempo.js'
import { validarFecha } from './dias.js'
import { buscarEntrada, resumenDelDia } from './diario.js'

const router = Router()
router.use(requiereSesion)

// La IA gratuita tiene cupos limitados: máximo 20 respuestas por hora por usuario
const limiteIA = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.usuarioId!,
  message: { error: 'Pediste muchas respuestas a la IA en poco tiempo. Intenta de nuevo en un rato.' },
})

// Si el usuario desactivó la IA, no se le envía nada
async function requiereIA(req: Request, res: Response, next: NextFunction) {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: req.usuarioId! } })
  if (!usuario.iaActivada) return res.status(403).json({ error: 'Tienes la IA desactivada' })
  next()
}

// Las respuestas de la IA se guardan en "sugerencias" (con su tipo dentro del contenido) para
// mostrarlas otra vez sin gastar cupo y para medir si le sirven al usuario
type Tipo = 'reflexion' | 'semanal'
const guardar = (usuarioId: string, fecha: string, tipo: Tipo, proveedor: string, respuesta: unknown) =>
  prisma.sugerencia.create({
    data: { usuarioId, fecha: aFechaBD(fecha), estado: 'PENDIENTE', contenido: JSON.stringify({ tipo, proveedor, respuesta }) },
  })

const ultima = (usuarioId: string, fecha: string, tipo: Tipo) =>
  prisma.sugerencia.findFirst({
    where: { usuarioId, fecha: aFechaBD(fecha), contenido: { startsWith: `{"tipo":"${tipo}"` } },
    orderBy: { creadaEn: 'desc' },
  })

function aRespuesta(s: { id: string; estado: string; creadaEn: Date; contenido: string }) {
  const { proveedor, respuesta } = JSON.parse(s.contenido)
  return { id: s.id, estado: s.estado, creadaEn: s.creadaEn, proveedor, respuesta }
}

// Convierte los errores de la IA en mensajes para el usuario (503 = servicio no disponible)
function responderError(res: Response, error: unknown) {
  if (error instanceof ErrorIA) return res.status(503).json({ error: error.message })
  throw error
}

// ─── Reflexión de un día ───────────────────────────────────

router.get('/reflexion/:fecha', validarFecha, async (req, res) => {
  const fecha = String(req.params.fecha)
  const [guardada, entrada] = await Promise.all([ultima(req.usuarioId!, fecha, 'reflexion'), buscarEntrada(req.usuarioId!, fecha)])
  if (!guardada) return res.json(null)
  // Si la entrada se editó después, la reflexión puede no corresponder a lo que dice ahora
  res.json({ ...aRespuesta(guardada), desactualizada: !!entrada && entrada.actualizadaEn > guardada.creadaEn })
})

router.post('/reflexion/:fecha', validarFecha, requiereIA, limiteIA, async (req, res) => {
  const fecha = String(req.params.fecha)
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: req.usuarioId! } })
  const entrada = await buscarEntrada(usuario.id, fecha)
  if (!entrada) return res.status(400).json({ error: 'Primero guarda tu entrada de este día' })
  const resumen = await resumenDelDia(usuario.id, usuario.zonaHoraria, fecha)

  try {
    const { datos, proveedor } = await generarJSON(
      promptReflexion({
        dia: nombreDia(fecha),
        texto: entrada.texto,
        etiquetas: entrada.etiquetas.map((e) => e.nombre),
        completadas: resumen.completadas,
        plan: resumen.plan,
      }),
      esquemaReflexion,
    )
    const guardada = await guardar(usuario.id, fecha, 'reflexion', proveedor, datos)
    res.json({ ...aRespuesta(guardada), desactualizada: false })
  } catch (error) {
    responderError(res, error)
  }
})

// ─── La semana: estadísticas (siempre) y resumen de la IA (si se pide) ───

async function datosSemana(usuarioId: string, zonaHoraria: string) {
  const hasta = hoyEnZona(zonaHoraria)
  const desde = sumarDiasFecha(hasta, -6)
  const rango = { gte: aFechaBD(desde), lte: aFechaBD(hasta) }

  const [entradas, diasPlanificados, completadas] = await Promise.all([
    prisma.entradaDiario.findMany({
      where: { usuarioId, fecha: rango },
      include: { etiquetas: { select: { nombre: true } } },
      orderBy: { fecha: 'asc' },
    }),
    prisma.diaPlanificado.count({ where: { usuarioId, fecha: rango } }),
    prisma.tarea.findMany({
      where: { usuarioId, estado: 'COMPLETADA', actualizadaEn: { gte: instanteEnZona(desde, 0, zonaHoraria) } },
      select: { duracionEstimadaMin: true, tiempoRealMin: true },
    }),
  ])

  const listaEntradas = entradas.map((e) => ({
    dia: nombreDia(e.fecha.toISOString().slice(0, 10)),
    texto: e.texto,
    etiquetas: e.etiquetas.map((x) => x.nombre),
  }))
  const estadisticas = calcularSemana({ desde, hasta, diasPlanificados, entradas: listaEntradas, completadas })
  return { hasta, estadisticas, listaEntradas }
}

router.get('/semana', async (req, res) => {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: req.usuarioId! } })
  const { hasta, estadisticas } = await datosSemana(usuario.id, usuario.zonaHoraria)
  const guardada = await ultima(usuario.id, hasta, 'semanal')
  res.json({ estadisticas, resumen: guardada ? aRespuesta(guardada) : null })
})

router.post('/semana', requiereIA, limiteIA, async (req, res) => {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: req.usuarioId! } })
  const { hasta, estadisticas, listaEntradas } = await datosSemana(usuario.id, usuario.zonaHoraria)
  if (estadisticas.diasConEntrada === 0 && estadisticas.tareasCompletadas === 0) {
    return res.status(400).json({ error: 'Aún no hay datos de esta semana: completa tareas o escribe en tu diario y vuelve a intentarlo' })
  }

  try {
    const { datos, proveedor } = await generarJSON(promptSemana(estadisticas, listaEntradas), esquemaSemana)
    const guardada = await guardar(usuario.id, hasta, 'semanal', proveedor, datos)
    res.json({ estadisticas, resumen: aRespuesta(guardada) })
  } catch (error) {
    responderError(res, error)
  }
})

// ─── ¿Te sirvió? ───────────────────────────────────────────

router.patch('/sugerencias/:id', async (req, res) => {
  const util = z.boolean().safeParse(req.body?.util)
  if (!util.success) return res.status(400).json({ error: 'Indica si te sirvió o no' })
  const { count } = await prisma.sugerencia.updateMany({
    where: { id: String(req.params.id), usuarioId: req.usuarioId!, contenido: { startsWith: '{"tipo":' } },
    data: { estado: util.data ? 'ACEPTADA' : 'DESCARTADA' },
  })
  if (count === 0) return res.status(404).json({ error: 'Respuesta no encontrada' })
  res.json({ estado: util.data ? 'ACEPTADA' : 'DESCARTADA' })
})

export default router
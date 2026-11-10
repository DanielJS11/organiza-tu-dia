import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requiereSesion } from '../middleware/autenticacion.js'
import { instanteEnZona, sumarDiasFecha, TIPOS_DE_TRABAJO } from '../motor/dia.js'
import { aFechaBD, aMinutos, hoyEnZona } from '../utilidades/tiempo.js'
import { validarFecha } from './dias.js'

const router = Router()
router.use(requiereSesion)

const MAX_ETIQUETAS = 5

// "#Cansancio  extremo " → "cansancio extremo"
function normalizarEtiqueta(texto: string) {
  return texto.trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLowerCase()
}

const esquemaEntrada = z.object({
  texto: z.string().trim().min(1, 'Escribe algo antes de guardar').max(5000, 'La entrada es muy larga (máximo 5000 caracteres)'),
  etiquetas: z
    .array(z.string())
    .default([])
    .transform((lista) => [...new Set(lista.map(normalizarEtiqueta).filter(Boolean))])
    .refine((lista) => lista.length <= MAX_ETIQUETAS, `Usa máximo ${MAX_ETIQUETAS} etiquetas`)
    .refine((lista) => lista.every((e) => e.length <= 30), 'Cada etiqueta puede tener máximo 30 caracteres'),
})

// Lo que se devuelve de una entrada: las etiquetas como lista de nombres
const incluirEtiquetas = { etiquetas: { select: { nombre: true }, orderBy: { nombre: 'asc' as const } } }
type EntradaBD = { id: string; fecha: Date; texto: string; actualizadaEn: Date; etiquetas: { nombre: string }[] }
const aRespuesta = (e: EntradaBD) => ({
  id: e.id,
  fecha: e.fecha.toISOString().slice(0, 10),
  texto: e.texto,
  actualizadaEn: e.actualizadaEn,
  etiquetas: e.etiquetas.map((x) => x.nombre),
})

export const buscarEntrada = (usuarioId: string, fecha: string) =>
  prisma.entradaDiario.findFirst({ where: { usuarioId, fecha: aFechaBD(fecha) }, include: incluirEtiquetas })

// Borra las etiquetas que ya no usa ninguna entrada
const limpiarEtiquetas = (usuarioId: string) => prisma.etiqueta.deleteMany({ where: { usuarioId, entradas: { none: {} } } })

// Historial: entradas de la más reciente a la más antigua, con filtro por etiqueta o por texto
router.get('/', async (req, res) => {
  const etiqueta = typeof req.query.etiqueta === 'string' ? normalizarEtiqueta(req.query.etiqueta) : ''
  const buscar = typeof req.query.buscar === 'string' ? req.query.buscar.trim().slice(0, 100) : ''
  const entradas = await prisma.entradaDiario.findMany({
    where: {
      usuarioId: req.usuarioId!,
      ...(etiqueta && { etiquetas: { some: { nombre: etiqueta } } }),
      ...(buscar && { texto: { contains: buscar, mode: 'insensitive' as const } }),
    },
    include: incluirEtiquetas,
    orderBy: { fecha: 'desc' },
    take: 100,
  })
  res.json(entradas.map(aRespuesta))
})

// Etiquetas del usuario con cuántas entradas las usan (para filtrar y para sugerir al escribir)
router.get('/etiquetas', async (req, res) => {
  const etiquetas = await prisma.etiqueta.findMany({
    where: { usuarioId: req.usuarioId! },
    include: { _count: { select: { entradas: true } } },
    orderBy: { nombre: 'asc' },
  })
  res.json(etiquetas.map((e) => ({ nombre: e.nombre, usos: e._count.entradas })))
})

/*
  Resumen de lo que pasó en un día, para ayudar a reflexionar (también lo usa la IA):
  - El plan del día: plantilla y bloques de trabajo con su tarea.
  - Las tareas que se completaron ese día (una tarea completada no se puede editar, así que
    su última actualización es el momento en que se completó), con el tiempo real frente al estimado.
*/
export async function resumenDelDia(usuarioId: string, zonaHoraria: string, fecha: string) {
  const [dia, completadas] = await Promise.all([
    prisma.diaPlanificado.findUnique({
      where: { usuarioId_fecha: { usuarioId, fecha: aFechaBD(fecha) } },
      include: { plantilla: true, bloques: { include: { tarea: { select: { titulo: true, estado: true } } } } },
    }),
    prisma.tarea.findMany({
      where: {
        usuarioId,
        estado: 'COMPLETADA',
        actualizadaEn: {
          gte: instanteEnZona(fecha, 0, zonaHoraria),
          lt: instanteEnZona(sumarDiasFecha(fecha, 1), 0, zonaHoraria),
        },
      },
      orderBy: { actualizadaEn: 'asc' },
    }),
  ])

  const bloquesTrabajo = (dia?.bloques ?? [])
    .filter((b) => TIPOS_DE_TRABAJO.includes(b.tipo) || b.tareaId)
    .sort((a, b) => aMinutos(a.horaInicio) - aMinutos(b.horaInicio))

  return {
    plan: dia
      ? {
          nombre: dia.plantilla?.nombre ?? 'Plan personalizado',
          bloques: bloquesTrabajo.map((b) => ({
            titulo: b.titulo,
            horaInicio: b.horaInicio,
            horaFin: b.horaFin,
            tarea: b.tarea ? { titulo: b.tarea.titulo, completada: b.tarea.estado === 'COMPLETADA' } : null,
          })),
        }
      : null,
    completadas: completadas.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      duracionEstimadaMin: t.duracionEstimadaMin,
      tiempoRealMin: t.tiempoRealMin,
    })),
  }
}

// Un día del diario: la entrada (si existe) y el resumen de lo que pasó ese día
router.get('/:fecha', validarFecha, async (req, res) => {
  const fecha = String(req.params.fecha)
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: req.usuarioId! } })
  const [entrada, resumen] = await Promise.all([buscarEntrada(usuario.id, fecha), resumenDelDia(usuario.id, usuario.zonaHoraria, fecha)])

  res.json({
    fecha,
    esFuturo: fecha > hoyEnZona(usuario.zonaHoraria),
    entrada: entrada ? aRespuesta(entrada) : null,
    resumen,
  })
})

// Guarda la entrada del día (la crea o la reemplaza). No se escribe sobre días que no han llegado.
router.put('/:fecha', validarFecha, async (req, res) => {
  const resultado = esquemaEntrada.safeParse(req.body)
  if (!resultado.success) return res.status(400).json({ error: resultado.error.issues[0].message })
  const { texto, etiquetas } = resultado.data
  const fecha = String(req.params.fecha)
  const usuarioId = req.usuarioId!

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } })
  if (fecha > hoyEnZona(usuario.zonaHoraria)) {
    return res.status(400).json({ error: 'Solo puedes escribir sobre hoy o sobre días que ya pasaron' })
  }

  const guardada = await prisma.$transaction(async (tx) => {
    const ids = await Promise.all(
      etiquetas.map((nombre) =>
        tx.etiqueta.upsert({ where: { usuarioId_nombre: { usuarioId, nombre } }, create: { usuarioId, nombre }, update: {}, select: { id: true } }),
      ),
    )
    const existente = await tx.entradaDiario.findFirst({ where: { usuarioId, fecha: aFechaBD(fecha) } })
    const entrada = existente
      ? await tx.entradaDiario.update({ where: { id: existente.id }, data: { texto, etiquetas: { set: ids } }, include: incluirEtiquetas })
      : await tx.entradaDiario.create({ data: { usuarioId, fecha: aFechaBD(fecha), texto, etiquetas: { connect: ids } }, include: incluirEtiquetas })
    await tx.etiqueta.deleteMany({ where: { usuarioId, entradas: { none: {} } } })
    return entrada
  })

  res.json(aRespuesta(guardada))
})

router.delete('/:fecha', validarFecha, async (req, res) => {
  const fecha = String(req.params.fecha)
  const { count } = await prisma.entradaDiario.deleteMany({ where: { usuarioId: req.usuarioId!, fecha: aFechaBD(fecha) } })
  if (count === 0) return res.status(404).json({ error: 'No hay una entrada para ese día' })
  await limpiarEtiquetas(req.usuarioId!)
  res.json({ mensaje: 'Entrada eliminada' })
})

export default router
import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requiereSesion } from '../middleware/autenticacion.js'
import { aFechaBD, aHora, aMinutos, esFechaValida, hoyEnZona } from '../utilidades/tiempo.js'

const router = Router()
router.use(requiereSesion)

// Revisa que la fecha de la dirección (/api/dias/2026-10-23) sea válida
export function validarFecha(req: Request, res: Response, next: NextFunction) {
  if (!esFechaValida(String(req.params.fecha))) {
    return res.status(400).json({ error: 'Invalid date' })
  }
  next()
}

// Datos que se devuelven de un día: sus bloques ordenados por hora y el nombre de la plantilla usada
export const incluirDia = {
  plantilla: { select: { id: true, nombre: true } },
  bloques: {
    orderBy: { horaInicio: 'asc' as const },
    include: { tarea: { select: { id: true, titulo: true, prioridad: true, estado: true, duracionEstimadaMin: true } } },
  },
}

// Plan de un día (o null si ese día aún no tiene plan)
router.get('/:fecha', validarFecha, async (req, res) => {
  const dia = await prisma.diaPlanificado.findUnique({
    where: { usuarioId_fecha: { usuarioId: req.usuarioId!, fecha: aFechaBD(String(req.params.fecha)) } },
    include: incluirDia,
  })
  res.json(dia)
})

const esquemaAplicar = z.object({ plantillaId: z.number().int() })

// Copia los bloques de una plantilla al día elegido (si ya tenía plan, lo reemplaza)
router.post('/:fecha/aplicar-plantilla', validarFecha, async (req, res) => {
  const resultado = esquemaAplicar.safeParse(req.body)
  if (!resultado.success) {
    return res.status(400).json({ error: 'Invalid template' })
  }
  const fecha = String(req.params.fecha)

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: req.usuarioId } })
  if (fecha < hoyEnZona(usuario.zonaHoraria)) {
    return res.status(400).json({ error: 'You can\'t plan a day that has already passed' })
  }

  const plantilla = await prisma.plantilla.findUnique({
    where: { id: resultado.data.plantillaId },
    include: { bloques: { orderBy: { orden: 'asc' } } },
  })
  if (!plantilla) {
    return res.status(404).json({ error: 'Template not found' })
  }

  // Los bloques se COPIAN: editar el día después no cambia la plantilla original
  const bloques = plantilla.bloques.map((b) => ({
    tipo: b.tipo,
    titulo: b.titulo,
    horaInicio: b.horaInicio,
    horaFin: aHora(aMinutos(b.horaInicio) + b.duracionMin),
  }))

  const clave = { usuarioId_fecha: { usuarioId: req.usuarioId!, fecha: aFechaBD(fecha) } }
  const dia = await prisma.diaPlanificado.upsert({
    where: clave,
    create: {
      usuarioId: req.usuarioId!,
      fecha: aFechaBD(fecha),
      plantillaId: plantilla.id,
      bloques: { create: bloques },
    },
    update: {
      plantillaId: plantilla.id,
      bloques: { deleteMany: {}, create: bloques },
    },
    include: incluirDia,
  })
  res.json(dia)
})

// Quita el plan de un día
router.delete('/:fecha', validarFecha, async (req, res) => {
  await prisma.diaPlanificado.deleteMany({
    where: { usuarioId: req.usuarioId, fecha: aFechaBD(String(req.params.fecha)) },
  })
  res.json({ mensaje: 'Plan deleted' })
})

// ─── Ajustar los bloques de un día ─────────────────────────

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

const esquemaBloque = z
  .object({
    tipo: z.enum(['ESTUDIO', 'TRABAJO', 'ENFOQUE', 'DESCANSO', 'PERSONAL']),
    titulo: z.string().trim().min(1, 'Enter a name for the block').max(60),
    horaInicio: z.string().regex(HORA, 'Invalid start time'),
    horaFin: z.string().regex(HORA, 'Invalid end time'),
    tareaId: z.string().nullable().optional(),
  })
  .refine((b) => aMinutos(b.horaFin) > aMinutos(b.horaInicio), { message: 'The end time must be after the start time' })

type DatosBloque = z.infer<typeof esquemaBloque>

// Busca el día del usuario y verifica que se pueda modificar (que exista y no haya pasado)
export async function obtenerDiaEditable(usuarioId: string, fecha: string) {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } })
  if (fecha < hoyEnZona(usuario.zonaHoraria)) {
    return { ok: false, estado: 400, error: 'You can\'t change a day that has already passed' } as const
  }
  const dia = await prisma.diaPlanificado.findUnique({
    where: { usuarioId_fecha: { usuarioId, fecha: aFechaBD(fecha) } },
    include: { bloques: true },
  })
  if (!dia) return { ok: false, estado: 404, error: 'First choose a template for this day' } as const
  return { ok: true, dia } as const
}

// Revisa que el bloque no se cruce con otro y que la tarea (si hay) sea del usuario y esté pendiente
async function validarBloque(
  datos: DatosBloque,
  usuarioId: string,
  otros: { id: string; titulo: string; horaInicio: string; horaFin: string }[],
  tareaActual: string | null = null, // la tarea que el bloque ya tenía (puede seguir aunque se haya completado)
) {
  const inicio = aMinutos(datos.horaInicio)
  const fin = aMinutos(datos.horaFin)
  const cruce = otros.find((b) => inicio < aMinutos(b.horaFin) && fin > aMinutos(b.horaInicio))
  if (cruce) {
    return `This time overlaps with "${cruce.titulo}" (${cruce.horaInicio} – ${cruce.horaFin})`
  }
  if (datos.tareaId && datos.tareaId !== tareaActual) {
    const tarea = await prisma.tarea.findFirst({ where: { id: datos.tareaId, usuarioId } })
    if (!tarea) return 'Task not found'
    if (tarea.estado === 'COMPLETADA') return 'You can\'t assign a task that is already completed'
  }
  return null
}

export async function devolverDia(diaId: string) {
  return prisma.diaPlanificado.findUniqueOrThrow({ where: { id: diaId }, include: incluirDia })
}

// Agregar un bloque
router.post('/:fecha/bloques', validarFecha, async (req, res) => {
  const resultado = esquemaBloque.safeParse(req.body)
  if (!resultado.success) return res.status(400).json({ error: resultado.error.issues[0].message })

  const buscado = await obtenerDiaEditable(req.usuarioId!, String(req.params.fecha))
  if (!buscado.ok) return res.status(buscado.estado).json({ error: buscado.error })

  const problema = await validarBloque(resultado.data, req.usuarioId!, buscado.dia.bloques)
  if (problema) return res.status(400).json({ error: problema })

  await prisma.bloque.create({ data: { ...resultado.data, tareaId: resultado.data.tareaId ?? null, diaId: buscado.dia.id } })
  res.status(201).json(await devolverDia(buscado.dia.id))
})

// Editar un bloque (horario, nombre, tipo o tarea asignada)
router.patch('/:fecha/bloques/:id', validarFecha, async (req, res) => {
  const resultado = esquemaBloque.safeParse(req.body)
  if (!resultado.success) return res.status(400).json({ error: resultado.error.issues[0].message })

  const buscado = await obtenerDiaEditable(req.usuarioId!, String(req.params.fecha))
  if (!buscado.ok) return res.status(buscado.estado).json({ error: buscado.error })

  const bloque = buscado.dia.bloques.find((b) => b.id === req.params.id)
  if (!bloque) return res.status(404).json({ error: 'Block not found' })

  const otros = buscado.dia.bloques.filter((b) => b.id !== bloque.id)
  const problema = await validarBloque(resultado.data, req.usuarioId!, otros, bloque.tareaId)
  if (problema) return res.status(400).json({ error: problema })

  await prisma.bloque.update({ where: { id: bloque.id }, data: { ...resultado.data, tareaId: resultado.data.tareaId ?? null } })
  res.json(await devolverDia(buscado.dia.id))
})

// Eliminar un bloque
router.delete('/:fecha/bloques/:id', validarFecha, async (req, res) => {
  const buscado = await obtenerDiaEditable(req.usuarioId!, String(req.params.fecha))
  if (!buscado.ok) return res.status(buscado.estado).json({ error: buscado.error })

  const { count } = await prisma.bloque.deleteMany({ where: { id: String(req.params.id), diaId: buscado.dia.id } })
  if (count === 0) return res.status(404).json({ error: 'Block not found' })
  res.json(await devolverDia(buscado.dia.id))
})

export default router

import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requiereSesion } from '../middleware/autenticacion.js'
import { aFechaBD, aHora, aMinutos, esFechaValida, hoyEnZona } from '../utilidades/tiempo.js'

const router = Router()
router.use(requiereSesion)

// Revisa que la fecha de la dirección (/api/dias/2026-10-23) sea válida
function validarFecha(req: Request, res: Response, next: NextFunction) {
  if (!esFechaValida(String(req.params.fecha))) {
    return res.status(400).json({ error: 'Fecha no válida' })
  }
  next()
}

// Datos que se devuelven de un día: sus bloques ordenados por hora y el nombre de la plantilla usada
const incluirDia = {
  plantilla: { select: { id: true, nombre: true } },
  bloques: { orderBy: { horaInicio: 'asc' as const } },
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
    return res.status(400).json({ error: 'Plantilla no válida' })
  }
  const fecha = String(req.params.fecha)

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: req.usuarioId } })
  if (fecha < hoyEnZona(usuario.zonaHoraria)) {
    return res.status(400).json({ error: 'No puedes planificar un día que ya pasó' })
  }

  const plantilla = await prisma.plantilla.findUnique({
    where: { id: resultado.data.plantillaId },
    include: { bloques: { orderBy: { orden: 'asc' } } },
  })
  if (!plantilla) {
    return res.status(404).json({ error: 'Plantilla no encontrada' })
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
  res.json({ mensaje: 'Plan eliminado' })
})

export default router
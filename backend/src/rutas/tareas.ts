import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requiereSesion } from '../middleware/autenticacion.js'

const router = Router()

// Todas las rutas de tareas requieren sesión
router.use(requiereSesion)

const esquemaTarea = z.object({
  titulo: z.string().trim().min(1, 'Escribe un título').max(120, 'El título es muy largo'),
  descripcion: z.string().trim().max(1000).nullable().optional(),
  fechaEntrega: z.iso.datetime({ offset: true }).nullable().optional(),
  prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
  duracionEstimadaMin: z
    .number()
    .int()
    .min(5, 'La duración mínima es 5 minutos')
    .max(1440, 'La duración máxima es 24 horas'),
  estado: z.enum(['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA']).optional(),
  tiempoRealMin: z.number().int().min(0).max(1440).nullable().optional(),
})

// Para editar, todos los campos son opcionales
const esquemaEdicion = esquemaTarea.partial()

// Convierte el texto de la fecha en un objeto Date (o null si se borró)
function convertirFecha(fecha: string | null | undefined) {
  if (fecha === undefined) return undefined
  return fecha === null ? null : new Date(fecha)
}

// Se da un minuto de margen porque el formulario solo maneja horas y minutos
function esFechaPasada(fecha: string) {
  return new Date(fecha).getTime() < Date.now() - 60_000
}

const MENSAJE_FECHA_PASADA = 'La fecha de entrega no puede estar en el pasado'

// Lista: pendientes primero, luego por fecha de entrega más cercana y prioridad
router.get('/', async (req, res) => {
  const tareas = await prisma.tarea.findMany({
    where: { usuarioId: req.usuarioId },
    orderBy: [
      { estado: 'asc' },
      { fechaEntrega: { sort: 'asc', nulls: 'last' } },
      { prioridad: 'asc' },
    ],
  })
  res.json(tareas)
})

router.post('/', async (req, res) => {
  const resultado = esquemaTarea.safeParse(req.body)
  if (!resultado.success) {
    return res.status(400).json({ error: resultado.error.issues[0].message })
  }
    const { fechaEntrega, ...datos } = resultado.data
  if (fechaEntrega && esFechaPasada(fechaEntrega)) {
    return res.status(400).json({ error: MENSAJE_FECHA_PASADA })
  }

  const tarea = await prisma.tarea.create({
    data: { ...datos, fechaEntrega: convertirFecha(fechaEntrega), usuarioId: req.usuarioId! },
  })
  res.status(201).json(tarea)
})

router.patch('/:id', async (req, res) => {
  const resultado = esquemaEdicion.safeParse(req.body)
  if (!resultado.success) {
    return res.status(400).json({ error: resultado.error.issues[0].message })
  }

  // Verifica que la tarea exista y sea de este usuario
  const existe = await prisma.tarea.findFirst({ where: { id: req.params.id, usuarioId: req.usuarioId } })
  if (!existe) {
    return res.status(404).json({ error: 'Tarea no encontrada' })
  }

    // Una tarea completada no se puede editar: solo se puede volver a abrir (desmarcarla)
   // Una tarea completada es definitiva: no se puede editar ni volver a abrir
  if (existe.estado === 'COMPLETADA') {
    return res.status(409).json({ error: 'Las tareas completadas no se pueden modificar' })
  }
  
  const { fechaEntrega, ...datos } = resultado.data

  // Solo se valida la fecha si cambió; así una tarea ya vencida puede editarse sin moverle la fecha
  const fechaCambio = fechaEntrega && new Date(fechaEntrega).getTime() !== existe.fechaEntrega?.getTime()
  if (fechaCambio && esFechaPasada(fechaEntrega)) {
    return res.status(400).json({ error: MENSAJE_FECHA_PASADA })
  }

  const tarea = await prisma.tarea.update({
    where: { id: existe.id },
    data: { ...datos, fechaEntrega: convertirFecha(fechaEntrega) },
  })
  res.json(tarea)
})

router.delete('/:id', async (req, res) => {
  const { count } = await prisma.tarea.deleteMany({ where: { id: req.params.id, usuarioId: req.usuarioId } })
  if (count === 0) {
    return res.status(404).json({ error: 'Tarea no encontrada' })
  }
  res.json({ mensaje: 'Tarea eliminada' })
})

export default router
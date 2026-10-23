import { Router } from 'express'
import { prisma } from '../db.js'
import { requiereSesion } from '../middleware/autenticacion.js'

const router = Router()
router.use(requiereSesion)

// Las 4 plantillas predeterminadas con sus bloques en orden
router.get('/', async (_req, res) => {
  const plantillas = await prisma.plantilla.findMany({
    orderBy: { id: 'asc' },
    include: { bloques: { orderBy: { orden: 'asc' } } },
  })
  res.json(plantillas)
})

export default router
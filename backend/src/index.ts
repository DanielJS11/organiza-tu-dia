import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { prisma } from './db.js'

const app = express()
const PUERTO = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/api/salud', (_req, res) => {
  res.json({ estado: 'ok', mensaje: 'El backend está funcionando' })
})

app.get('/api/plantillas', async (_req, res) => {
  const plantillas = await prisma.plantilla.findMany({
    orderBy: { id: 'asc' },
    include: { bloques: { orderBy: { orden: 'asc' } } },
  })
  res.json(plantillas)
})

app.listen(PUERTO, () => {
  console.log(`Servidor escuchando en http://localhost:${PUERTO}`)
})
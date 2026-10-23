import 'dotenv/config'
import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rutasAuth from './rutas/auth.js'
import rutasTareas from './rutas/tareas.js'
import rutasPlantillas from './rutas/plantillas.js'
import rutasDias from './rutas/dias.js'
import rutasPlanificacion from './rutas/planificacion.js'

if (!process.env.JWT_SECRET) {
  throw new Error('Falta JWT_SECRET en el archivo .env')
}

const app = express()
const PUERTO = process.env.PORT || 3000

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/api/salud', (_req, res) => {
  res.json({ estado: 'ok', mensaje: 'El backend está funcionando' })
})

app.use('/api/auth', rutasAuth)
app.use('/api/tareas', rutasTareas)
app.use('/api/plantillas', rutasPlantillas)
app.use('/api/dias', rutasDias)
app.use('/api/planificacion', rutasPlanificacion)

// Manejo de errores: si algo falla, responde con un mensaje claro en vez de detener el servidor
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  res.status(500).json({ error: 'Ocurrió un error en el servidor' })
})

app.listen(PUERTO, () => {
  console.log(`Servidor escuchando en http://localhost:${PUERTO}`)
})
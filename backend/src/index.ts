import 'dotenv/config'
import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import rutasAuth from './rutas/auth.js'
import rutasTareas from './rutas/tareas.js'
import rutasPlantillas from './rutas/plantillas.js'
import rutasDias from './rutas/dias.js'
import rutasPlanificacion from './rutas/planificacion.js'
import rutasDiario from './rutas/diario.js'
import rutasIA from './rutas/ia.js'

if (!process.env.JWT_SECRET) {
  throw new Error('Falta JWT_SECRET en el archivo .env')
}

const app = express()
const PUERTO = process.env.PORT || 3000

// En producción hay proxies delante del backend (Vercel y Render): se indica cuántos son para
// ver la IP real de cada usuario, que usan los límites de intentos. Se ajusta con TRUST_PROXY
if (process.env.NODE_ENV === 'production') app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1))

// Cabeceras de seguridad (evitan que la API se cargue en iframes, ocultan "X-Powered-By", etc.)
app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
// Ninguna petición legítima pesa más de 100 KB (una entrada del diario cabe de sobra)
app.use(express.json({ limit: '100kb' }))
// Límite general por IP para frenar abusos: 1000 peticiones cada 15 minutos (el uso normal queda muy por debajo)
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, message: { error: 'Demasiadas peticiones. Espera unos minutos.' } }))

app.use(cookieParser())

// Para comprobar que el backend responde (y qué IP ve: debe ser la tuya, no la de un proxy)
app.get('/api/salud', (req, res) => {
  res.json({ estado: 'ok', mensaje: 'El backend está funcionando', ip: req.ip })
})

app.use('/api/auth', rutasAuth)
app.use('/api/tareas', rutasTareas)
app.use('/api/plantillas', rutasPlantillas)
app.use('/api/dias', rutasDias)
app.use('/api/planificacion', rutasPlanificacion)
app.use('/api/diario', rutasDiario)
app.use('/api/ia', rutasIA)

// Manejo de errores: si algo falla, responde con un mensaje claro en vez de detener el servidor
app.use((error: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  // Errores del cliente al enviar datos: no son fallas del servidor
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Los datos enviados son demasiado grandes' })
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Los datos enviados no tienen un formato válido' })
  console.error(error)
  res.status(500).json({ error: 'Ocurrió un error en el servidor' })
})

app.listen(PUERTO, () => {
  console.log(`Servidor escuchando en http://localhost:${PUERTO}`)
})
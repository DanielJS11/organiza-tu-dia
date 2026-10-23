import { Router, type Response } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { prisma } from '../db.js'
import { crearToken, requiereSesion, NOMBRE_COOKIE } from '../middleware/autenticacion.js'

const router = Router()
const enProduccion = process.env.NODE_ENV === 'production'

// Máximo 10 intentos cada 15 minutos por IP (protege contra ataques de fuerza bruta)
const limiteIntentos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Demasiados intentos. Espera unos minutos.' },
})

const esquemaRegistro = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(60),
  correo: z.string().trim().toLowerCase().email('Correo no válido'),
  contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
})

const esquemaIngreso = z.object({
  correo: z.string().trim().toLowerCase().email('Correo no válido'),
  contrasena: z.string().min(1, 'Escribe tu contraseña'),
})

// Datos del usuario que sí se pueden enviar al frontend (nunca el hash)
const camposPublicos = {
  id: true,
  nombre: true,
  correo: true,
  zonaHoraria: true,
  horaInicio: true,
  horaFin: true,
  iaActivada: true,
} as const

function guardarSesion(res: Response, usuarioId: string) {
  res.cookie(NOMBRE_COOKIE, crearToken(usuarioId), {
    httpOnly: true,
    secure: enProduccion,
    sameSite: enProduccion ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

router.post('/registro', limiteIntentos, async (req, res) => {
  const resultado = esquemaRegistro.safeParse(req.body)
  if (!resultado.success) {
    return res.status(400).json({ error: resultado.error.issues[0].message })
  }
  const { nombre, correo, contrasena } = resultado.data

  const existe = await prisma.usuario.findUnique({ where: { correo } })
  if (existe) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' })
  }

  const usuario = await prisma.usuario.create({
    data: { nombre, correo, hashContrasena: await bcrypt.hash(contrasena, 10) },
    select: camposPublicos,
  })
  guardarSesion(res, usuario.id)
  res.status(201).json(usuario)
})

router.post('/login', limiteIntentos, async (req, res) => {
  const resultado = esquemaIngreso.safeParse(req.body)
  if (!resultado.success) {
    return res.status(400).json({ error: resultado.error.issues[0].message })
  }
  const { correo, contrasena } = resultado.data

  const usuario = await prisma.usuario.findUnique({ where: { correo } })
  const valida = usuario && (await bcrypt.compare(contrasena, usuario.hashContrasena))
  if (!usuario || !valida) {
    // Mismo mensaje en ambos casos para no revelar qué correos están registrados
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
  }

  guardarSesion(res, usuario.id)
  const { hashContrasena: _h, creadoEn: _c, ...publico } = usuario
  res.json(publico)
})

router.post('/logout', (_req, res) => {
  res.clearCookie(NOMBRE_COOKIE)
  res.json({ mensaje: 'Sesión cerrada' })
})

router.get('/yo', requiereSesion, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuarioId },
    select: camposPublicos,
  })
  if (!usuario) {
    res.clearCookie(NOMBRE_COOKIE)
    return res.status(401).json({ error: 'La cuenta ya no existe' })
  }
  res.json(usuario)
})

export default router
import { Router, type Response } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { prisma } from '../db.js'
import { crearToken, requiereSesion, NOMBRE_COOKIE } from '../middleware/autenticacion.js'
import { correoRecuperacion, enviarCorreo } from '../utilidades/correo.js'
import { crearTokenRecuperacion, hashToken, MINUTOS_VALIDEZ_RECUPERACION } from '../utilidades/tokens.js'

const router = Router()
const enProduccion = process.env.NODE_ENV === 'production'

// Máximo 10 intentos cada 15 minutos por IP (protege contra ataques de fuerza bruta)
const limiteIntentos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Demasiados intentos. Espera unos minutos.' },
})

const esquemaContrasena = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72)

const esquemaRegistro = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(60),
  correo: z.string().trim().toLowerCase().email('Correo no válido'),
    contrasena: esquemaContrasena,
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
    // Se responde solo con los campos públicos (lista explícita): así ningún campo nuevo
  // del modelo, como el token de recuperación, se envía por accidente
  res.json(await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id }, select: camposPublicos }))
})

// ─── Recuperar la contraseña ───────────────────────────────

// Paso 1: pedir el enlace. La respuesta es siempre la misma, exista o no la cuenta,
// para no revelar qué correos están registrados.
router.post('/olvide', limiteIntentos, async (req, res) => {
  const resultado = z.object({ correo: z.string().trim().toLowerCase().email('Correo no válido') }).safeParse(req.body)
  if (!resultado.success) return res.status(400).json({ error: resultado.error.issues[0].message })

  const usuario = await prisma.usuario.findUnique({ where: { correo: resultado.data.correo } })
  if (usuario) {
    const { token, hash, expira } = crearTokenRecuperacion()
    await prisma.usuario.update({ where: { id: usuario.id }, data: { tokenRecuperacion: hash, tokenRecuperacionExpira: expira } })
    const enlace = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/restablecer?token=${token}`
    try {
      await enviarCorreo({ para: usuario.correo, ...correoRecuperacion(usuario.nombre, enlace, MINUTOS_VALIDEZ_RECUPERACION) })
    } catch (error) {
      console.error('[correo] No se pudo enviar el correo de recuperación:', (error as Error).message)
    }
  }
  res.json({ mensaje: 'Si ese correo tiene una cuenta, te enviamos un enlace para restablecer la contraseña. Revisa también la carpeta de spam.' })
})

// Paso 2: elegir la nueva contraseña con el token del enlace (vale una sola vez y por tiempo limitado)
router.post('/restablecer', limiteIntentos, async (req, res) => {
  const resultado = z.object({ token: z.string().min(20).max(200), contrasena: esquemaContrasena }).safeParse(req.body)
  if (!resultado.success) return res.status(400).json({ error: resultado.error.issues[0].message })

  const usuario = await prisma.usuario.findUnique({ where: { tokenRecuperacion: hashToken(resultado.data.token) } })
  if (!usuario || !usuario.tokenRecuperacionExpira || usuario.tokenRecuperacionExpira < new Date()) {
    return res.status(400).json({ error: 'El enlace no es válido o ya venció. Pide uno nuevo.' })
  }

  const actualizado = await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      hashContrasena: await bcrypt.hash(resultado.data.contrasena, 10),
      tokenRecuperacion: null,
      tokenRecuperacionExpira: null,
      contrasenaCambiadaEn: new Date(), // cierra las sesiones abiertas con la contraseña anterior
    },
    select: camposPublicos,
  })
  guardarSesion(res, actualizado.id)
  res.json(actualizado)
})

router.post('/logout', (_req, res) => {
  res.clearCookie(NOMBRE_COOKIE)
  res.json({ mensaje: 'Sesión cerrada' })
})

// Preferencias del usuario (por ahora: activar o desactivar la IA)
router.patch('/preferencias', requiereSesion, async (req, res) => {
  const resultado = z.object({ iaActivada: z.boolean() }).safeParse(req.body)
  if (!resultado.success) return res.status(400).json({ error: 'Preferencia no válida' })
  const usuario = await prisma.usuario.update({ where: { id: req.usuarioId }, data: resultado.data, select: camposPublicos })
  res.json(usuario)
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
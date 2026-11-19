import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'

export const NOMBRE_COOKIE = 'sesion'
const secreto = () => process.env.JWT_SECRET as string

// Agrega "usuarioId" a cada petición autenticada
declare global {
  namespace Express {
    interface Request {
      usuarioId?: string
    }
  }
}

export function crearToken(usuarioId: string) {
  return jwt.sign({ sub: usuarioId }, secreto(), { expiresIn: '7d' })
}

// Revisa la cookie de sesión. Además de que el token sea válido, comprueba que la cuenta
// exista y que la sesión se haya abierto después del último cambio de contraseña
// (al restablecerla, las sesiones abiertas en otros dispositivos dejan de valer).
export async function requiereSesion(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[NOMBRE_COOKIE]
  if (!token) {
    return res.status(401).json({ error: 'You need to log in' })
  }

  let datos: { sub: string; iat: number }
  try {
    datos = jwt.verify(token, secreto()) as { sub: string; iat: number }
  } catch {
    return res.status(401).json({ error: 'Your session expired, please log in again' })
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: datos.sub }, select: { contrasenaCambiadaEn: true } })
  if (!usuario) {
    res.clearCookie(NOMBRE_COOKIE)
    return res.status(401).json({ error: 'This account no longer exists' })
  }
  if (usuario.contrasenaCambiadaEn && datos.iat < Math.floor(usuario.contrasenaCambiadaEn.getTime() / 1000)) {
    res.clearCookie(NOMBRE_COOKIE)
    return res.status(401).json({ error: 'Your password changed: please log in again' })
  }

  req.usuarioId = datos.sub
  next()
}

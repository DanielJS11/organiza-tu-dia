import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

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

export function requiereSesion(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[NOMBRE_COOKIE]
  if (!token) {
    return res.status(401).json({ error: 'Debes iniciar sesión' })
  }
  try {
    const datos = jwt.verify(token, secreto()) as { sub: string }
    req.usuarioId = datos.sub
    next()
  } catch {
    res.status(401).json({ error: 'La sesión expiró, inicia sesión de nuevo' })
  }
}
import { createHash, randomBytes } from 'node:crypto'

// Minutos que dura un enlace de recuperación de contraseña
export const MINUTOS_VALIDEZ_RECUPERACION = 30

// El token viaja en el enlace del correo; en la base de datos solo se guarda su hash.
// Así, aunque alguien leyera la base de datos, no podría usar los enlaces pendientes.
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

// Token aleatorio de 256 bits, seguro para poner en una URL
export function crearTokenRecuperacion() {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token), expira: new Date(Date.now() + MINUTOS_VALIDEZ_RECUPERACION * 60_000) }
}
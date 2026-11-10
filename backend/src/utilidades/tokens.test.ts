import { describe, expect, it } from 'vitest'
import { crearTokenRecuperacion, hashToken, MINUTOS_VALIDEZ_RECUPERACION } from './tokens.js'

describe('token de recuperación', () => {
  it('es aleatorio, apto para URL y distinto cada vez', () => {
    const a = crearTokenRecuperacion()
    const b = crearTokenRecuperacion()
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/) // 32 bytes en base64url
    expect(a.token).not.toBe(b.token)
  })

  it('en la base de datos se guarda el hash, no el token', () => {
    const { token, hash } = crearTokenRecuperacion()
    expect(hash).not.toBe(token)
    expect(hash).toBe(hashToken(token))
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it(`vence en ${MINUTOS_VALIDEZ_RECUPERACION} minutos`, () => {
    const antes = Date.now()
    const { expira } = crearTokenRecuperacion()
    expect(expira.getTime() - antes).toBeGreaterThanOrEqual(MINUTOS_VALIDEZ_RECUPERACION * 60_000 - 50)
    expect(expira.getTime() - antes).toBeLessThanOrEqual(MINUTOS_VALIDEZ_RECUPERACION * 60_000 + 50)
  })
})
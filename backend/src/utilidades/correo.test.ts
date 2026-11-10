import { afterEach, describe, expect, it, vi } from 'vitest'
import { correoRecuperacion, enviarCorreo } from './correo.js'

afterEach(() => vi.unstubAllEnvs())

describe('correo de recuperación', () => {
  it('incluye el enlace y escapa el nombre dentro del HTML', () => {
    const c = correoRecuperacion('<b>Ana</b>', 'http://localhost:5173/restablecer?token=abc', 30)
    expect(c.texto).toContain('http://localhost:5173/restablecer?token=abc')
    expect(c.texto).toContain('vence en 30 minutos')
    expect(c.html).toContain('&lt;b&gt;Ana&lt;/b&gt;')
    expect(c.html).not.toContain('<b>Ana</b>')
  })
})

describe('envío con Brevo', () => {
  const correo = { para: 'ana@correo.co', asunto: 'Hola', html: '<p>Hola</p>', texto: 'Hola' }

  it('sin clave no llama a Brevo: lo muestra en la consola (modo desarrollo)', async () => {
    vi.stubEnv('BREVO_API_KEY', '')
    const f = vi.fn()
    const consola = vi.spyOn(console, 'log').mockImplementation(() => {})
    await enviarCorreo(correo, f as typeof fetch)
    expect(f).not.toHaveBeenCalled()
    expect(consola.mock.calls[0][0]).toContain('Para: ana@correo.co')
    consola.mockRestore()
  })

  it('con clave envía a la API de Brevo con el remitente configurado', async () => {
    vi.stubEnv('BREVO_API_KEY', 'clave')
    vi.stubEnv('CORREO_REMITENTE', 'yo@correo.co')
    const f = vi.fn(async () => new Response('{}', { status: 201 }))
    await enviarCorreo(correo, f as typeof fetch)
    const [url, opciones] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect((opciones.headers as Record<string, string>)['api-key']).toBe('clave')
    expect(JSON.parse(opciones.body as string)).toMatchObject({ sender: { email: 'yo@correo.co' }, to: [{ email: 'ana@correo.co' }], subject: 'Hola' })
  })

  it('si Brevo rechaza el envío, lanza un error con el motivo', async () => {
    vi.stubEnv('BREVO_API_KEY', 'clave')
    vi.stubEnv('CORREO_REMITENTE', 'yo@correo.co')
    const f = vi.fn(async () => new Response('{"message":"sender not verified"}', { status: 400 }))
    await expect(enviarCorreo(correo, f as typeof fetch)).rejects.toThrow('Brevo respondió 400')
  })
})
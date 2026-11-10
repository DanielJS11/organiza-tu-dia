import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ErrorIA, extraerJSON, generarJSON } from './cliente.js'

const esquema = z.object({ mensaje: z.string() })
const peticion = { sistema: 'sistema', mensaje: 'hola' }

// Respuestas falsas con la forma que devuelve cada proveedor
const deGemini = (texto: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'pensando…', thought: true }, { text: texto }] } }] }), { status: 200 })
const deGroq = (texto: string) => new Response(JSON.stringify({ choices: [{ message: { content: texto } }] }), { status: 200 })
const conError = (estado: number) => new Response('{}', { status: estado })

const ambas = { GEMINI_API_KEY: 'g', GROQ_API_KEY: 'q', GEMINI_MODELO: 'gemini-a' }
const rapido = { esperaReintentoMs: 0 }
const esGemini = (url: unknown) => String(url).includes('generativelanguage')

describe('extraer JSON de la respuesta', () => {
  it('acepta JSON envuelto en un bloque de código o con texto alrededor', () => {
    expect(extraerJSON('```json\n{"a": 1}\n```')).toEqual({ a: 1 })
    expect(extraerJSON('Claro: {"a": {"b": 2}} listo')).toEqual({ a: { b: 2 } })
  })

  it('falla si no hay JSON', () => {
    expect(() => extraerJSON('sin datos')).toThrow()
  })
})

describe('cliente de IA con respaldo', () => {
  it('usa Gemini cuando responde bien (e ignora sus "pensamientos")', async () => {
    const f = vi.fn(async () => deGemini('{"mensaje":"hola desde gemini"}'))
    const r = await generarJSON(peticion, esquema, { fetch: f as typeof fetch, env: ambas, ...rapido })
    expect(r).toEqual({ datos: { mensaje: 'hola desde gemini' }, proveedor: 'gemini' })
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('si Gemini se pasa del límite gratuito (429), responde Groq', async () => {
    const f = vi.fn(async (url: unknown) => (esGemini(url) ? conError(429) : deGroq('{"mensaje":"hola desde groq"}')))
    const r = await generarJSON(peticion, esquema, { fetch: f as typeof fetch, env: ambas, ...rapido })
    expect(r.proveedor).toBe('groq')
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('si Gemini responde con un formato que no sirve, también pasa a Groq', async () => {
    const f = vi.fn(async (url: unknown) => (esGemini(url) ? deGemini('{"otra":"cosa"}') : deGroq('{"mensaje":"ok"}')))
    const r = await generarJSON(peticion, esquema, { fetch: f as typeof fetch, env: ambas, ...rapido })
    expect(r).toEqual({ datos: { mensaje: 'ok' }, proveedor: 'groq' })
  })

  it('si Gemini no tiene clave, va directo a Groq', async () => {
    const f = vi.fn(async () => deGroq('{"mensaje":"ok"}'))
    const r = await generarJSON(peticion, esquema, { fetch: f as typeof fetch, env: { GROQ_API_KEY: 'q' } })
    expect(r.proveedor).toBe('groq')
    expect(String(f.mock.calls[0][0])).toContain('api.groq.com')
  })

  it('si Gemini está saturado (503) reintenta una vez y, si responde, no usa Groq', async () => {
    let llamadas = 0
    const f = vi.fn(async () => (++llamadas === 1 ? conError(503) : deGemini('{"mensaje":"al segundo intento"}')))
    const r = await generarJSON(peticion, esquema, { fetch: f as typeof fetch, env: ambas, ...rapido })
    expect(r).toEqual({ datos: { mensaje: 'al segundo intento' }, proveedor: 'gemini' })
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('prueba los modelos de Gemini en orden antes de pasar a Groq', async () => {
    const f = vi.fn(async (url: unknown) => (String(url).includes('modelo-saturado') ? conError(503) : deGemini('{"mensaje":"lite"}')))
    const env = { ...ambas, GEMINI_MODELO: 'modelo-saturado, modelo-lite' }
    const r = await generarJSON(peticion, esquema, { fetch: f as typeof fetch, env, ...rapido })
    expect(r.proveedor).toBe('gemini')
    // 2 intentos al saturado (con reintento) + 1 al lite
    expect(f.mock.calls.map((c) => String(c[0]).match(/models\/([^:]+)/)?.[1])).toEqual(['modelo-saturado', 'modelo-saturado', 'modelo-lite'])
  })

  it('si ninguno responde, lanza un error con un mensaje para el usuario', async () => {
    const f = vi.fn(async () => conError(500))
    await expect(generarJSON(peticion, esquema, { fetch: f as typeof fetch, env: ambas, ...rapido })).rejects.toThrow(
      new ErrorIA('La IA no está disponible en este momento. Intenta de nuevo en unos minutos.'),
    )
  })

  it('si no hay claves configuradas, lo dice sin llamar a nadie', async () => {
    const f = vi.fn()
    await expect(generarJSON(peticion, esquema, { fetch: f as typeof fetch, env: {} })).rejects.toThrow('La IA no está configurada en el servidor')
    expect(f).not.toHaveBeenCalled()
  })

  it('una falla de red en Gemini no detiene el respaldo', async () => {
    const f = vi.fn(async (url: unknown) => {
      if (esGemini(url)) throw new TypeError('fetch failed')
      return deGroq('{"mensaje":"ok"}')
    })
    const r = await generarJSON(peticion, esquema, { fetch: f as typeof fetch, env: ambas, ...rapido })
    expect(r.proveedor).toBe('groq')
  })
})
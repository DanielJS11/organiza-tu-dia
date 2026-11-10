// ─────────────────────────────────────────────────────────────
// Cliente de IA con respaldo
//
// Primero intenta con Google Gemini (con uno o varios modelos, en orden); si no está
// configurado, está saturado, se pasa del límite gratuito, tarda demasiado o responde
// algo que no sirve, intenta con Groq.
// Se usa fetch directamente (sin librerías extra) y siempre se pide JSON, que luego
// se valida con zod: así la página nunca muestra una respuesta mal formada.
// ─────────────────────────────────────────────────────────────

import type { ZodType } from 'zod'

export type Proveedor = 'gemini' | 'groq'

// Error con un mensaje que sí se le puede mostrar al usuario
export class ErrorIA extends Error {}

export type PeticionIA = { sistema: string; mensaje: string }

type Opciones = {
  fetch?: typeof fetch // se puede reemplazar en las pruebas
  env?: Record<string, string | undefined>
  esperaReintentoMs?: number
}

const TIEMPO_MAXIMO_MS = 30_000
// Si el primero está saturado se prueba el siguiente (Flash-Lite suele tener más capacidad libre)
const MODELOS_GEMINI = 'gemini-3.8-flash,gemini-3.5-flash-lite'
const MODELO_GROQ = 'openai/gpt-oss-120b'
const ESPERA_REINTENTO_MS = 1500

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

// "Gemini respondió 503: The model is overloaded…" (con el motivo, para entender qué pasó)
async function errorHTTP(nombre: string, respuesta: Response) {
  const detalle = await respuesta.text().catch(() => '')
  const motivo = detalle.match(/"message":\s*"([^"]+)"/)?.[1] ?? ''
  return new Error(`${nombre} respondió ${respuesta.status}${motivo ? `: ${motivo.slice(0, 150)}` : ''}`)
}

// Saca el objeto JSON de la respuesta aunque venga envuelto en ```json … ``` o con texto alrededor
export function extraerJSON(texto: string): unknown {
  const inicio = texto.indexOf('{')
  const fin = texto.lastIndexOf('}')
  if (inicio === -1 || fin <= inicio) throw new Error('La respuesta no contiene JSON')
  return JSON.parse(texto.slice(inicio, fin + 1))
}

async function llamarGemini(p: PeticionIA, clave: string, modelo: string, f: typeof fetch, espera: number) {
  const pedir = () =>
    f(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: p.sistema }] },
        contents: [{ role: 'user', parts: [{ text: p.mensaje }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    })
  let respuesta = await pedir()
  // 503 = modelo saturado en ese momento (pasa seguido en el plan gratuito): se reintenta una vez
  if (respuesta.status === 503) {
    await esperar(espera)
    respuesta = await pedir()
  }
  if (!respuesta.ok) throw await errorHTTP(`Gemini (${modelo})`, respuesta)
  const datos = (await respuesta.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] }
  const partes = datos.candidates?.[0]?.content?.parts ?? []
  const texto = partes.filter((parte) => !parte.thought && parte.text).map((parte) => parte.text).join('')
  if (!texto) throw new Error('Gemini no devolvió texto')
  return texto
}

async function llamarGroq(p: PeticionIA, clave: string, modelo: string, f: typeof fetch) {
  const respuesta = await f('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clave}` },
    body: JSON.stringify({
      model: modelo,
      messages: [
        { role: 'system', content: p.sistema },
        { role: 'user', content: p.mensaje },
      ],
      temperature: 0.7,
      max_completion_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
  })
  if (!respuesta.ok) throw await errorHTTP(`Groq (${modelo})`, respuesta)
  const datos = (await respuesta.json()) as { choices?: { message?: { content?: string } }[] }
  const texto = datos.choices?.[0]?.message?.content
  if (!texto) throw new Error('Groq no devolvió texto')
  return texto
}

/*
  Pide a la IA una respuesta en JSON y la valida con el esquema.
  Devuelve los datos y qué proveedor respondió. Si ninguno lo logra, lanza ErrorIA.
*/
export async function generarJSON<T>(peticion: PeticionIA, esquema: ZodType<T>, opciones: Opciones = {}) {
  const env = opciones.env ?? process.env
  const f = opciones.fetch ?? fetch

  const espera = opciones.esperaReintentoMs ?? ESPERA_REINTENTO_MS

  // GEMINI_MODELO puede tener varios modelos separados por comas: se prueban en ese orden
  const intentos: { proveedor: Proveedor; llamar: () => Promise<string> }[] = []
  if (env.GEMINI_API_KEY) {
    const modelos = (env.GEMINI_MODELO || MODELOS_GEMINI).split(',').map((m) => m.trim()).filter(Boolean)
    for (const modelo of modelos) {
      intentos.push({ proveedor: 'gemini', llamar: () => llamarGemini(peticion, env.GEMINI_API_KEY!, modelo, f, espera) })
    }
  }
  if (env.GROQ_API_KEY) {
    intentos.push({ proveedor: 'groq', llamar: () => llamarGroq(peticion, env.GROQ_API_KEY!, env.GROQ_MODELO || MODELO_GROQ, f) })
  }
  if (intentos.length === 0) throw new ErrorIA('La IA no está configurada en el servidor')

  for (const intento of intentos) {
    try {
      const resultado = esquema.safeParse(extraerJSON(await intento.llamar()))
      if (resultado.success) return { datos: resultado.data, proveedor: intento.proveedor }
      console.warn(`[IA] ${intento.proveedor} respondió con un formato inesperado`)
    } catch (error) {
      console.warn(`[IA] ${intento.proveedor} falló: ${(error as Error).message}`)
    }
  }
  throw new ErrorIA('La IA no está disponible en este momento. Intenta de nuevo en unos minutos.')
}
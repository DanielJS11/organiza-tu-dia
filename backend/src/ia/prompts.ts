// ─────────────────────────────────────────────────────────────
// Instrucciones (prompts) y formato de respuesta de cada uso de la IA
//
// La IA solo interpreta: los números (tiempos, conteos, desviaciones) los calcula
// el código y se le entregan ya hechos, para que no invente datos.
// Nunca se envían el nombre ni el correo del usuario.
// ─────────────────────────────────────────────────────────────

import { z } from 'zod'
import { formatearMinutos } from '../motor/planificador.js'
import type { EstadisticasSemana } from '../motor/semana.js'

const texto = (max: number) => z.string().trim().min(1).max(max)

const SISTEMA_BASE = `You are the companion of "Organize Your Day", an app that helps university students organize their time and reflect on how things went.
Rules:
- Always write in English, addressing the person as "you", with a warm, honest and concrete tone. No generic motivational phrases.
- Base everything ONLY on the data you are given. Do not invent tasks, hours or facts.
- Suggestions must be small, realistic actions about organization, studying or rest.
- Do not give medical or psychological diagnoses. If the person expresses strong distress, gently suggest talking to someone they trust or to their university's wellbeing service.
- Reply ONLY with a valid JSON object, with no text before or after it.`

// ─── Reflexión de un día ───────────────────────────────────

export const esquemaReflexion = z.object({
  observacion: texto(600),
  aprendizaje: texto(600),
  sugerencias: z.array(texto(300)).min(1).transform((lista) => lista.slice(0, 3)),
})
export type RespuestaReflexion = z.infer<typeof esquemaReflexion>

export type DatosReflexion = {
  dia: string // "Monday (Nov 9)"
  texto: string
  etiquetas: string[]
  completadas: { titulo: string; duracionEstimadaMin: number; tiempoRealMin: number | null }[]
  plan: { nombre: string; bloques: { titulo: string; horaInicio: string; tarea: { titulo: string; completada: boolean } | null }[] } | null
}

export function promptReflexion(d: DatosReflexion) {
  const completadas = d.completadas.length
    ? d.completadas
        .map((t) => `- ${t.titulo}: estimated at ${formatearMinutos(t.duracionEstimadaMin)}${t.tiempoRealMin !== null ? `, it took ${formatearMinutos(t.tiempoRealMin)}` : ''}`)
        .join('\n')
    : '- None'
  const plan = d.plan
    ? `${d.plan.nombre}\n${d.plan.bloques
        .map((b) => `- ${b.horaInicio} ${b.titulo}${b.tarea ? `: ${b.tarea.titulo} (${b.tarea.completada ? 'completed' : 'not completed'})` : ''}`)
        .join('\n')}`
    : 'They had no plan for that day.'

  return {
    sistema: `${SISTEMA_BASE}
Your task: read one day's journal entry and return a short reflection in this format:
{"observacion": "1 or 2 sentences about the most important thing of the day, connecting what they wrote with their data", "aprendizaje": "1 sentence with what they can learn from that day", "sugerencias": ["1 to 3 concrete actions for tomorrow"]}`,
    mensaje: `Day: ${d.dia}

Journal entry:
"""
${d.texto}
"""

Tags: ${d.etiquetas.length ? d.etiquetas.join(', ') : 'none'}

Tasks completed that day:
${completadas}

Plan for the day:
${plan}`,
  }
}

// ─── Resumen de la semana ──────────────────────────────────

export const esquemaSemana = z.object({
  resumen: texto(800),
  patrones: z.array(texto(300)).default([]).transform((lista) => lista.slice(0, 3)),
  recomendaciones: z.array(texto(300)).min(1).transform((lista) => lista.slice(0, 3)),
})
export type RespuestaSemana = z.infer<typeof esquemaSemana>

export function promptSemana(e: EstadisticasSemana, entradas: { dia: string; texto: string; etiquetas: string[] }[]) {
  const diario = entradas.length
    ? entradas.map((x) => `[${x.dia}]${x.etiquetas.length ? ` (${x.etiquetas.join(', ')})` : ''}\n${x.texto.slice(0, 1200)}`).join('\n\n')
    : 'They did not write in the journal this week.'

  return {
    sistema: `${SISTEMA_BASE}
Your task: review the person's last week and return:
{"resumen": "2 or 3 sentences about how their week went", "patrones": ["0 to 3 patterns that repeat in their data or their journal"], "recomendaciones": ["1 to 3 concrete recommendations for next week"]}
If the actual times usually exceed the estimates, recommend estimating with more margin; if they barely planned any days, recommend using a template.`,
    mensaje: `Week: ${e.desde} to ${e.hasta}

Data calculated by the app:
- Days with a plan: ${e.diasPlanificados} of 7
- Days with a journal entry: ${e.diasConEntrada} of 7
- Tasks completed: ${e.tareasCompletadas}
- Accuracy of estimates: ${e.descripcionPrecision}
- Most used tags: ${e.etiquetas.length ? e.etiquetas.map((x) => `${x.nombre} (${x.veces})`).join(', ') : 'none'}

Week's journal:
${diario}`,
  }
}

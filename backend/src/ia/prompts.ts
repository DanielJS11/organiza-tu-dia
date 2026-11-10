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

const SISTEMA_BASE = `Eres el acompañante de "Organiza tu día", una aplicación que ayuda a estudiantes universitarios a organizar su tiempo y a reflexionar sobre cómo les fue.
Reglas:
- Escribe en español, tuteando, con un tono cálido, honesto y concreto. Nada de frases genéricas de motivación.
- Básate SOLO en los datos que te dan. No inventes tareas, horas ni hechos.
- Las sugerencias deben ser acciones pequeñas y realistas sobre organización, estudio o descanso.
- No des diagnósticos médicos ni psicológicos. Si la persona expresa un malestar fuerte, sugiere con delicadeza hablar con alguien de confianza o con el servicio de bienestar de su universidad.
- Responde SOLO con un objeto JSON válido, sin texto antes ni después.`

// ─── Reflexión de un día ───────────────────────────────────

export const esquemaReflexion = z.object({
  observacion: texto(600),
  aprendizaje: texto(600),
  sugerencias: z.array(texto(300)).min(1).transform((lista) => lista.slice(0, 3)),
})
export type RespuestaReflexion = z.infer<typeof esquemaReflexion>

export type DatosReflexion = {
  dia: string // "lunes 9 de noviembre"
  texto: string
  etiquetas: string[]
  completadas: { titulo: string; duracionEstimadaMin: number; tiempoRealMin: number | null }[]
  plan: { nombre: string; bloques: { titulo: string; horaInicio: string; tarea: { titulo: string; completada: boolean } | null }[] } | null
}

export function promptReflexion(d: DatosReflexion) {
  const completadas = d.completadas.length
    ? d.completadas
        .map((t) => `- ${t.titulo}: estimada en ${formatearMinutos(t.duracionEstimadaMin)}${t.tiempoRealMin !== null ? `, le tomó ${formatearMinutos(t.tiempoRealMin)}` : ''}`)
        .join('\n')
    : '- Ninguna'
  const plan = d.plan
    ? `${d.plan.nombre}\n${d.plan.bloques
        .map((b) => `- ${b.horaInicio} ${b.titulo}${b.tarea ? `: ${b.tarea.titulo} (${b.tarea.completada ? 'completada' : 'no completada'})` : ''}`)
        .join('\n')}`
    : 'No tenía plan para ese día.'

  return {
    sistema: `${SISTEMA_BASE}
Tu tarea: leer la entrada del diario de un día y devolver una reflexión breve con este formato:
{"observacion": "1 o 2 frases sobre lo más importante del día, conectando lo que escribió con sus datos", "aprendizaje": "1 frase con lo que puede aprender de ese día", "sugerencias": ["1 a 3 acciones concretas para mañana"]}`,
    mensaje: `Día: ${d.dia}

Entrada del diario:
"""
${d.texto}
"""

Etiquetas: ${d.etiquetas.length ? d.etiquetas.join(', ') : 'ninguna'}

Tareas completadas ese día:
${completadas}

Plan del día:
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
    : 'No escribió en el diario esta semana.'

  return {
    sistema: `${SISTEMA_BASE}
Tu tarea: revisar la última semana de la persona y devolver:
{"resumen": "2 o 3 frases sobre cómo le fue en la semana", "patrones": ["0 a 3 patrones que se repiten en sus datos o en su diario"], "recomendaciones": ["1 a 3 recomendaciones concretas para la próxima semana"]}
Si los tiempos reales suelen superar lo estimado, recomiéndale estimar con más margen; si casi no planificó días, recomiéndale usar una plantilla.`,
    mensaje: `Semana: ${e.desde} a ${e.hasta}

Datos calculados por la aplicación:
- Días con plan: ${e.diasPlanificados} de 7
- Días con entrada en el diario: ${e.diasConEntrada} de 7
- Tareas completadas: ${e.tareasCompletadas}
- Precisión de las estimaciones: ${e.descripcionPrecision}
- Etiquetas más usadas: ${e.etiquetas.length ? e.etiquetas.map((x) => `${x.nombre} (${x.veces})`).join(', ') : 'ninguna'}

Diario de la semana:
${diario}`,
  }
}
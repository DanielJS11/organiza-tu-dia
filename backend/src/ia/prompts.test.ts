import { describe, expect, it } from 'vitest'
import { esquemaReflexion, promptReflexion, promptSemana } from './prompts.js'
import { calcularSemana } from '../motor/semana.js'

describe('instrucciones para la IA', () => {
  it('la reflexión incluye el texto, las tareas con sus tiempos y el plan, pero no datos personales', () => {
    const { sistema, mensaje } = promptReflexion({
      dia: 'Monday (Nov 9)',
      texto: 'Me costó concentrarme.',
      etiquetas: ['cansancio'],
      completadas: [{ titulo: 'Taller', duracionEstimadaMin: 60, tiempoRealMin: 90 }],
      plan: { nombre: 'Día de estudio', bloques: [{ titulo: 'Estudio', horaInicio: '08:00', tarea: { titulo: 'Ensayo', completada: false } }] },
    })
    expect(sistema).toContain('Reply ONLY with a valid JSON object')
    expect(mensaje).toContain('Me costó concentrarme.')
    expect(mensaje).toContain('- Taller: estimated at 1 h, it took 1 h 30 min')
    expect(mensaje).toContain('- 08:00 Estudio: Ensayo (not completed)')
    expect(mensaje).not.toMatch(/@|correo|nombre del usuario/i)
  })

  it('el resumen semanal le entrega a la IA los números ya calculados', () => {
    const e = calcularSemana({
      desde: '2026-11-04',
      hasta: '2026-11-10',
      diasPlanificados: 2,
      entradas: [{ etiquetas: ['enfoque'] }],
      completadas: [{ duracionEstimadaMin: 60, tiempoRealMin: 90 }],
    })
    const { mensaje } = promptSemana(e, [{ dia: 'Monday (Nov 9)', texto: 'Buen día', etiquetas: ['enfoque'] }])
    expect(mensaje).toContain('Days with a plan: 2 of 7')
    expect(mensaje).toContain('50% longer than estimated')
    expect(mensaje).toContain('[Monday (Nov 9)] (enfoque)')
  })

  it('el formato de la reflexión deja máximo 3 sugerencias y rechaza respuestas vacías', () => {
    const r = esquemaReflexion.parse({ observacion: 'a', aprendizaje: 'b', sugerencias: ['1', '2', '3', '4'] })
    expect(r.sugerencias).toHaveLength(3)
    expect(esquemaReflexion.safeParse({ observacion: '', aprendizaje: 'b', sugerencias: ['1'] }).success).toBe(false)
  })
})

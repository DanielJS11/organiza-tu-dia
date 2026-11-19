import { describe, expect, it } from 'vitest'
import { calcularSemana } from './semana.js'

const base = { desde: '2026-11-04', hasta: '2026-11-10', diasPlanificados: 3 }

describe('estadísticas de la semana', () => {
  it('compara estimado y real solo en las tareas que tienen tiempo real', () => {
    const e = calcularSemana({
      ...base,
      entradas: [],
      completadas: [
        { duracionEstimadaMin: 60, tiempoRealMin: 90 },
        { duracionEstimadaMin: 120, tiempoRealMin: 135 },
        { duracionEstimadaMin: 300, tiempoRealMin: null }, // no cuenta para la comparación
      ],
    })
    expect(e).toMatchObject({ tareasCompletadas: 3, conTiempoReal: 2, minutosEstimados: 180, minutosReales: 225, desviacionPct: 25 })
    expect(e.descripcionPrecision).toBe('Your tasks took 25% longer than estimated (3 h estimated, 3 h 45 min actual).')
  })

  it('dentro de ±10 % las estimaciones se consideran acertadas', () => {
    const e = calcularSemana({ ...base, entradas: [], completadas: [{ duracionEstimadaMin: 100, tiempoRealMin: 95 }] })
    expect(e.descripcionPrecision).toContain('Your estimates were accurate')
  })

  it('cuando tardas menos de lo estimado lo dice en positivo', () => {
    const e = calcularSemana({ ...base, entradas: [], completadas: [{ duracionEstimadaMin: 120, tiempoRealMin: 60 }] })
    expect(e.desviacionPct).toBe(-50)
    expect(e.descripcionPrecision).toContain('50% less time than estimated')
  })

  it('sin tiempos reales no inventa una comparación', () => {
    const e = calcularSemana({ ...base, entradas: [], completadas: [{ duracionEstimadaMin: 60, tiempoRealMin: null }] })
    expect(e.desviacionPct).toBeNull()
    expect(e.descripcionPrecision).toContain("can't be compared yet")
  })

  it('cuenta las entradas y ordena las etiquetas más usadas', () => {
    const e = calcularSemana({
      ...base,
      entradas: [{ etiquetas: ['enfoque', 'cansancio'] }, { etiquetas: ['cansancio'] }, { etiquetas: [] }],
      completadas: [],
    })
    expect(e.diasConEntrada).toBe(3)
    expect(e.etiquetas).toEqual([
      { nombre: 'cansancio', veces: 2 },
      { nombre: 'enfoque', veces: 1 },
    ])
  })
})

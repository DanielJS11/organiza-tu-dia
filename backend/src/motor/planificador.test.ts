import { describe, expect, it } from 'vitest'
import {
  analizarPrioridades,
  diasEntre,
  disponibleEntre,
  enZona,
  formatearMinutos,
  siguienteFecha,
  type ContextoMotor,
  type TareaMotor,
} from './planificador.js'

// Viernes 23 de octubre de 2026, 8:00 a. m. en Bogotá (13:00 UTC)
const AHORA = new Date('2026-10-23T13:00:00.000Z')

function contexto(cambios: Partial<ContextoMotor> = {}): ContextoMotor {
  return {
    ahora: AHORA,
    zonaHoraria: 'America/Bogota',
    jornada: { inicio: 8 * 60, fin: 22 * 60 },
    capacidadPorDefectoMin: 4 * 60, // 4 horas de trabajo por día
    diasPlanificados: new Map(),
    ...cambios,
  }
}

// Fecha de entrega en hora de Bogotá: entrega('2026-10-24', '23:59')
const entrega = (fecha: string, hora: string) => new Date(`${fecha}T${hora}:00-05:00`)

const tarea = (id: string, cambios: Partial<TareaMotor>): TareaMotor => ({
  id,
  titulo: id,
  prioridad: 'MEDIA',
  fechaEntrega: null,
  duracionEstimadaMin: 60,
  ...cambios,
})

describe('utilidades de tiempo', () => {
  it('convierte un instante a fecha y minuto en la zona del usuario', () => {
    expect(enZona(AHORA, 'America/Bogota')).toEqual({ fecha: '2026-10-23', minutos: 480 })
  })

  it('avanza fechas y cuenta días, incluso entre meses', () => {
    expect(siguienteFecha('2026-10-31')).toBe('2026-11-01')
    expect(diasEntre('2026-10-23', '2026-10-30')).toBe(7)
  })

  it('formatea minutos en horas legibles', () => {
    expect(formatearMinutos(45)).toBe('45 min')
    expect(formatearMinutos(120)).toBe('2 h')
    expect(formatearMinutos(150)).toBe('2 h 30 min')
  })
})

describe('tiempo disponible', () => {
  it('en días sin plan cuenta la capacidad por defecto de cada día', () => {
    // Hoy + mañana = 4 h + 4 h
    expect(disponibleEntre(AHORA, entrega('2026-10-24', '23:59'), contexto())).toBe(480)
  })

  it('en un día con plan cuenta solo sus bloques de trabajo', () => {
    const ctx = contexto({
      diasPlanificados: new Map([['2026-10-23', [{ inicio: 9 * 60, fin: 11 * 60 }, { inicio: 14 * 60, fin: 15 * 60 + 30 }]]]),
    })
    // Hoy tiene 2 h + 1 h 30 min de bloques de trabajo
    expect(disponibleEntre(AHORA, entrega('2026-10-23', '23:00'), ctx)).toBe(210)
  })

  it('no cuenta el tiempo que ya pasó ni el que queda después de la entrega', () => {
    const ctx = contexto({ ahora: new Date('2026-10-23T15:00:00-05:00'), capacidadPorDefectoMin: 14 * 60 })
    // De 3:00 p. m. a 6:00 p. m. del mismo día
    expect(disponibleEntre(ctx.ahora, entrega('2026-10-23', '18:00'), ctx)).toBe(180)
  })

  it('devuelve 0 si la entrega ya pasó', () => {
    expect(disponibleEntre(AHORA, entrega('2026-10-22', '10:00'), contexto())).toBe(0)
  })
})

describe('por dónde empezar', () => {
  it('caso de la propuesta: tres trabajos con distintas fechas y 4 h por día', () => {
    const tareas = [
      tarea('C', { fechaEntrega: entrega('2026-10-30', '23:59'), duracionEstimadaMin: 90, prioridad: 'BAJA' }),
      tarea('A', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 120, prioridad: 'MEDIA' }),
      tarea('B', { fechaEntrega: entrega('2026-10-26', '23:59'), duracionEstimadaMin: 180, prioridad: 'ALTA' }),
    ]
    const resultado = analizarPrioridades(tareas, contexto())

    expect(resultado.map((r) => r.tareaId)).toEqual(['A', 'B', 'C'])
    expect(resultado.every((r) => r.estado === 'a_tiempo')).toBe(true)
    expect(resultado[0].razon).toBe('Vence mañana y necesita 2 h; tienes 8 h disponibles hasta entonces.')
    // 4 días × 4 h = 16 h hasta la entrega de B, menos 2 h de A y 3 h de B
    expect(resultado[1].razon).toBe('Vence en 3 días y necesita 3 h; después de "A" aún te sobran 11 h.')
  })

  it('marca en riesgo una tarea que no cabe antes de su entrega', () => {
    const resultado = analizarPrioridades([tarea('X', { fechaEntrega: entrega('2026-10-23', '20:00'), duracionEstimadaMin: 300 })], contexto())
    expect(resultado[0].estado).toBe('en_riesgo')
    expect(resultado[0].razon).toContain('necesita 5 h y solo tienes 4 h')
  })

  it('cuando varias tareas juntas no caben, la que va después en el orden queda en riesgo', () => {
    const resultado = analizarPrioridades(
      [
        tarea('larga', { fechaEntrega: entrega('2026-10-23', '22:00'), duracionEstimadaMin: 180 }),
        tarea('corta', { fechaEntrega: entrega('2026-10-23', '22:00'), duracionEstimadaMin: 120 }),
      ],
      contexto(),
    )
    // Cada una cabe en 4 h, pero juntas suman 5 h. Vencen igual y tienen la misma prioridad: va primero la más corta
    expect(resultado.map((r) => [r.tareaId, r.estado])).toEqual([
      ['corta', 'a_tiempo'],
      ['larga', 'en_riesgo'],
    ])
    expect(resultado[1].razon).toBe(
      'Vence hoy y necesita 3 h, pero antes vas a hacer "corta": te faltarían 1 h. Puedes mover alguna fecha o dejar para después lo menos importante.',
    )
  })

  it('el resultado no depende del orden en que llegan las tareas (caso reportado)', () => {
    const a = tarea('Trabajo A', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 120 })
    const d = tarea('Trabajo D', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 900 })
    const b = tarea('Trabajo B', { fechaEntrega: entrega('2026-10-26', '23:59'), duracionEstimadaMin: 180, prioridad: 'ALTA' })

    const primero = analizarPrioridades([a, d, b], contexto())
    const segundo = analizarPrioridades([d, b, a], contexto())

    expect(primero).toEqual(segundo)
    expect(primero.map((r) => [r.tareaId, r.estado])).toEqual([
      ['Trabajo A', 'a_tiempo'], // vence igual que D pero es más corta: se hace primero y cabe
      ['Trabajo D', 'en_riesgo'], // imposible: 15 h con solo 8 h disponibles
      ['Trabajo B', 'a_tiempo'], // lo que no cabía de D no se le cobra a B
    ])
  })

  it('lo que no cabe de una tarea no se arrastra a las siguientes (caso B reportado)', () => {
    const resultado = analizarPrioridades(
      [
        tarea('A', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 120 }),
        tarea('D', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 900 }),
        tarea('B', { fechaEntrega: entrega('2026-10-26', '23:59'), duracionEstimadaMin: 180 }),
      ],
      contexto(),
    )
    // Hasta el 24 hay 8 h: se gastan en A (2 h) y en lo que se pueda de D (6 h). Hasta el 26 hay 16 h: 16 − 8 − 3 = 5 h
    const b = resultado.find((r) => r.tareaId === 'B')!
    expect(b.holguraMin).toBe(300)
    expect(b.razon).toBe('Vence en 3 días y necesita 3 h; después de "A" y "D" aún te sobran 5 h.')
    // Solo D necesita atención
    expect(resultado.filter((r) => r.estado === 'en_riesgo').map((r) => r.tareaId)).toEqual(['D'])
  })

  it('los estados siguen el orden de la lista: una tarea que vence antes no se ve afectada por las de después', () => {
    const resultado = analizarPrioridades(
      [
        tarea('tarde', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 900 }),
        tarea('temprano', { fechaEntrega: entrega('2026-10-23', '12:00'), duracionEstimadaMin: 120 }),
      ],
      contexto(),
    )
    expect(resultado.map((r) => [r.tareaId, r.estado])).toEqual([
      ['temprano', 'a_tiempo'],
      ['tarde', 'en_riesgo'],
    ])
  })

  it('marca como ajustada una tarea con menos de 2 h de margen y dice qué tarea se lo quita', () => {
    const resultado = analizarPrioridades(
      [
        // Hasta hoy a mediodía: 4 h de trabajo
        tarea('primera', { fechaEntrega: entrega('2026-10-23', '12:00'), duracionEstimadaMin: 120 }),
        // Hasta mañana a las 10:00 a. m.: 4 h de hoy + 2 h de mañana = 6 h
        tarea('segunda', { fechaEntrega: entrega('2026-10-24', '10:00'), duracionEstimadaMin: 180 }),
      ],
      contexto(),
    )
    expect(resultado[1].estado).toBe('ajustada')
    expect(resultado[1].holguraMin).toBe(60)
    expect(resultado[1].razon).toBe('Vence mañana y necesita 3 h. Después de "primera" te queda un margen corto: 1 h.')
  })

  it('pone primero las vencidas y no las cuenta contra el tiempo futuro', () => {
    const resultado = analizarPrioridades(
      [
        tarea('futura', { fechaEntrega: entrega('2026-10-23', '22:00'), duracionEstimadaMin: 180 }),
        tarea('vencida', { fechaEntrega: entrega('2026-10-22', '10:00'), duracionEstimadaMin: 600 }),
      ],
      contexto(),
    )
    expect(resultado.map((r) => [r.tareaId, r.estado])).toEqual([
      ['vencida', 'vencida'],
      ['futura', 'ajustada'],
    ])
  })

  it('si dos tareas vencen al mismo tiempo, va primero la de mayor prioridad', () => {
    const misma = entrega('2026-10-30', '23:59')
    const resultado = analizarPrioridades(
      [
        tarea('baja', { fechaEntrega: misma, duracionEstimadaMin: 30, prioridad: 'BAJA' }),
        tarea('alta', { fechaEntrega: misma, duracionEstimadaMin: 300, prioridad: 'ALTA' }),
      ],
      contexto(),
    )
    expect(resultado.map((r) => r.tareaId)).toEqual(['alta', 'baja'])
  })

  it('si entre dos entregas no hay tiempo de trabajo, decide la prioridad (otro caso reportado)', () => {
    // Hoy tiene plan con bloques de trabajo de 9:00 a. m. a 4:15 p. m.: después de esa hora no hay tiempo de trabajo
    const ctx = contexto({ diasPlanificados: new Map([['2026-10-23', [{ inicio: 9 * 60, fin: 16 * 60 + 15 }]]]) })
    const resultado = analizarPrioridades(
      [
        tarea('Tarea mendez', { fechaEntrega: entrega('2026-10-23', '18:00'), duracionEstimadaMin: 60, prioridad: 'BAJA' }),
        tarea('Tarea Bussiness', { fechaEntrega: entrega('2026-10-23', '23:59'), duracionEstimadaMin: 240, prioridad: 'MEDIA' }),
        tarea('Tarea Trabajo', { fechaEntrega: entrega('2026-10-23', '15:15'), duracionEstimadaMin: 60, prioridad: 'ALTA' }),
      ],
      ctx,
    )
    // "mendez" vence antes que "Bussiness", pero las dos tienen las mismas 7 h 15 min de trabajo: va primero la de mayor prioridad
    expect(resultado.map((r) => [r.tareaId, r.estado])).toEqual([
      ['Tarea Trabajo', 'a_tiempo'],
      ['Tarea Bussiness', 'a_tiempo'],
      ['Tarea mendez', 'ajustada'],
    ])
  })

  it('si el margen es exactamente cero dice que cabe justo', () => {
    const resultado = analizarPrioridades([tarea('X', { fechaEntrega: entrega('2026-10-23', '22:00'), duracionEstimadaMin: 240 })], contexto())
    expect(resultado[0].estado).toBe('ajustada')
    expect(resultado[0].razon).toBe('Vence hoy y necesita 4 h. Cabe justo, sin tiempo de sobra.')
  })

  it('deja al final las tareas sin fecha, ordenadas por prioridad', () => {
    const resultado = analizarPrioridades(
      [
        tarea('sinfecha-baja', { prioridad: 'BAJA' }),
        tarea('confecha', { fechaEntrega: entrega('2026-11-20', '23:59') }),
        tarea('sinfecha-alta', { prioridad: 'ALTA' }),
      ],
      contexto(),
    )
    expect(resultado.map((r) => r.tareaId)).toEqual(['confecha', 'sinfecha-alta', 'sinfecha-baja'])
    expect(resultado[1].estado).toBe('sin_fecha')
    expect(resultado.map((r) => r.orden)).toEqual([1, 2, 3])
  })

  it('con más de dos tareas anteriores las menciona por cantidad', () => {
    const dia = (d: string) => entrega(d, '23:59')
    const resultado = analizarPrioridades(
      [
        tarea('uno', { fechaEntrega: dia('2026-10-23'), duracionEstimadaMin: 60 }),
        tarea('dos', { fechaEntrega: dia('2026-10-24'), duracionEstimadaMin: 60 }),
        tarea('tres', { fechaEntrega: dia('2026-10-25'), duracionEstimadaMin: 60 }),
        tarea('cuatro', { fechaEntrega: dia('2026-10-30'), duracionEstimadaMin: 60 }),
      ],
      contexto(),
    )
    expect(resultado[3].razon).toContain('después de las 3 tareas anteriores')
  })
})
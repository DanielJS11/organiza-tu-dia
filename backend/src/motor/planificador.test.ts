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

// Para que las cuentas sean fáciles: jornada de 8:00 a. m. a 4:00 p. m. (8 h) con 4 h de trabajo,
// es decir, 30 min de trabajo por cada hora de reloj en los días sin plan
function contexto(cambios: Partial<ContextoMotor> = {}): ContextoMotor {
  return {
    ahora: AHORA,
    zonaHoraria: 'America/Bogota',
    jornada: { inicio: 8 * 60, fin: 16 * 60 },
    capacidadPorDefectoMin: 4 * 60,
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

const resumen = (r: ReturnType<typeof analizarPrioridades>) => r.map((x) => [x.tareaId, x.estado, x.orden])

describe('utilidades de tiempo', () => {
  it('convierte un instante a fecha y minuto en la zona del usuario', () => {
    expect(enZona(AHORA, 'America/Bogota')).toEqual({ fecha: '2026-10-23', minutos: 480 })
  })

  it('avanza fechas y cuenta días, incluso entre meses', () => {
    expect(siguienteFecha('2026-10-31')).toBe('2026-11-01')
    expect(diasEntre('2026-10-23', '2026-10-30')).toBe(7)
  })

  it('formatea minutos en horas legibles y redondea', () => {
    expect(formatearMinutos(45)).toBe('45 min')
    expect(formatearMinutos(120)).toBe('2 h')
    expect(formatearMinutos(150.4)).toBe('2 h 30 min')
  })
})

describe('regla 1: tiempo disponible realista', () => {
  it('en un día sin plan reparte la capacidad a lo largo de la jornada', () => {
    // De 8:00 a. m. a 12:00 m. es la mitad de la jornada → la mitad de las 4 h
    expect(disponibleEntre(AHORA, entrega('2026-10-23', '12:00'), contexto())).toBe(120)
    // Todo el día → 4 h; hoy + mañana → 8 h
    expect(disponibleEntre(AHORA, entrega('2026-10-23', '23:59'), contexto())).toBe(240)
    expect(disponibleEntre(AHORA, entrega('2026-10-24', '23:59'), contexto())).toBe(480)
  })

  it('no cuenta el tiempo que ya pasó', () => {
    const ctx = contexto({ ahora: new Date('2026-10-23T14:00:00-05:00') })
    // De 2:00 p. m. a 4:00 p. m. → 2 h de reloj → 1 h de trabajo
    expect(disponibleEntre(ctx.ahora, entrega('2026-10-23', '23:59'), ctx)).toBe(60)
  })

  it('en un día con plan cuenta solo sus bloques de trabajo', () => {
    const ctx = contexto({
      diasPlanificados: new Map([['2026-10-23', [{ inicio: 9 * 60, fin: 11 * 60 }, { inicio: 14 * 60, fin: 15 * 60 + 30 }]]]),
    })
    expect(disponibleEntre(AHORA, entrega('2026-10-23', '23:00'), ctx)).toBe(210)
    // Hasta las 10:00 a. m. solo alcanza a contar 1 h del primer bloque
    expect(disponibleEntre(AHORA, entrega('2026-10-23', '10:00'), ctx)).toBe(60)
  })

  it('devuelve 0 si la entrega ya pasó o la jornada no es válida', () => {
    expect(disponibleEntre(AHORA, entrega('2026-10-22', '10:00'), contexto())).toBe(0)
    expect(disponibleEntre(AHORA, entrega('2026-10-23', '23:00'), contexto({ jornada: { inicio: 600, fin: 600 } }))).toBe(0)
  })
})

describe('regla 3: orden sugerido por entregas', () => {
  it('caso de la propuesta: tres trabajos con distintas fechas', () => {
    const resultado = analizarPrioridades(
      [
        tarea('C', { fechaEntrega: entrega('2026-10-30', '23:59'), duracionEstimadaMin: 90, prioridad: 'BAJA' }),
        tarea('A', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 120, prioridad: 'MEDIA' }),
        tarea('B', { fechaEntrega: entrega('2026-10-26', '23:59'), duracionEstimadaMin: 180, prioridad: 'ALTA' }),
      ],
      contexto(),
    )
    expect(resumen(resultado)).toEqual([
      ['A', 'a_tiempo', 1],
      ['B', 'a_tiempo', 2],
      ['C', 'a_tiempo', 3],
    ])
    expect(resultado[0].razon).toBe('Vence mañana y necesita 2 h; tienes 8 h de trabajo hasta entonces.')
    // Hasta el 26 hay 4 días × 4 h = 16 h; menos 2 h de A y 3 h de B
    expect(resultado[1].razon).toBe('Vence en 3 días y necesita 3 h; después de "A" aún te sobran 11 h.')
  })

  it('una entrega al mediodía va antes que una a medianoche del mismo día', () => {
    const resultado = analizarPrioridades(
      [
        tarea('noche', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 60, prioridad: 'ALTA' }),
        tarea('mediodia', { fechaEntrega: entrega('2026-10-24', '12:00'), duracionEstimadaMin: 60, prioridad: 'BAJA' }),
      ],
      contexto(),
    )
    expect(resultado.map((r) => r.tareaId)).toEqual(['mediodia', 'noche'])
  })

  it('si vencen al mismo tiempo va primero la de mayor prioridad', () => {
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

  it('el resultado no depende del orden en que llegan las tareas', () => {
    const tareas = [
      tarea('A', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 120 }),
      tarea('D', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 900 }),
      tarea('B', { fechaEntrega: entrega('2026-10-26', '23:59'), duracionEstimadaMin: 180, prioridad: 'ALTA' }),
      tarea('E', { fechaEntrega: entrega('2026-10-24', '12:00'), duracionEstimadaMin: 60, prioridad: 'BAJA' }),
    ]
    expect(analizarPrioridades(tareas, contexto())).toEqual(analizarPrioridades([...tareas].reverse(), contexto()))
  })
})

describe('margen', () => {
  it('margen corto si sobra menos de 1 h', () => {
    const resultado = analizarPrioridades(
      [tarea('X', { fechaEntrega: entrega('2026-10-23', '23:59'), duracionEstimadaMin: 200 })],
      contexto(),
    )
    expect(resultado[0].estado).toBe('ajustada')
    expect(resultado[0].razon).toBe('Vence hoy y necesita 3 h 20 min. Te queda un margen corto: 40 min.')
  })

  it('margen corto si sobra menos del 25 % de lo que dura la tarea', () => {
    // 10 h de tarea y 12 h disponibles: sobran 2 h, que es menos de 2 h 30 min (25 %)
    const resultado = analizarPrioridades(
      [tarea('larga', { fechaEntrega: entrega('2026-10-25', '23:59'), duracionEstimadaMin: 600 })],
      contexto(),
    )
    expect(resultado[0].estado).toBe('ajustada')
    // La misma holgura para una tarea corta sí es suficiente
    const corta = analizarPrioridades(
      [tarea('corta', { fechaEntrega: entrega('2026-10-23', '23:59'), duracionEstimadaMin: 120 })],
      contexto(),
    )
    expect(corta[0].estado).toBe('a_tiempo')
  })

  it('si el margen es cero dice que cabe justo y nombra las tareas que van antes', () => {
    const resultado = analizarPrioridades(
      [
        tarea('primera', { fechaEntrega: entrega('2026-10-23', '12:00'), duracionEstimadaMin: 60 }),
        tarea('segunda', { fechaEntrega: entrega('2026-10-23', '23:59'), duracionEstimadaMin: 180 }),
      ],
      contexto(),
    )
    expect(resultado[1].razon).toBe('Vence hoy y necesita 3 h. Después de "primera" cabe justo, sin tiempo de sobra.')
  })
})

describe('regla 2: si no alcanza para todo, se protege lo más importante', () => {
  it('una tarea imposible por sí sola va a "necesitan una decisión" y no le quita tiempo a las demás', () => {
    const resultado = analizarPrioridades(
      [
        tarea('A', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 120 }),
        tarea('D', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 900, prioridad: 'ALTA' }),
        tarea('B', { fechaEntrega: entrega('2026-10-26', '23:59'), duracionEstimadaMin: 180 }),
      ],
      contexto(),
    )
    expect(resumen(resultado)).toEqual([
      ['D', 'no_alcanza', null],
      ['A', 'a_tiempo', 1],
      ['B', 'a_tiempo', 2],
    ])
    expect(resultado[0].razon).toContain('Aunque le dediques todo tu tiempo no alcanza')
    expect(resultado[0].razon).toContain('necesita 15 h y hasta su entrega solo tienes 8 h de trabajo')
  })

  it('cuando no caben todas, sale la de menor prioridad aunque venza antes', () => {
    const resultado = analizarPrioridades(
      [
        tarea('baja-hoy', { fechaEntrega: entrega('2026-10-23', '23:59'), duracionEstimadaMin: 60, prioridad: 'BAJA' }),
        tarea('alta-mañana', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 240, prioridad: 'ALTA' }),
        tarea('media-mañana', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 240, prioridad: 'MEDIA' }),
      ],
      contexto(),
    )
    // Hasta mañana hay 8 h y las tres piden 9 h: se protege lo importante
    expect(resumen(resultado)).toEqual([
      ['baja-hoy', 'no_alcanza', null],
      ['alta-mañana', 'a_tiempo', 1],
      ['media-mañana', 'ajustada', 2], // 8 h − 4 h − 4 h = cabe justo
    ])
    expect(resultado[0].razon).toBe(
      'No alcanza junto con "alta-mañana" y "media-mañana": hasta mañana tienes 8 h de trabajo y entre todas piden 9 h. Se deja por fuera porque es la de menor prioridad. Puedes mover su fecha o reducirla.',
    )
  })

  it('con la misma prioridad sale la más larga', () => {
    const resultado = analizarPrioridades(
      [
        tarea('larga', { fechaEntrega: entrega('2026-10-23', '23:59'), duracionEstimadaMin: 180 }),
        tarea('corta', { fechaEntrega: entrega('2026-10-23', '23:59'), duracionEstimadaMin: 120 }),
      ],
      contexto(),
    )
    expect(resumen(resultado)).toEqual([
      ['larga', 'no_alcanza', null],
      ['corta', 'a_tiempo', 1],
    ])
    expect(resultado[0].razon).toContain('hasta la entrega de hoy tienes 4 h de trabajo y entre todas piden 5 h')
    expect(resultado[0].razon).toContain('es la más larga entre las de su misma prioridad')
  })

  it('una tarea de alta prioridad no se sacrifica por una de menor prioridad', () => {
    const resultado = analizarPrioridades(
      [
        tarea('alta', { fechaEntrega: entrega('2026-10-23', '23:59'), duracionEstimadaMin: 180, prioridad: 'ALTA' }),
        tarea('baja-corta', { fechaEntrega: entrega('2026-10-23', '23:59'), duracionEstimadaMin: 90, prioridad: 'BAJA' }),
      ],
      contexto(),
    )
    expect(resultado.find((r) => r.tareaId === 'alta')!.estado).toBe('a_tiempo')
    expect(resultado.find((r) => r.tareaId === 'baja-corta')!.estado).toBe('no_alcanza')
  })

  it('caso de 3 tareas para hoy con plan: se protegen la alta y la media', () => {
    // Plan de hoy con 5 h de bloques de trabajo
    const ctx = contexto({
      diasPlanificados: new Map([['2026-10-23', [{ inicio: 540, fin: 660 }, { inicio: 690, fin: 780 }, { inicio: 840, fin: 930 }]]]),
    })
    const resultado = analizarPrioridades(
      [
        tarea('Tarea mendez', { fechaEntrega: entrega('2026-10-23', '18:00'), duracionEstimadaMin: 60, prioridad: 'BAJA' }),
        tarea('Tarea Bussiness', { fechaEntrega: entrega('2026-10-23', '23:59'), duracionEstimadaMin: 240, prioridad: 'MEDIA' }),
        tarea('Tarea Trabajo', { fechaEntrega: entrega('2026-10-23', '14:00'), duracionEstimadaMin: 60, prioridad: 'ALTA' }),
      ],
      ctx,
    )
    expect(resumen(resultado)).toEqual([
      ['Tarea mendez', 'no_alcanza', null],
      ['Tarea Trabajo', 'a_tiempo', 1],
      ['Tarea Bussiness', 'ajustada', 2],
    ])
  })

  it('explica el conflicto en días cuando la entrega es más adelante', () => {
    const resultado = analizarPrioridades(
      [
        tarea('diez', { fechaEntrega: entrega('2026-10-26', '23:59'), duracionEstimadaMin: 600 }),
        tarea('ocho', { fechaEntrega: entrega('2026-10-26', '23:59'), duracionEstimadaMin: 480 }),
      ],
      contexto(),
    )
    expect(resultado[0].razon).toContain('en los próximos 3 días tienes 16 h de trabajo y entre todas piden 18 h')
  })

  it('con más de dos tareas en conflicto las menciona por cantidad', () => {
    const hoy = entrega('2026-10-23', '23:59')
    const resultado = analizarPrioridades(
      [
        tarea('a', { fechaEntrega: hoy, duracionEstimadaMin: 60, prioridad: 'ALTA' }),
        tarea('b', { fechaEntrega: hoy, duracionEstimadaMin: 60, prioridad: 'ALTA' }),
        tarea('c', { fechaEntrega: hoy, duracionEstimadaMin: 60, prioridad: 'ALTA' }),
        tarea('d', { fechaEntrega: hoy, duracionEstimadaMin: 90, prioridad: 'BAJA' }),
      ],
      contexto(),
    )
    expect(resultado[0].razon).toContain('No alcanza junto con otras 3 tareas')
  })
})

describe('vencidas y sin fecha', () => {
  it('las vencidas van primero y no consumen tiempo futuro', () => {
    const resultado = analizarPrioridades(
      [
        tarea('futura', { fechaEntrega: entrega('2026-10-23', '23:59'), duracionEstimadaMin: 120 }),
        tarea('vencida', { fechaEntrega: entrega('2026-10-22', '10:00'), duracionEstimadaMin: 600 }),
      ],
      contexto(),
    )
    expect(resumen(resultado)).toEqual([
      ['vencida', 'vencida', null],
      ['futura', 'a_tiempo', 1],
    ])
    expect(resultado[0].razon).toContain('Decide si aún la haces')
  })

  it('las tareas sin fecha van al final, por prioridad y sin número de orden', () => {
    const resultado = analizarPrioridades(
      [
        tarea('sinfecha-baja', { prioridad: 'BAJA' }),
        tarea('confecha', { fechaEntrega: entrega('2026-11-20', '23:59') }),
        tarea('sinfecha-alta', { prioridad: 'ALTA' }),
      ],
      contexto(),
    )
    expect(resumen(resultado)).toEqual([
      ['confecha', 'a_tiempo', 1],
      ['sinfecha-alta', 'sin_fecha', null],
      ['sinfecha-baja', 'sin_fecha', null],
    ])
  })
})
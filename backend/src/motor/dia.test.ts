import { describe, expect, it } from 'vitest'
import {
  analizarCargaDia,
  avisosSinTiempo,
  instanteEnZona,
  minutosPorTarea,
  proponerDistribucion,
  proponerVariosDias,
  type BloqueDia,
} from './dia.js'
import type { TareaMotor } from './planificador.js'

const bloque = (id: string, tipo: BloqueDia['tipo'], horaInicio: string, horaFin: string, tareaId: string | null = null): BloqueDia => ({
  id,
  tipo,
  titulo: id,
  horaInicio,
  horaFin,
  tareaId,
})

const tarea = (id: string, cambios: Partial<TareaMotor> = {}): TareaMotor => ({
  id,
  titulo: id,
  prioridad: 'MEDIA',
  fechaEntrega: null,
  duracionEstimadaMin: 60,
  ...cambios,
})

const entrega = (fecha: string, hora: string) => new Date(`${fecha}T${hora}:00-05:00`)

// Un día tipo: 2 h de estudio, almuerzo, 2 h de trabajo y 1 h personal
const DIA: BloqueDia[] = [
  bloque('estudio', 'ESTUDIO', '08:00', '10:00'),
  bloque('almuerzo', 'PERSONAL', '12:00', '13:00'),
  bloque('trabajo', 'TRABAJO', '14:00', '16:00'),
  bloque('libre', 'PERSONAL', '18:00', '19:00'),
]

describe('instante en la zona del usuario', () => {
  it('convierte fecha y hora de Bogotá al instante correcto', () => {
    expect(instanteEnZona('2026-10-23', 8 * 60, 'America/Bogota').toISOString()).toBe('2026-10-23T13:00:00.000Z')
  })
})

describe('sobrecarga del día', () => {
  it('sin sobrecarga cuando lo ubicado cabe en los bloques de trabajo', () => {
    const dia = [bloque('estudio', 'ESTUDIO', '08:00', '10:00', 'A'), DIA[1], bloque('trabajo', 'TRABAJO', '14:00', '16:00', 'B'), DIA[3]]
    const carga = analizarCargaDia(dia, [tarea('A', { duracionEstimadaMin: 120 }), tarea('B', { duracionEstimadaMin: 90 })])
    expect(carga).toMatchObject({ capacidadMin: 240, necesitanMin: 210, excesoMin: 0, tareasUbicadas: 2, mensaje: null })
  })

  it('avisa cuánto se pasa y sugiere mover la de menor prioridad', () => {
    const dia = [bloque('estudio', 'ESTUDIO', '08:00', '10:00', 'A'), DIA[1], bloque('trabajo', 'TRABAJO', '14:00', '16:00', 'B'), DIA[3]]
    const carga = analizarCargaDia(dia, [
      tarea('A', { duracionEstimadaMin: 240, prioridad: 'ALTA' }),
      tarea('B', { duracionEstimadaMin: 120, prioridad: 'BAJA' }),
    ])
    expect(carga.excesoMin).toBe(120)
    expect(carga.moverIds).toEqual(['B'])
    expect(carga.mensaje).toBe(
      'Las tareas que ubicaste necesitan 6 h y tus bloques de trabajo suman 4 h: te pasas por 2 h. Para que el día sea realista podrías mover "B" a otro día. Si solo vas a avanzar una parte, puedes dejarlo así.',
    )
  })

  it('con la misma prioridad sugiere mover la que vence más tarde, y sin fecha antes que con fecha', () => {
    const dia = [
      bloque('b1', 'ESTUDIO', '08:00', '09:00', 'pronto'),
      bloque('b2', 'ESTUDIO', '09:00', '10:00', 'tarde'),
      bloque('b3', 'ESTUDIO', '10:00', '11:00', 'sinfecha'),
    ]
    const carga = analizarCargaDia(dia, [
      tarea('pronto', { fechaEntrega: entrega('2026-10-24', '23:59'), duracionEstimadaMin: 120 }),
      tarea('tarde', { fechaEntrega: entrega('2026-10-30', '23:59'), duracionEstimadaMin: 120 }),
      tarea('sinfecha', { duracionEstimadaMin: 120 }),
    ])
    expect(carga.excesoMin).toBe(180)
    expect(carga.moverIds).toEqual(['sinfecha', 'tarde'])
    expect(carga.mensaje).toContain('podrías mover "sinfecha" y "tarde" a otro día')
  })

  it('cuenta una tarea una sola vez aunque esté en varios bloques, e ignora las completadas', () => {
    const dia = [bloque('b1', 'ESTUDIO', '08:00', '10:00', 'A'), bloque('b2', 'TRABAJO', '14:00', '16:00', 'A'), bloque('b3', 'PERSONAL', '18:00', '19:00', 'hecha')]
    // "hecha" no está entre las pendientes; su bloque personal sí cuenta como tiempo porque tiene tarea
    const carga = analizarCargaDia(dia, [tarea('A', { duracionEstimadaMin: 240 })])
    expect(carga).toMatchObject({ capacidadMin: 300, necesitanMin: 240, tareasUbicadas: 1, excesoMin: 0 })
  })

  it('si el día es hoy, solo cuenta el tiempo que no ha pasado', () => {
    const dia = [bloque('estudio', 'ESTUDIO', '08:00', '10:00', 'A'), DIA[1], DIA[2], DIA[3]]
    // A las 9:00 a. m. queda 1 h de estudio y 2 h de trabajo
    const carga = analizarCargaDia(dia, [tarea('A', { duracionEstimadaMin: 240 })], 9 * 60)
    expect(carga.capacidadMin).toBe(180)
    expect(carga.excesoMin).toBe(60)
  })

  it('con más de dos tareas para mover las lista separadas por comas', () => {
    const dia = [bloque('b1', 'ESTUDIO', '08:00', '08:30', 'x'), bloque('b2', 'PERSONAL', '09:00', '09:30', 'y'), bloque('b3', 'PERSONAL', '10:00', '10:30', 'z')]
    const carga = analizarCargaDia(dia, [tarea('x', { duracionEstimadaMin: 100 }), tarea('y', { duracionEstimadaMin: 100 }), tarea('z', { duracionEstimadaMin: 100 })])
    expect(carga.mensaje).toContain('"x", "y" y "z"')
  })
})

describe('sobrecarga con tiempo planeado en días anteriores', () => {
  it('a cada tarea solo le cuenta lo que le falta después de los días anteriores', () => {
    const dia = [bloque('b1', 'ESTUDIO', '08:00', '10:00', 'A'), bloque('b2', 'ESTUDIO', '10:00', '12:00', 'B')]
    // A pide 3 h pero ya tiene 2 h planeadas ayer → aquí solo pide 1 h
    const carga = analizarCargaDia(dia, [tarea('A', { duracionEstimadaMin: 180 }), tarea('B', { duracionEstimadaMin: 120 })], 0, new Map([['A', 120]]))
    expect(carga).toMatchObject({ necesitanMin: 180, excesoMin: 0, cubiertasIds: [], nota: null })
  })

  it('avisa que una tarea ya cubierta en días anteriores deja su bloque libre', () => {
    const dia = [bloque('b1', 'ESTUDIO', '08:00', '10:00', 'Ensayo'), bloque('b2', 'ESTUDIO', '10:15', '12:00', 'Ensayo')]
    const carga = analizarCargaDia(dia, [tarea('Ensayo', { duracionEstimadaMin: 180 })], 0, new Map([['Ensayo', 225]]))
    expect(carga.necesitanMin).toBe(0)
    expect(carga.cubiertasIds).toEqual(['Ensayo'])
    expect(carga.nota).toBe(
      '"Ensayo" ya tiene todo su tiempo estimado planeado en días anteriores: el bloque que le diste aquí te queda libre para otra cosa.',
    )
  })

  it('una tarea cubierta no se sugiere mover: no pide tiempo en el día', () => {
    const dia = [bloque('b1', 'ESTUDIO', '08:00', '09:00', 'cubierta'), bloque('b2', 'ESTUDIO', '09:00', '10:00', 'grande')]
    const carga = analizarCargaDia(
      dia,
      [tarea('cubierta', { prioridad: 'BAJA' }), tarea('grande', { duracionEstimadaMin: 240, prioridad: 'ALTA' })],
      0,
      new Map([['cubierta', 60]]),
    )
    expect(carga.excesoMin).toBe(120)
    expect(carga.moverIds).toEqual(['grande'])
  })

  it('una tarea repartida en varios días solo pide aquí lo que no está en los demás', () => {
    // Ensayo de 5 h: 1 h 30 min hoy y 3 h 45 min otro día después → hoy no se pasa
    const dia = [bloque('b1', 'ESTUDIO', '08:00', '10:00', 'pres'), bloque('b2', 'ESTUDIO', '15:30', '17:00', 'ensayo')]
    const carga = analizarCargaDia(
      dia,
      [tarea('pres', { duracionEstimadaMin: 120 }), tarea('ensayo', { duracionEstimadaMin: 300 })],
      0,
      new Map(),
      new Map([['ensayo', 225]]),
    )
    expect(carga).toMatchObject({ necesitanMin: 195, excesoMin: 0, cubiertasIds: [], nota: null })
  })

  it('si está duplicada en un día posterior, este día no la marca como cubierta', () => {
    const dia = [bloque('b1', 'ESTUDIO', '08:00', '11:45', 'ensayo')]
    const carga = analizarCargaDia(dia, [tarea('ensayo', { duracionEstimadaMin: 180 })], 0, new Map(), new Map([['ensayo', 225]]))
    expect(carga).toMatchObject({ necesitanMin: 0, cubiertasIds: [], nota: null })
  })

  it('una tarea que puede esperar solo pide aquí el tiempo de sus bloques', () => {
    // Proyecto de 6 h con entrega en dos días: hoy tiene 2 h; las otras 4 h son asunto de la semana
    const dia = [bloque('b1', 'ESTUDIO', '08:00', '10:00', 'proyecto'), bloque('b2', 'ESTUDIO', '10:00', '12:00', 'urgente')]
    const tareas = [tarea('proyecto', { duracionEstimadaMin: 360 }), tarea('urgente', { duracionEstimadaMin: 300 })]
    const carga = analizarCargaDia(dia, tareas, 0, new Map(), new Map(), new Set(['proyecto']))
    // "urgente" vence hoy: pide sus 5 h completas → 7 h frente a 4 h
    expect(carga).toMatchObject({ necesitanMin: 420, excesoMin: 180, moverIds: ['urgente'] })
  })

  it('suma los minutos planeados por tarea', () => {
    const total = minutosPorTarea([
      { tareaId: 'A', fecha: '2026-11-10', minutos: 105 },
      { tareaId: 'A', fecha: '2026-11-11', minutos: 120 },
      { tareaId: 'B', fecha: '2026-11-10', minutos: 60 },
    ])
    expect(total).toEqual(new Map([['A', 225], ['B', 60]]))
  })
})

describe('sugerir distribución', () => {
  const FECHA = '2026-10-23'

  it('llena los bloques de trabajo libres siguiendo el orden de la cola', () => {
    const propuesta = proponerDistribucion({
      fecha: FECHA,
      bloques: DIA,
      cola: [tarea('urgente', { duracionEstimadaMin: 120 }), tarea('siguiente', { duracionEstimadaMin: 60 })],
      zonaHoraria: 'America/Bogota',
    })
    // No usa los bloques personales (almuerzo, libre)
    expect(propuesta).toEqual([
      { bloqueId: 'estudio', tareaId: 'urgente', minutos: 120, faltabaMin: 120 },
      { bloqueId: 'trabajo', tareaId: 'siguiente', minutos: 120, faltabaMin: 60 },
    ])
  })

  it('una tarea larga ocupa varios bloques y descuenta lo que ya tenía asignado', () => {
    const bloques = [bloque('ya', 'ESTUDIO', '07:00', '08:00', 'larga'), ...DIA]
    const propuesta = proponerDistribucion({
      fecha: FECHA,
      bloques,
      cola: [tarea('larga', { duracionEstimadaMin: 240 }), tarea('otra')],
      zonaHoraria: 'America/Bogota',
    })
    // Ya tenía 1 h: le faltan 3 h → el bloque de estudio (2 h) y el de trabajo (2 h)
    expect(propuesta.map((a) => [a.bloqueId, a.tareaId])).toEqual([
      ['estudio', 'larga'],
      ['trabajo', 'larga'],
    ])
  })

  it('no propone una tarea en un bloque que empieza después de su entrega', () => {
    const propuesta = proponerDistribucion({
      fecha: FECHA,
      bloques: DIA,
      cola: [tarea('mediodia', { fechaEntrega: entrega(FECHA, '12:00'), duracionEstimadaMin: 240 }), tarea('despues')],
      zonaHoraria: 'America/Bogota',
    })
    expect(propuesta.map((a) => [a.bloqueId, a.tareaId])).toEqual([
      ['estudio', 'mediodia'],
      ['trabajo', 'despues'],
    ])
  })

  it('si el día es hoy no propone bloques que ya pasaron', () => {
    const propuesta = proponerDistribucion({
      fecha: FECHA,
      bloques: DIA,
      cola: [tarea('A', { duracionEstimadaMin: 300 })],
      zonaHoraria: 'America/Bogota',
      desdeMin: 15 * 60,
    })
    // A las 3:00 p. m. solo queda 1 h del bloque de trabajo
    expect(propuesta).toEqual([{ bloqueId: 'trabajo', tareaId: 'A', minutos: 60, faltabaMin: 300 }])
  })

  it('no toca bloques que ya tienen tarea ni propone nada si la cola está vacía', () => {
    const bloques = [bloque('estudio', 'ESTUDIO', '08:00', '10:00', 'ocupado')]
    expect(proponerDistribucion({ fecha: FECHA, bloques, cola: [tarea('A')], zonaHoraria: 'America/Bogota' })).toEqual([])
    expect(proponerDistribucion({ fecha: FECHA, bloques: DIA, cola: [], zonaHoraria: 'America/Bogota' })).toEqual([])
  })
  it('descuenta lo planeado en otros días y no vuelve a proponer una tarea ya cubierta', () => {
    const propuesta = proponerDistribucion({
      fecha: FECHA,
      bloques: DIA,
      cola: [tarea('ensayo', { duracionEstimadaMin: 180 }), tarea('informe', { duracionEstimadaMin: 120 })],
      zonaHoraria: 'America/Bogota',
      planeadoOtrosDiasMin: new Map([['ensayo', 225]]),
    })
    // El ensayo ya tiene 3 h 45 min en otro día: los dos bloques van para el informe
    expect(propuesta.map((a) => [a.bloqueId, a.tareaId])).toEqual([['estudio', 'informe']])
  })

  it('si a la tarea le falta menos que el bloque, lo dice en faltabaMin', () => {
    const propuesta = proponerDistribucion({
      fecha: FECHA,
      bloques: DIA,
      cola: [tarea('ensayo', { duracionEstimadaMin: 180 }), tarea('otra', { duracionEstimadaMin: 120 })],
      zonaHoraria: 'America/Bogota',
      planeadoOtrosDiasMin: new Map([['ensayo', 120]]),
    })
    // Le falta 1 h y el bloque de estudio dura 2 h; el de trabajo pasa a la siguiente
    expect(propuesta).toEqual([
      { bloqueId: 'estudio', tareaId: 'ensayo', minutos: 120, faltabaMin: 60 },
      { bloqueId: 'trabajo', tareaId: 'otra', minutos: 120, faltabaMin: 120 },
    ])
  })
})

describe('sugerir distribución en varios días', () => {
  const HOY = '2026-11-10'
  const JORNADA = { inicio: 8 * 60, fin: 22 * 60 }
  const dia = (fecha: string, bloques = DIA) => ({ fecha, bloques })

  it('reparte una tarea grande en varios días, después de la que vence antes', () => {
    const cola = [
      tarea('presentacion', { fechaEntrega: entrega('2026-11-11', '23:59'), duracionEstimadaMin: 120 }),
      tarea('proyecto', { fechaEntrega: entrega('2026-11-13', '23:59'), duracionEstimadaMin: 360 }),
    ]
    const { asignaciones, faltaMin } = proponerVariosDias({
      dias: [dia('2026-11-11'), dia(HOY)], // llegan en cualquier orden
      cola,
      zonaHoraria: 'America/Bogota',
      hoy: HOY,
      ahoraMin: 7 * 60,
    })
    expect(asignaciones.map((a) => [a.fecha, a.bloqueId, a.tareaId])).toEqual([
      [HOY, 'estudio', 'presentacion'],
      [HOY, 'trabajo', 'proyecto'],
      ['2026-11-11', 'estudio', 'proyecto'],
      ['2026-11-11', 'trabajo', 'proyecto'],
    ])
    expect(faltaMin.get('proyecto')).toBe(0)
  })

  it('descuenta lo que ya está asignado en cualquier día y no lo duplica', () => {
    const manana = [bloque('m1', 'ESTUDIO', '08:00', '10:00', 'proyecto'), bloque('m2', 'TRABAJO', '14:00', '16:00')]
    const { asignaciones, faltaMin } = proponerVariosDias({
      dias: [dia(HOY), dia('2026-11-11', manana)],
      cola: [tarea('proyecto', { duracionEstimadaMin: 180 })],
      zonaHoraria: 'America/Bogota',
      hoy: HOY,
      ahoraMin: 7 * 60,
    })
    // Ya tiene 2 h mañana: hoy solo le falta 1 h (en el bloque de 2 h) y después nada más
    expect(asignaciones).toEqual([{ fecha: HOY, bloqueId: 'estudio', tareaId: 'proyecto', minutos: 120, faltabaMin: 60 }])
    expect(faltaMin.get('proyecto')).toBe(0)
  })

  it('ignora días pasados y bloques de hoy que ya pasaron', () => {
    const { asignaciones } = proponerVariosDias({
      dias: [dia('2026-11-09'), dia(HOY)],
      cola: [tarea('A', { duracionEstimadaMin: 600 })],
      zonaHoraria: 'America/Bogota',
      hoy: HOY,
      ahoraMin: 15 * 60,
    })
    expect(asignaciones).toEqual([{ fecha: HOY, bloqueId: 'trabajo', tareaId: 'A', minutos: 60, faltabaMin: 600 }])
  })

  it('avisa los días sin plan antes de la entrega cuando el tiempo no alcanza', () => {
    const proyecto = tarea('Proyecto final', { fechaEntrega: entrega('2026-11-13', '23:59'), duracionEstimadaMin: 360 })
    const avisos = avisosSinTiempo({
      cola: [proyecto],
      faltaMin: new Map([['Proyecto final', 120]]),
      diasConPlan: new Set([HOY, '2026-11-11']),
      hoy: HOY,
      ahoraMin: 7 * 60,
      jornada: JORNADA,
      zonaHoraria: 'America/Bogota',
    })
    expect(avisos).toEqual([
      '"Proyecto final" aún necesita 2 h antes de su entrega. Estos días no tienen plan: jueves 12 de noviembre y viernes 13 de noviembre. Aplícales una plantilla y vuelve a pedir la sugerencia.',
    ])
  })

  it('si todos los días tienen plan, dice que no quedan bloques libres', () => {
    const avisos = avisosSinTiempo({
      cola: [tarea('Ensayo', { fechaEntrega: entrega('2026-11-11', '23:59'), duracionEstimadaMin: 300 })],
      faltaMin: new Map([['Ensayo', 60]]),
      diasConPlan: new Set([HOY, '2026-11-11']),
      hoy: HOY,
      ahoraMin: 7 * 60,
      jornada: JORNADA,
      zonaHoraria: 'America/Bogota',
    })
    expect(avisos[0]).toContain('ya no quedan bloques de trabajo libres hasta esa fecha')
  })

  it('no cuenta hoy si la jornada terminó ni el día de entrega si vence antes de empezar la jornada', () => {
    const avisos = avisosSinTiempo({
      cola: [tarea('X', { fechaEntrega: entrega('2026-11-12', '07:00'), duracionEstimadaMin: 300 })],
      faltaMin: new Map([['X', 300]]),
      diasConPlan: new Set(),
      hoy: HOY,
      ahoraMin: 23 * 60,
      jornada: JORNADA,
      zonaHoraria: 'America/Bogota',
    })
    expect(avisos[0]).toContain('Este día no tiene plan: miércoles 11 de noviembre.')
  })

  it('no avisa por tareas sin fecha ni por las que ya tienen todo su tiempo', () => {
    const avisos = avisosSinTiempo({
      cola: [tarea('sinfecha', { duracionEstimadaMin: 600 }), tarea('lista', { fechaEntrega: entrega('2026-11-12', '23:59') })],
      faltaMin: new Map([['sinfecha', 600], ['lista', 0]]),
      diasConPlan: new Set(),
      hoy: HOY,
      ahoraMin: 7 * 60,
      jornada: JORNADA,
      zonaHoraria: 'America/Bogota',
    })
    expect(avisos).toEqual([])
  })

  it('con muchos días sin plan nombra tres y cuenta el resto', () => {
    const avisos = avisosSinTiempo({
      cola: [tarea('Tesis', { fechaEntrega: entrega('2026-11-20', '23:59'), duracionEstimadaMin: 600 })],
      faltaMin: new Map([['Tesis', 600]]),
      diasConPlan: new Set(),
      hoy: HOY,
      ahoraMin: 7 * 60,
      jornada: JORNADA,
      zonaHoraria: 'America/Bogota',
    })
    expect(avisos[0]).toContain('martes 10 de noviembre, miércoles 11 de noviembre, jueves 12 de noviembre y 8 días más')
  })
})
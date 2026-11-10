// ─────────────────────────────────────────────────────────────
// Estadísticas de la semana (funciones puras)
//
// Estos números se muestran tal cual en la página y también se le entregan a la IA,
// que solo los interpreta. Así ningún dato de la semana sale de la imaginación de la IA.
// ─────────────────────────────────────────────────────────────

import { formatearMinutos } from './planificador.js'

export type EstadisticasSemana = {
  desde: string // "2026-11-04"
  hasta: string // "2026-11-10"
  diasPlanificados: number
  diasConEntrada: number
  tareasCompletadas: number
  conTiempoReal: number // completadas en las que se registró el tiempo real
  minutosEstimados: number // solo de las que tienen tiempo real, para comparar lo comparable
  minutosReales: number
  desviacionPct: number | null // + te tomó más de lo estimado, − menos; null si no hay datos
  descripcionPrecision: string
  etiquetas: { nombre: string; veces: number }[] // las 5 más usadas
}

export function calcularSemana(params: {
  desde: string
  hasta: string
  diasPlanificados: number
  entradas: { etiquetas: string[] }[]
  completadas: { duracionEstimadaMin: number; tiempoRealMin: number | null }[]
}): EstadisticasSemana {
  const { desde, hasta, diasPlanificados, entradas, completadas } = params

  const medidas = completadas.filter((t) => t.tiempoRealMin !== null)
  const minutosEstimados = medidas.reduce((total, t) => total + t.duracionEstimadaMin, 0)
  const minutosReales = medidas.reduce((total, t) => total + t.tiempoRealMin!, 0)
  const desviacionPct = minutosEstimados > 0 ? Math.round(((minutosReales - minutosEstimados) / minutosEstimados) * 100) : null

  let descripcionPrecision: string
  if (desviacionPct === null) descripcionPrecision = 'No registraste el tiempo real de tus tareas, así que aún no se puede comparar.'
  else if (Math.abs(desviacionPct) <= 10)
    descripcionPrecision = `Tus estimaciones fueron acertadas: estimaste ${formatearMinutos(minutosEstimados)} y te tomó ${formatearMinutos(minutosReales)}.`
  else if (desviacionPct > 0)
    descripcionPrecision = `Tus tareas te tomaron un ${desviacionPct} % más de lo estimado (${formatearMinutos(minutosEstimados)} estimadas, ${formatearMinutos(minutosReales)} reales).`
  else
    descripcionPrecision = `Tus tareas te tomaron un ${-desviacionPct} % menos de lo estimado (${formatearMinutos(minutosEstimados)} estimadas, ${formatearMinutos(minutosReales)} reales).`

  const conteo = new Map<string, number>()
  for (const e of entradas) for (const nombre of e.etiquetas) conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1)
  const etiquetas = [...conteo]
    .map(([nombre, veces]) => ({ nombre, veces }))
    .sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre))
    .slice(0, 5)

  return {
    desde,
    hasta,
    diasPlanificados,
    diasConEntrada: entradas.length,
    tareasCompletadas: completadas.length,
    conTiempoReal: medidas.length,
    minutosEstimados,
    minutosReales,
    desviacionPct,
    descripcionPrecision,
    etiquetas,
  }
}
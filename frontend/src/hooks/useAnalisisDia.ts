import { useEffect, useState } from 'react'
import { api } from '../api'
import type { AnalisisDia, DiaPlanificado, Tarea } from '../tipos'

// Pide al motor la carga del día y la sugerencia de distribución.
// Se recalcula cuando cambian la fecha, el día (bloques y tareas asignadas) o la lista de tareas.
export function useAnalisisDia(fecha: string, dia: DiaPlanificado | null, tareas: Tarea[]) {
  const [analisis, setAnalisis] = useState<AnalisisDia | null>(null)

  useEffect(() => {
    let vigente = true
    api<AnalisisDia>(`/planificacion/dia/${fecha}`)
      .then((datos) => vigente && setAnalisis(datos))
      .catch(() => vigente && setAnalisis(null))
    return () => {
      vigente = false
    }
  }, [fecha, dia, tareas])

  return analisis
}
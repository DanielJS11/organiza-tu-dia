import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ResultadoPrioridad } from '../tipos'

export type RespuestaPrioridades = {
  capacidadPorDefectoMin: number
  jornada: { inicio: string; fin: string }
  resultados: ResultadoPrioridad[]
}

// Pide al motor de reglas el orden sugerido. "version" cambia cada vez que cambian las tareas, para recalcular.
export function usePrioridades(version: unknown) {
  const [datos, setDatos] = useState<RespuestaPrioridades | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    api<RespuestaPrioridades>('/planificacion/prioridades')
      .then((r) => vigente && setDatos(r))
      .catch((err: Error) => vigente && setError(err.message))
    return () => {
      vigente = false
    }
  }, [version])

  return { datos, cargando: !datos && !error, error }
}
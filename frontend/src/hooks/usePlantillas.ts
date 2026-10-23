import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Plantilla } from '../tipos'

export function usePlantillas() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Plantilla[]>('/plantillas')
      .then(setPlantillas)
      .catch((err: Error) => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  return { plantillas, cargando, error }
}
import { useEffect, useState } from 'react'
import { api } from '../api'
import type { DiaPlanificado } from '../tipos'

// Carga el plan de una fecha y permite aplicarle una plantilla o quitarlo
export function useDia(fecha: string) {
  const [dia, setDia] = useState<DiaPlanificado | null>(null)
  const [fechaCargada, setFechaCargada] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true // evita mostrar la respuesta de una fecha anterior si el usuario cambió rápido
    api<DiaPlanificado | null>(`/dias/${fecha}`)
      .then((datos) => {
        if (!vigente) return
        setDia(datos)
        setError('')
      })
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setFechaCargada(fecha))
    return () => {
      vigente = false
    }
  }, [fecha])

  async function aplicarPlantilla(plantillaId: number) {
    setDia(await api<DiaPlanificado>(`/dias/${fecha}/aplicar-plantilla`, { method: 'POST', body: JSON.stringify({ plantillaId }) }))
  }

  async function quitarPlan() {
    await api(`/dias/${fecha}`, { method: 'DELETE' })
    setDia(null)
  }

  return { dia, cargando: fechaCargada !== fecha, error, aplicarPlantilla, quitarPlan }
}
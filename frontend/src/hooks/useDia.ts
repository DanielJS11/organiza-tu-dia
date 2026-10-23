import { useEffect, useState } from 'react'
import { api } from '../api'
import type { DatosBloque, DiaPlanificado } from '../tipos'

// Carga el plan de una fecha y permite aplicarle una plantilla, ajustar sus bloques o quitarlo
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

  async function agregarBloque(datos: DatosBloque) {
    setDia(await api<DiaPlanificado>(`/dias/${fecha}/bloques`, { method: 'POST', body: JSON.stringify(datos) }))
  }

  async function editarBloque(id: string, datos: DatosBloque) {
    setDia(await api<DiaPlanificado>(`/dias/${fecha}/bloques/${id}`, { method: 'PATCH', body: JSON.stringify(datos) }))
  }

  async function eliminarBloque(id: string) {
    setDia(await api<DiaPlanificado>(`/dias/${fecha}/bloques/${id}`, { method: 'DELETE' }))
  }

  return {
    dia,
    cargando: fechaCargada !== fecha,
    error,
    aplicarPlantilla,
    quitarPlan,
    agregarBloque,
    editarBloque,
    eliminarBloque,
  }
}
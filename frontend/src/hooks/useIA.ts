import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ReflexionIA, SemanaIA } from '../tipos'

// Marca si una respuesta de la IA le sirvió al usuario (sirve para medir su utilidad)
export function calificarIA(id: string, util: boolean) {
  return api<{ estado: 'ACEPTADA' | 'DESCARTADA' }>(`/ia/sugerencias/${id}`, { method: 'PATCH', body: JSON.stringify({ util }) })
}

// La reflexión guardada para un día y la acción de pedir una nueva.
// "version" cambia cuando se guarda la entrada, para saber si la reflexión quedó desactualizada.
export function useReflexionIA(fecha: string, version: number) {
  const [reflexion, setReflexion] = useState<ReflexionIA | null>(null)
  const [fechaCargada, setFechaCargada] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    api<ReflexionIA | null>(`/ia/reflexion/${fecha}`)
      .then((datos) => vigente && setReflexion(datos))
      .catch(() => vigente && setReflexion(null))
      .finally(() => vigente && setFechaCargada(fecha))
    return () => {
      vigente = false
    }
  }, [fecha, version])

  async function pedir() {
    setReflexion(await api<ReflexionIA>(`/ia/reflexion/${fecha}`, { method: 'POST' }))
  }

  return { reflexion: fechaCargada === fecha ? reflexion : null, pedir, setReflexion }
}

// Estadísticas de los últimos 7 días y el último resumen de la IA
export function useSemanaIA(version: number) {
  const [semana, setSemana] = useState<SemanaIA | null>(null)

  useEffect(() => {
    let vigente = true
    api<SemanaIA>('/ia/semana')
      .then((datos) => vigente && setSemana(datos))
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [version])

  async function pedir() {
    setSemana(await api<SemanaIA>('/ia/semana', { method: 'POST' }))
  }

  return { semana, pedir, setSemana }
}
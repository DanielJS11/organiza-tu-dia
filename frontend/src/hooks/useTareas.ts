import { useEffect, useState } from 'react'
import { api } from '../api'
import type { DatosTarea, Tarea } from '../tipos'

const pedirTareas = () => api<Tarea[]>('/tareas')

// Carga las tareas del usuario y ofrece funciones para crearlas, editarlas y eliminarlas
export function useTareas() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    pedirTareas()
      .then(setTareas)
      .catch((err: Error) => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  async function recargar() {
    setTareas(await pedirTareas())
  }

  async function crear(datos: DatosTarea) {
    await api<Tarea>('/tareas', { method: 'POST', body: JSON.stringify(datos) })
    await recargar()
  }

  async function editar(id: string, datos: Partial<DatosTarea>) {
    await api<Tarea>(`/tareas/${id}`, { method: 'PATCH', body: JSON.stringify(datos) })
    await recargar()
  }

  async function eliminar(id: string) {
    await api(`/tareas/${id}`, { method: 'DELETE' })
    await recargar()
  }

  return { tareas, cargando, error, crear, editar, eliminar }
}
import { useEffect, useState } from 'react'
import { api } from '../api'
import type { DiaDiario, EntradaDiario, EtiquetaUso } from '../tipos'

// Un día del diario: su entrada y el resumen de lo que pasó, con acciones para guardar o borrar
export function useDiaDiario(fecha: string) {
  const [dia, setDia] = useState<DiaDiario | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    api<DiaDiario>(`/diario/${fecha}`)
      .then((datos) => {
        if (!vigente) return
        setDia(datos)
        setError('')
      })
      .catch((err: Error) => vigente && setError(err.message))
    return () => {
      vigente = false
    }
  }, [fecha])

  async function guardar(texto: string, etiquetas: string[]) {
    const entrada = await api<EntradaDiario>(`/diario/${fecha}`, { method: 'PUT', body: JSON.stringify({ texto, etiquetas }) })
    setDia((actual) => actual && { ...actual, entrada })
  }

  async function eliminar() {
    await api(`/diario/${fecha}`, { method: 'DELETE' })
    setDia((actual) => actual && { ...actual, entrada: null })
  }

  // Mientras llega el día pedido no se muestra el anterior
  return { dia: dia?.fecha === fecha ? dia : null, cargando: dia?.fecha !== fecha && !error, error, guardar, eliminar }
}

// Entradas anteriores (con filtro por etiqueta o texto) y las etiquetas del usuario.
// "version" cambia cada vez que se guarda o borra algo, para volver a cargar.
export function useHistorialDiario(etiqueta: string, buscar: string, version: number) {
  const [entradas, setEntradas] = useState<EntradaDiario[]>([])
  const [etiquetas, setEtiquetas] = useState<EtiquetaUso[]>([])

  useEffect(() => {
    let vigente = true
    const parametros = new URLSearchParams()
    if (etiqueta) parametros.set('etiqueta', etiqueta)
    if (buscar) parametros.set('buscar', buscar)
    Promise.all([api<EntradaDiario[]>(`/diario?${parametros}`), api<EtiquetaUso[]>('/diario/etiquetas')])
      .then(([e, t]) => {
        if (!vigente) return
        setEntradas(e)
        setEtiquetas(t)
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [etiqueta, buscar, version])

  return { entradas, etiquetas }
}
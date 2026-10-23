import { useContext } from 'react'
import { Sesion } from './contextoSesion'

export function useSesion() {
  const contexto = useContext(Sesion)
  if (!contexto) throw new Error('useSesion debe usarse dentro de ProveedorSesion')
  return contexto
}
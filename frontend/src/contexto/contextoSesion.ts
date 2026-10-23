import { createContext } from 'react'
import type { Usuario } from '../tipos'

export type ContextoSesion = {
  usuario: Usuario | null
  cargando: boolean
  ingresar: (correo: string, contrasena: string) => Promise<void>
  registrar: (nombre: string, correo: string, contrasena: string) => Promise<void>
  salir: () => Promise<void>
}

export const Sesion = createContext<ContextoSesion | null>(null)
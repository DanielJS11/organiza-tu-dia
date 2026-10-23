import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api'
import type { Usuario } from '../tipos'
import { Sesion } from './contextoSesion'

export default function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  // Al abrir la página, pregunta al backend si ya hay una sesión activa
  useEffect(() => {
    api<Usuario>('/auth/yo')
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false))
  }, [])

  async function ingresar(correo: string, contrasena: string) {
    const datos = await api<Usuario>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo, contrasena }),
    })
    setUsuario(datos)
  }

  async function registrar(nombre: string, correo: string, contrasena: string) {
    const datos = await api<Usuario>('/auth/registro', {
      method: 'POST',
      body: JSON.stringify({ nombre, correo, contrasena }),
    })
    setUsuario(datos)
  }

  async function salir() {
    await api('/auth/logout', { method: 'POST' })
    setUsuario(null)
  }

  return (
    <Sesion.Provider value={{ usuario, cargando, ingresar, registrar, salir }}>
      {children}
    </Sesion.Provider>
  )
}
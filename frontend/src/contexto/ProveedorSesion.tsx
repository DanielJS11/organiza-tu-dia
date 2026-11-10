import { useEffect, useState, type ReactNode } from 'react'
import { api, EVENTO_SESION_EXPIRADA } from '../api'
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

  
  // Si una petición responde que la sesión ya no vale, se cierra aquí también
  useEffect(() => {
    const cerrar = () => setUsuario(null)
    window.addEventListener(EVENTO_SESION_EXPIRADA, cerrar)
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, cerrar)
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

    // Elige una contraseña nueva con el enlace del correo; el backend deja la sesión iniciada
  async function restablecer(token: string, contrasena: string) {
    setUsuario(await api<Usuario>('/auth/restablecer', { method: 'POST', body: JSON.stringify({ token, contrasena }) }))
  }

    // Activa o desactiva la IA para este usuario
  async function cambiarIA(iaActivada: boolean) {
    setUsuario(await api<Usuario>('/auth/preferencias', { method: 'PATCH', body: JSON.stringify({ iaActivada }) }))
  }

  async function salir() {
    await api('/auth/logout', { method: 'POST' })
    setUsuario(null)
  }

  return (
        <Sesion.Provider value={{ usuario, cargando, ingresar, registrar, salir, cambiarIA, restablecer }}>
            {children}
    </Sesion.Provider>
  )
}
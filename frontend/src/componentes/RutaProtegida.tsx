import { Navigate, Outlet } from 'react-router'
import { useSesion } from '../contexto/useSesion'

// Solo deja pasar a usuarios con sesión; si no, los envía a la página de ingreso
export default function RutaProtegida() {
  const { usuario, cargando } = useSesion()

  if (cargando) {
    return <p className="p-8 text-center text-slate-500">Cargando…</p>
  }
  return usuario ? <Outlet /> : <Navigate to="/ingresar" replace />
}
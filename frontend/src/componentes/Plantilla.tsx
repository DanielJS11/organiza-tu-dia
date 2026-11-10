import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useSesion } from '../contexto/useSesion'
import { confirmarSalida } from '../utilidades/cambiosPendientes'
import { secciones } from '../utilidades/secciones'
import { Logo } from './Iconos'

// Estructura común de las páginas internas: barra superior + contenido
export default function Plantilla() {
  const { usuario, salir } = useSesion()
  const { pathname } = useLocation()

  // El título de la pestaña del navegador dice en qué sección estás (lo leen los lectores de pantalla)
  useEffect(() => {
    const seccion = secciones.find((s) => pathname.startsWith(s.ruta))
    document.title = seccion ? `${seccion.nombre} · Organiza tu día` : 'Organiza tu día'
  }, [pathname])

  // Si hay cambios sin guardar (por ejemplo, en el diario), se pide confirmación antes de salir
  const proteger = (e: React.MouseEvent) => !confirmarSalida() && e.preventDefault()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Enlace para saltar el menú con el teclado: solo se ve al enfocarlo con Tab */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Saltar al contenido
      </a>
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
          <NavLink to="/" onClick={proteger} className="flex items-center gap-2.5 rounded-lg">
            <Logo />
            <span className="text-lg font-semibold tracking-tight text-slate-800">Organiza tu día</span>
          </NavLink>

          <nav aria-label="Secciones" className="order-last -mx-1 flex w-full gap-1 sm:order-none sm:mx-0 sm:w-auto">
            {secciones.map((s) => (
              <NavLink
                key={s.ruta}
                to={s.ruta}
                onClick={proteger}
                className={({ isActive }) =>
                  `flex flex-1 items-center justify-center gap-2 rounded-full px-3.5 py-2 text-sm sm:flex-none ${
                    isActive ? `${s.activo} font-semibold` : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`
                }
              >
                <span className={`h-2 w-2 rounded-full ${s.punto}`} aria-hidden="true" />
                {s.nombre}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-600 md:inline">{usuario?.nombre}</span>
            <button
              onClick={() => confirmarSalida() && salir()}
              className="rounded-full px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 outline-none sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
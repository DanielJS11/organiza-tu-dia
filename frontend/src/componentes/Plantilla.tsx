import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useSesion } from '../contexto/useSesion'
import { confirmarSalida } from '../utilidades/cambiosPendientes'

const secciones = [
  { ruta: '/elige', nombre: 'Elige' },
  { ruta: '/organiza', nombre: 'Organiza' },
  { ruta: '/reflexiona', nombre: 'Reflexiona' },
]

// Estructura común de las páginas internas: barra superior + contenido
export default function Plantilla() {
  const { usuario, salir } = useSesion()
  const { pathname } = useLocation()

  // El título de la pestaña del navegador dice en qué sección estás (lo leen los lectores de pantalla)
  useEffect(() => {
    const seccion = secciones.find((s) => pathname.startsWith(s.ruta))
    document.title = seccion ? `${seccion.nombre} · Organiza tu día` : 'Organiza tu día'
  }, [pathname])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Enlace para saltar el menú con el teclado: solo se ve al enfocarlo con Tab */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Saltar al contenido
      </a>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <NavLink to="/" onClick={(e) => !confirmarSalida() && e.preventDefault()} className="font-semibold text-slate-800">
            Organiza tu día
          </NavLink>
          <nav aria-label="Secciones" className="order-last w-full flex gap-1 sm:order-none sm:w-auto">
            {secciones.map((s) => (
              <NavLink
                key={s.ruta}
                to={s.ruta}
                onClick={(e) => !confirmarSalida() && e.preventDefault()}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm ${
                    isActive ? 'bg-teal-50 text-teal-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {s.nombre}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-slate-600">{usuario?.nombre}</span>
            <button onClick={() => confirmarSalida() && salir()} className="text-slate-500 hover:text-slate-800">
              Salir
            </button>
          </div>
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className="max-w-5xl mx-auto px-4 py-8 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
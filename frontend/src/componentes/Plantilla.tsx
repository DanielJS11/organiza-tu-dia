import { NavLink, Outlet } from 'react-router'
import { useSesion } from '../contexto/useSesion'

const secciones = [
  { ruta: '/elige', nombre: 'Elige' },
  { ruta: '/organiza', nombre: 'Organiza' },
  { ruta: '/reflexiona', nombre: 'Reflexiona' },
]

// Estructura común de las páginas internas: barra superior + contenido
export default function Plantilla() {
  const { usuario, salir } = useSesion()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <NavLink to="/" className="font-semibold text-slate-800">
            Organiza tu día
          </NavLink>
          <nav className="order-last w-full flex gap-1 sm:order-none sm:w-auto">
            {secciones.map((s) => (
              <NavLink
                key={s.ruta}
                to={s.ruta}
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
            <button onClick={salir} className="text-slate-500 hover:text-slate-800">
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
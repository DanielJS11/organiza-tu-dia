import { Link } from 'react-router'
import { useSesion } from '../contexto/useSesion'

const acciones = [
  { ruta: '/elige', titulo: 'Elige', texto: 'Escoge la estructura que mejor se adapte a tu día.' },
  { ruta: '/organiza', titulo: 'Organiza', texto: 'Registra tus tareas y decide qué merece tu tiempo primero.' },
  { ruta: '/reflexiona', titulo: 'Reflexiona', texto: 'Escribe cómo te fue y revisa tus días anteriores.' },
]

export default function Inicio() {
  const { usuario } = useSesion()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Hola, {usuario?.nombre}</h1>
      <p className="mt-1 text-slate-500">¿Cómo quieres vivir tu día hoy?</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {acciones.map((a) => (
          <Link key={a.ruta} to={a.ruta} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-semibold text-teal-700">{a.titulo}</h2>
            <p className="mt-2 text-sm text-slate-600">{a.texto}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
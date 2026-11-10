import { useState } from 'react'
import { Link } from 'react-router'
import { useSesion } from '../contexto/useSesion'
import { secciones, seccionDelMomento } from '../utilidades/secciones'

const formatoFecha = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

function saludo(hora: number) {
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function Inicio() {
  const { usuario } = useSesion()
  // La hora se toma una vez al abrir la página
  const [ahora] = useState(() => new Date())
  const actual = seccionDelMomento(ahora.getHours())
  const fecha = formatoFecha.format(ahora)
  const primerNombre = usuario?.nombre.split(' ')[0]

  return (
    <div>
      <p className="text-slate-600">{fecha.charAt(0).toUpperCase() + fecha.slice(1)}</p>
      <h1 className="mt-1 text-4xl font-semibold text-slate-800 sm:text-5xl">
        {saludo(ahora.getHours())}, {primerNombre}
      </h1>
      <p className="mt-3 max-w-prose text-lg text-slate-600">
        Tu día tiene tres momentos. A esta hora es buen momento para {actual.invitacion}.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {secciones.map((s) => {
          const esAhora = s.ruta === actual.ruta
          return (
            <li key={s.ruta}>
              <Link
                to={s.ruta}
                className={`flex h-full flex-col rounded-3xl bg-white p-6 shadow-sm hover:shadow-md ${esAhora ? 'ring-2 ring-slate-800' : ''}`}
              >
                <span className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${s.tinte}`}>
                    <s.Icono className="h-6 w-6" />
                  </span>
                  {esAhora && <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-white">Ahora</span>}
                </span>
                <span className="mt-5 text-sm text-slate-600">{s.momento}</span>
                <span className="mt-0.5 text-2xl font-semibold text-slate-800">{s.nombre}</span>
                <span className="mt-2 text-slate-600">{s.descripcion}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
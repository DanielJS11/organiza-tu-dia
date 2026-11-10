import { useEffect, useState } from 'react'
import type { EntradaDiario, EtiquetaUso } from '../../tipos'
import { claseCampoBase } from '../../utilidades/estilos'
import { formatearDia } from '../../utilidades/tiempo'

type Props = {
  entradas: EntradaDiario[]
  etiquetas: EtiquetaUso[]
  etiqueta: string
  fechaActual: string
  onFiltrar: (etiqueta: string) => void
  onBuscar: (texto: string) => void
  onAbrir: (fecha: string) => void
}

const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

// Entradas anteriores, filtrables por etiqueta o por texto
export default function HistorialDiario({ entradas, etiquetas, etiqueta, fechaActual, onFiltrar, onBuscar, onAbrir }: Props) {
  const [texto, setTexto] = useState('')

  // Busca cuando el usuario deja de escribir (300 ms) para no consultar en cada tecla
  useEffect(() => {
    const espera = setTimeout(() => onBuscar(texto.trim()), 300)
    return () => clearTimeout(espera)
  }, [texto, onBuscar])

  const chip = (activo: boolean) =>
    `rounded-full px-3 py-1 text-sm ${activo ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'}`

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-800">Entradas anteriores</h2>
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar en tus entradas…"
          className={`${claseCampoBase} w-full text-sm sm:w-64`}
          aria-label="Buscar en tus entradas"
        />
      </div>

      {etiquetas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => onFiltrar('')} aria-pressed={!etiqueta} className={chip(!etiqueta)}>
            Todas
          </button>
          {etiquetas.map((e) => (
            <button key={e.nombre} onClick={() => onFiltrar(e.nombre)} aria-pressed={etiqueta === e.nombre} className={chip(etiqueta === e.nombre)}>
              #{e.nombre} <span className="opacity-70">{e.usos}</span>
            </button>
          ))}
        </div>
      )}

      {entradas.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          {etiqueta || texto ? 'Ninguna entrada coincide con tu búsqueda.' : 'Aún no has escrito entradas. La primera puede ser la de hoy.'}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {entradas.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => onAbrir(e.fecha)}
                className={`w-full rounded-xl bg-white p-4 text-left shadow-sm hover:ring-2 hover:ring-teal-100 ${
                  e.fecha === fechaActual ? 'ring-2 ring-teal-200' : ''
                }`}
              >
                <span className="block text-sm font-medium text-slate-800">{capitalizar(formatearDia(e.fecha))}</span>
                <span className="mt-1 line-clamp-3 block whitespace-pre-line text-sm text-slate-600">{e.texto}</span>
                {e.etiquetas.length > 0 && (
                  <span className="mt-2 flex flex-wrap gap-1">
                    {e.etiquetas.map((t) => (
                      <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        #{t}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
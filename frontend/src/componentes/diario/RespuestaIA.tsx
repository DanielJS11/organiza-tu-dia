import { useState, type ReactNode } from 'react'
import { calificarIA } from '../../hooks/useIA'
import type { RespuestaIA as Respuesta } from '../../tipos'

const NOMBRE_PROVEEDOR = { gemini: 'Google Gemini', groq: 'Groq' }

type Props = {
  respuesta: Respuesta<unknown>
  children: ReactNode
  onCalificada: (estado: Respuesta<unknown>['estado']) => void
}

// Marco común de una respuesta de la IA: contenido, quién la generó y "¿te sirvió?"
export default function RespuestaIA({ respuesta, children, onCalificada }: Props) {
  const [error, setError] = useState('')

  async function calificar(util: boolean) {
    try {
      const { estado } = await calificarIA(respuesta.id, util)
      onCalificada(estado)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const boton = (activo: boolean) =>
    `rounded-lg px-2 py-1 ${activo ? 'bg-violet-100 font-medium text-violet-800' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`

  return (
    <div className="rounded-xl bg-violet-50 p-4 text-sm text-slate-700">
      {children}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-violet-100 pt-2 text-xs text-slate-500">
        <span>Generado por IA ({NOMBRE_PROVEEDOR[respuesta.proveedor]}). Puede equivocarse: tómalo como una sugerencia.</span>
        <span className="flex items-center gap-1">
          ¿Te sirvió?
          <button onClick={() => calificar(true)} aria-pressed={respuesta.estado === 'ACEPTADA'} className={boton(respuesta.estado === 'ACEPTADA')}>
            Sí
          </button>
          <button onClick={() => calificar(false)} aria-pressed={respuesta.estado === 'DESCARTADA'} className={boton(respuesta.estado === 'DESCARTADA')}>
            No
          </button>
        </span>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
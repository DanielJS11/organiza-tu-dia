import { useState } from 'react'
import { useSesion } from '../../contexto/useSesion'
import { useReflexionIA } from '../../hooks/useIA'
import RespuestaIA from './RespuestaIA'
import AvisoIA from './AvisoIA'

type Props = { fecha: string; hayEntrada: boolean; version: number }

// Reflexión de la IA sobre la entrada del día (solo se genera cuando el usuario la pide)
export default function ReflexionDelDia({ fecha, hayEntrada, version }: Props) {
  const { usuario } = useSesion()
  const { reflexion, pedir, setReflexion } = useReflexionIA(fecha, version)
  const [pidiendo, setPidiendo] = useState(false)
  const [error, setError] = useState('')

  async function pedirReflexion() {
    setPidiendo(true)
    setError('')
    try {
      await pedir()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPidiendo(false)
    }
  }

  const textoBoton = pidiendo ? 'Thinking…' : reflexion ? 'Generate another reflection' : 'Ask the AI for a reflection'

  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-800">AI reflection</h2>
        {usuario?.iaActivada && hayEntrada && (
          <button
            onClick={pedirReflexion}
            disabled={pidiendo}
            className="rounded-lg bg-noche-600 px-4 py-2 text-sm font-medium text-white hover:bg-noche-700 disabled:opacity-60"
          >
            {textoBoton}
          </button>
        )}
      </div>

      {!usuario?.iaActivada ? (
        <p className="mt-2 text-sm text-slate-500">You have AI turned off.</p>
      ) : !hayEntrada ? (
        <p className="mt-2 text-sm text-slate-500">Save your entry and the AI will help you take a lesson from this day.</p>
      ) : (
        !reflexion && !error && <p className="mt-2 text-sm text-slate-500">The AI reads your entry and the day's data, and gives you back a lesson and suggestions for tomorrow.</p>
      )}

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {reflexion && (
        <div className="mt-4">
          {reflexion.desactualizada && (
            <p className="mb-2 text-xs text-amber-700">You edited your entry after this reflection: you can generate another one.</p>
          )}
          <RespuestaIA respuesta={reflexion} onCalificada={(estado) => setReflexion({ ...reflexion, estado })}>
            <p>{reflexion.respuesta.observacion}</p>
            <p className="mt-2">
              <span className="font-medium text-noche-900">Lesson: </span>
              {reflexion.respuesta.aprendizaje}
            </p>
            <p className="mt-2 font-medium text-noche-900">For tomorrow:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {reflexion.respuesta.sugerencias.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </RespuestaIA>
        </div>
      )}

      <div className="mt-4">
        <AvisoIA />
      </div>
    </section>
  )
}

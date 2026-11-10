import { useState } from 'react'
import { useSesion } from '../../contexto/useSesion'
import { useSemanaIA } from '../../hooks/useIA'
import { formatearDia } from '../../utilidades/tiempo'
import RespuestaIA from './RespuestaIA'

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xl font-semibold text-slate-800">{valor}</p>
      <p className="text-xs text-slate-500">{etiqueta}</p>
    </div>
  )
}

// Tu semana: números calculados por la app (siempre) y, si lo pides, el resumen de la IA
export default function ResumenSemana({ version }: { version: number }) {
  const { usuario } = useSesion()
  const { semana, pedir, setSemana } = useSemanaIA(version)
  const [pidiendo, setPidiendo] = useState(false)
  const [error, setError] = useState('')

  if (!semana) return null
  const { estadisticas: e, resumen } = semana

  async function pedirResumen() {
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

  return (
    <section className="mt-10 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800">Tu semana</h2>
          <p className="text-sm text-slate-500">
            Del {formatearDia(e.desde)} al {formatearDia(e.hasta)}
          </p>
        </div>
        {usuario?.iaActivada && (
          <button
            onClick={pedirResumen}
            disabled={pidiendo}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {pidiendo ? 'Pensando…' : resumen ? 'Actualizar resumen con IA' : 'Resumir mi semana con IA'}
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato valor={String(e.tareasCompletadas)} etiqueta="tareas completadas" />
        <Dato valor={`${e.diasPlanificados} / 7`} etiqueta="días con plan" />
        <Dato valor={`${e.diasConEntrada} / 7`} etiqueta="días con entrada" />
        <Dato
          valor={e.desviacionPct === null ? '—' : `${e.desviacionPct > 0 ? '+' : ''}${e.desviacionPct} %`}
          etiqueta="tiempo real vs. estimado"
        />
      </div>
      <p className="mt-3 text-sm text-slate-600">{e.descripcionPrecision}</p>
      {e.etiquetas.length > 0 && (
        <p className="mt-1 text-sm text-slate-500">Etiquetas más usadas: {e.etiquetas.map((x) => `#${x.nombre} (${x.veces})`).join(', ')}</p>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {resumen && (
        <div className="mt-4">
          <RespuestaIA respuesta={resumen} onCalificada={(estado) => setSemana({ ...semana, resumen: { ...resumen, estado } })}>
            <p>{resumen.respuesta.resumen}</p>
            {resumen.respuesta.patrones.length > 0 && (
              <>
                <p className="mt-2 font-medium text-violet-900">Lo que se repite:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {resumen.respuesta.patrones.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-2 font-medium text-violet-900">Para la próxima semana:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {resumen.respuesta.recomendaciones.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </RespuestaIA>
        </div>
      )}
    </section>
  )
}

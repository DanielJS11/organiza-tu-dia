import type { EstadoPrioridad, Tarea } from '../../tipos'
import { usePrioridades } from '../../hooks/usePrioridades'
import { formatearDuracion, nombresPrioridad } from '../../utilidades/formato'

type Props = {
  tareas: Tarea[] // se usa solo para saber cuándo recalcular
  onSeleccionar: (tarea: Tarea) => void
}

const estilos: Record<EstadoPrioridad, { etiqueta: string; chip: string; numero: string }> = {
  vencida: { etiqueta: 'Vencida', chip: 'bg-red-50 text-red-700', numero: 'bg-red-600 text-white' },
  en_riesgo: { etiqueta: 'En riesgo', chip: 'bg-red-50 text-red-700', numero: 'bg-red-600 text-white' },
  ajustada: { etiqueta: 'Margen corto', chip: 'bg-amber-50 text-amber-700', numero: 'bg-amber-500 text-white' },
  a_tiempo: { etiqueta: 'A tiempo', chip: 'bg-emerald-50 text-emerald-700', numero: 'bg-teal-600 text-white' },
  sin_fecha: { etiqueta: 'Sin fecha', chip: 'bg-slate-100 text-slate-600', numero: 'bg-slate-400 text-white' },
}

// Orden sugerido por el motor de reglas. Es una sugerencia: el usuario decide qué hacer.
export default function PorDondeEmpezar({ tareas, onSeleccionar }: Props) {
  const { datos, cargando, error } = usePrioridades(tareas)

  if (error) return <p className="mt-6 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
  if (cargando || !datos) return <p className="mt-8 text-center text-slate-500">Calculando…</p>
  if (datos.resultados.length === 0) {
    return (
      <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        No tienes tareas pendientes. ¡Buen trabajo!
      </p>
    )
  }

  const problemas = datos.resultados.filter((r) => r.estado === 'en_riesgo' || r.estado === 'vencida')

  return (
    <div className="mt-6 space-y-4">
      {problemas.length > 0 && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">
            {problemas.length === 1 ? '1 tarea necesita tu atención.' : `${problemas.length} tareas necesitan tu atención.`}
          </p>
          <p className="mt-1">
                        {problemas.length === 1 ? 'No alcanza' : 'No alcanzan'} a terminarse antes de su entrega. Puedes mover alguna fecha, reducir
            lo que harás o reservar más bloques de trabajo en <strong>Elige</strong>.
          </p>
        </div>
      )}

      <p className="text-sm font-medium text-slate-700">Orden sugerido para cumplir tus entregas</p>

      <ol className="space-y-3">
        {datos.resultados.map((r) => {
          const estilo = estilos[r.estado]
          return (
            <li key={r.tareaId}>
              <button
                onClick={() => onSeleccionar(r.tarea)}
                className="flex w-full items-start gap-4 rounded-xl bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${estilo.numero}`}>
                  {r.orden}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{r.tarea.titulo}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estilo.chip}`}>{estilo.etiqueta}</span>
                    <span className="text-xs text-slate-500">
                      Prioridad {nombresPrioridad[r.tarea.prioridad].toLowerCase()} · {formatearDuracion(r.tarea.duracionEstimadaMin)}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">{r.razon}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <p className="text-sm text-slate-500">
        Cómo se ordena: primero lo que vence antes; si dos tareas vencen al mismo tiempo, la de mayor prioridad y luego la más corta. El
        estado de cada tarea dice qué pasa si sigues este orden: se suma lo que piden ella y las anteriores, y se compara con el tiempo de
        trabajo que tienes hasta su entrega. En los días con plan cuentan tus bloques de estudio, trabajo y enfoque; en los días sin plan
        se asumen {formatearDuracion(datos.capacidadPorDefectoMin)} de trabajo.
      </p>
    </div>
  )
}
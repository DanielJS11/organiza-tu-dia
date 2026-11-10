import type { ReactNode } from 'react'
import type { EstadoPrioridad, ResultadoPrioridad, Tarea } from '../../tipos'
import { usePrioridades } from '../../hooks/usePrioridades'
import { formatearDuracion, nombresPrioridad } from '../../utilidades/formato'
import { formatearHora } from '../../utilidades/tiempo'

type Props = {
  tareas: Tarea[] // se usa solo para saber cuándo recalcular
  onSeleccionar: (tarea: Tarea) => void
}

const estilos: Record<EstadoPrioridad, { etiqueta: string; chip: string; marca: string }> = {
  vencida: { etiqueta: 'Vencida', chip: 'bg-red-50 text-red-700', marca: 'bg-red-600 text-white' },
  no_alcanza: { etiqueta: 'No alcanza', chip: 'bg-red-50 text-red-700', marca: 'bg-red-600 text-white' },
  ajustada: { etiqueta: 'Margen corto', chip: 'bg-amber-50 text-amber-700', marca: 'bg-amber-500 text-white' },
  a_tiempo: { etiqueta: 'A tiempo', chip: 'bg-emerald-50 text-emerald-700', marca: 'bg-teal-600 text-white' },
  sin_fecha: { etiqueta: 'Sin fecha', chip: 'bg-slate-100 text-slate-600', marca: 'bg-slate-300 text-slate-700' },
}

// Una tarea de la lista: al hacer clic se abre su detalle (completar, editar, eliminar)
function Fila({ r, marca, onSeleccionar }: { r: ResultadoPrioridad; marca: string; onSeleccionar: (t: Tarea) => void }) {
  const estilo = estilos[r.estado]
  return (
    <li>
      <button
        onClick={() => onSeleccionar(r.tarea)}
        className="flex w-full items-start gap-4 rounded-xl bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${estilo.marca}`}>
          {marca}
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
}

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold text-slate-800">{titulo}</h2>
      {descripcion && <p className="mt-0.5 text-sm text-slate-500">{descripcion}</p>}
      <ol className="mt-3 space-y-3">{children}</ol>
    </section>
  )
}

// Recomendación del motor de reglas. Es una sugerencia: el usuario decide qué hacer.
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

  const decisiones = datos.resultados.filter((r) => r.estado === 'vencida' || r.estado === 'no_alcanza')
  const sugeridas = datos.resultados.filter((r) => r.orden !== null)
  const sinFecha = datos.resultados.filter((r) => r.estado === 'sin_fecha')

  return (
    <div className="mt-6 space-y-8">
      {decisiones.length > 0 && (
        <Seccion
          titulo={`Necesitan una decisión (${decisiones.length})`}
          descripcion="Con el tiempo que tienes no alcanzan a terminarse antes de su entrega. Puedes mover la fecha, reducir lo que harás o reservar más bloques de trabajo en Elige."
        >
          {decisiones.map((r) => (
            <Fila key={r.tareaId} r={r} marca="!" onSeleccionar={onSeleccionar} />
          ))}
        </Seccion>
      )}

      {sugeridas.length > 0 && (
        <Seccion
          titulo="Orden sugerido"
          descripcion="Si sigues este orden, todas estas tareas alcanzan a entregarse a tiempo."
        >
          {sugeridas.map((r) => (
            <Fila key={r.tareaId} r={r} marca={String(r.orden)} onSeleccionar={onSeleccionar} />
          ))}
        </Seccion>
      )}

      {sinFecha.length > 0 && (
        <Seccion titulo="Sin fecha de entrega" descripcion="Para cuando te quede tiempo libre.">
          {sinFecha.map((r) => (
            <Fila key={r.tareaId} r={r} marca="·" onSeleccionar={onSeleccionar} />
          ))}
        </Seccion>
      )}

      <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-700">Cómo se calcula</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            Tiempo disponible: en los días con plan cuentan tus bloques de estudio, trabajo y enfoque. En los días sin plan se asumen{' '}
            {formatearDuracion(datos.capacidadPorDefectoMin)} de trabajo repartidas entre las {formatearHora(datos.jornada.inicio)} y
            las {formatearHora(datos.jornada.fin)}
          </li>
          <li>Orden: primero lo que vence antes; si vencen al mismo tiempo, la de mayor prioridad.</li>
          <li>Si no alcanza para todo, se protege lo más importante y queda por fuera la de menor prioridad.</li>
          <li>Margen corto: cuando sobra menos de 1 h o menos de la cuarta parte de lo que dura la tarea.</li>
        </ul>
      </div>
    </div>
  )
}
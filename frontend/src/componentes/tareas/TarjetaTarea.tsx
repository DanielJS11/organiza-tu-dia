import type { Tarea } from '../../tipos'
import { describirEntrega, formatearDuracion, nombresPrioridad, type TonoEntrega } from '../../utilidades/formato'

type Props = {
  tarea: Tarea
  onCompletar: () => void
  onEditar: () => void
  onEliminar: () => void
}

const colorPrioridad = {
  ALTA: 'bg-rose-50 text-rose-700',
  MEDIA: 'bg-amber-50 text-amber-700',
  BAJA: 'bg-slate-100 text-slate-600',
}

const colorEntrega: Record<TonoEntrega, string> = {
  vencida: 'text-red-600 font-medium',
  pronto: 'text-amber-700 font-medium',
  normal: 'text-slate-500',
}

export default function TarjetaTarea({ tarea, onCompletar, onEditar, onEliminar }: Props) {
  const completada = tarea.estado === 'COMPLETADA'
  const entrega = tarea.fechaEntrega ? describirEntrega(tarea.fechaEntrega, completada) : null

  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-[auto_1fr_auto]">
      <input
        type="checkbox"
        checked={completada}
        disabled={completada}
        onChange={onCompletar}
        aria-label={completada ? 'Tarea completada' : 'Marcar como completada'}
        className="mt-1 h-5 w-5 shrink-0 accent-teal-600 cursor-pointer disabled:cursor-default"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`font-medium ${completada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{tarea.titulo}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorPrioridad[tarea.prioridad]}`}>
            {nombresPrioridad[tarea.prioridad]}
          </span>
          {tarea.estado === 'EN_PROGRESO' && (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">En progreso</span>
          )}
        </div>

        {tarea.descripcion && <p className="mt-1 text-sm text-slate-500">{tarea.descripcion}</p>}

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="text-slate-500">Estimado: {formatearDuracion(tarea.duracionEstimadaMin)}</span>
          {completada && tarea.tiempoRealMin != null && (
            <span className="text-slate-500">Real: {formatearDuracion(tarea.tiempoRealMin)}</span>
          )}
          {entrega && <span className={colorEntrega[entrega.tono]}>{entrega.texto}</span>}
        </div>
      </div>

      <div className="col-start-2 flex gap-1 text-sm -ml-2 sm:col-start-3 sm:ml-0">
        {!completada && (
          <button onClick={onEditar} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            Editar
          </button>
        )}
        <button onClick={onEliminar} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-red-50 hover:text-red-600">
          Eliminar
        </button>
      </div>
    </li>
  )
}
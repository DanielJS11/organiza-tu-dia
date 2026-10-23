import type { ReactNode } from 'react'
import type { BloqueVista } from '../../tipos'
import { formatearDuracion } from '../../utilidades/formato'
import { formatearHora } from '../../utilidades/tiempo'
import { duracionBloque, estiloTipo } from '../../utilidades/tiposBloque'

type Props = {
  bloques: BloqueVista[]
  acciones?: (indice: number) => ReactNode // botones opcionales de cada bloque (Editar, Eliminar…)
}

// Lista vertical de los bloques del día, con su horario, tipo, duración y la tarea asignada
export default function LineaDeTiempo({ bloques, acciones }: Props) {
  return (
    <ol className="space-y-2">
      {bloques.map((b, i) => {
        const estilo = estiloTipo[b.tipo]
        return (
          <li key={i} className={`flex items-stretch gap-3 rounded-lg ${estilo.fondo}`}>
            <span className={`w-1.5 shrink-0 rounded-l-lg ${estilo.barra}`} />
            <div className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 pr-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{b.titulo}</p>
                <p className="text-sm text-slate-500">
                  {formatearHora(b.horaInicio)} – {formatearHora(b.horaFin)}
                </p>
                {b.tarea && (
                  <p className={`mt-1 text-sm ${b.tarea.estado === 'COMPLETADA' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    Tarea: <span className="font-medium">{b.tarea.titulo}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`font-medium ${estilo.texto}`}>{estilo.nombre}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{formatearDuracion(duracionBloque(b))}</span>
                {acciones?.(i)}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
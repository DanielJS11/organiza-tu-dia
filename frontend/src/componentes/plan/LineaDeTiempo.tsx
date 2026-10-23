import type { BloqueVista } from '../../tipos'
import { formatearDuracion } from '../../utilidades/formato'
import { formatearHora } from '../../utilidades/tiempo'
import { duracionBloque, estiloTipo } from '../../utilidades/tiposBloque'

// Lista vertical de los bloques del día, con su horario, tipo y duración
export default function LineaDeTiempo({ bloques }: { bloques: BloqueVista[] }) {
  return (
    <ol className="space-y-2">
      {bloques.map((b, i) => {
        const estilo = estiloTipo[b.tipo]
        return (
          <li key={i} className={`flex items-stretch gap-3 rounded-lg ${estilo.fondo}`}>
            <span className={`w-1.5 shrink-0 rounded-l-lg ${estilo.barra}`} />
            <div className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 pr-3">
              <div>
                <p className="font-medium text-slate-800">{b.titulo}</p>
                <p className="text-sm text-slate-500">
                  {formatearHora(b.horaInicio)} – {formatearHora(b.horaFin)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-medium ${estilo.texto}`}>{estilo.nombre}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{formatearDuracion(duracionBloque(b))}</span>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
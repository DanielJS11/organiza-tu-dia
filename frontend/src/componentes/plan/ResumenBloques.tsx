import type { BloqueVista } from '../../tipos'
import { formatearDuracion } from '../../utilidades/formato'
import { duracionBloque, estiloTipo, resumenPorTipo } from '../../utilidades/tiposBloque'

// Barra horizontal proporcional al tiempo de cada bloque, con el total por tipo debajo
export default function ResumenBloques({ bloques }: { bloques: BloqueVista[] }) {
  const total = bloques.reduce((suma, b) => suma + duracionBloque(b), 0)

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        {bloques.map((b, i) => (
          <span key={i} className={estiloTipo[b.tipo].barra} style={{ width: `${(duracionBloque(b) / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {resumenPorTipo(bloques).map(([tipo, minutos]) => (
          <li key={tipo} className="flex items-center gap-1.5 text-slate-600">
            <span className={`h-2.5 w-2.5 rounded-full ${estiloTipo[tipo].barra}`} />
            {estiloTipo[tipo].nombre} {formatearDuracion(minutos)}
          </li>
        ))}
      </ul>
    </div>
  )
}
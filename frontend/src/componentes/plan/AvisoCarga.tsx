import type { CargaDia } from '../../tipos'
import { formatearDuracion } from '../../utilidades/formato'

// Resumen de cuánto pediste hacer en el día frente al tiempo de trabajo que tienes (RF-12)
export default function AvisoCarga({ carga }: { carga: CargaDia }) {
  if (carga.tareasUbicadas === 0) return null

  const porcentaje = carga.capacidadMin > 0 ? Math.min(100, (carga.necesitanMin / carga.capacidadMin) * 100) : 100
  const pasado = carga.excesoMin > 0

  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${pasado ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-600'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          {carga.tareasUbicadas === 1 ? '1 task placed' : `${carga.tareasUbicadas} tasks placed`} · they need{' '}
          <strong>{formatearDuracion(carga.necesitanMin)}</strong> · you have <strong>{formatearDuracion(carga.capacidadMin)}</strong> in
          work blocks
        </p>
        {!pasado && <span className="font-medium text-emerald-700">This day is realistic</span>}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" aria-hidden="true">
        <div className={`h-full rounded-full ${pasado ? 'bg-amber-500' : 'bg-teal-500'}`} style={{ width: `${porcentaje}%` }} />
      </div>
      {carga.mensaje && <p className="mt-2">{carga.mensaje}</p>}
      {carga.nota && <p className="mt-2 text-slate-600">{carga.nota}</p>}
    </div>
  )
}

import type { ResumenDiaDiario } from '../../tipos'
import { formatearDuracion } from '../../utilidades/formato'
import { formatearHora } from '../../utilidades/tiempo'

// Compara el tiempo real con el estimado en palabras
function comparar(estimado: number, real: number | null) {
  if (real === null) return `estimada en ${formatearDuracion(estimado)}`
  if (real === estimado) return `te tomó lo que estimaste (${formatearDuracion(real)})`
  return `estimaste ${formatearDuracion(estimado)} y te tomó ${formatearDuracion(real)}`
}

// Lo que pasó en el día según tus datos: tareas completadas y el plan que tenías
export default function ResumenDelDia({ resumen }: { resumen: ResumenDiaDiario }) {
  const { plan, completadas } = resumen

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-slate-800">Así fue tu día</h2>

      <h3 className="mt-4 text-sm font-medium text-slate-700">Tareas completadas</h3>
      {completadas.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500">No completaste tareas este día.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {completadas.map((t) => (
            <li key={t.id} className="text-sm">
              <span className="font-medium text-slate-800">✓ {t.titulo}</span>
              <span className="block text-slate-500">{comparar(t.duracionEstimadaMin, t.tiempoRealMin)}</span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-5 text-sm font-medium text-slate-700">Tu plan</h3>
      {!plan ? (
        <p className="mt-1 text-sm text-slate-500">No tenías un plan para este día.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-600">{plan.nombre}</p>
          {plan.bloques.length > 0 && (
            <ul className="mt-2 space-y-1">
              {plan.bloques.map((b) => (
                <li key={`${b.horaInicio}-${b.titulo}`} className="text-sm text-slate-600">
                  <span className="text-slate-500">{formatearHora(b.horaInicio)}</span> · {b.titulo}
                  {b.tarea && (
                    <span className={b.tarea.completada ? 'text-emerald-700' : 'text-slate-500'}>
                      {' '}
                      — {b.tarea.titulo}
                      {b.tarea.completada ? ' ✓' : ''}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
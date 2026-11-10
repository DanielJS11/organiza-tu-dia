import { useState } from 'react'
import type { PropuestaBloque } from '../../tipos'
import { claseBotonPrincipal, claseBotonSecundario } from '../../utilidades/estilos'
import { formatearDuracion } from '../../utilidades/formato'
import { fechaHoy, formatearDia, formatearHora, sumarDias } from '../../utilidades/tiempo'
import Modal from '../Modal'

type Props = {
  propuesta: PropuestaBloque[]
  avisos: string[]
  onAplicar: (elegidas: PropuestaBloque[]) => Promise<void>
  onDescartar: () => Promise<void>
  onCerrar: () => void
}

// "Hoy", "Mañana" o "Jueves, 12 de noviembre"
function tituloDia(fecha: string) {
  if (fecha === fechaHoy()) return 'Hoy'
  if (fecha === sumarDias(fechaHoy(), 1)) return 'Mañana'
  const texto = formatearDia(fecha)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Agrupa la propuesta por día, en orden de fecha
function porDia(propuesta: PropuestaBloque[]) {
  const grupos = new Map<string, PropuestaBloque[]>()
  for (const p of propuesta) grupos.set(p.fecha, [...(grupos.get(p.fecha) ?? []), p])
  return [...grupos].sort(([a], [b]) => a.localeCompare(b))
}

function Avisos({ avisos }: { avisos: string[] }) {
  if (avisos.length === 0) return null
  return (
    <div className="mt-4 space-y-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
      {avisos.map((a) => (
        <p key={a}>{a}</p>
      ))}
    </div>
  )
}

// Muestra la propuesta del motor, repartida en los días planificados desde hoy.
// El usuario elige qué aplicar (RF-14). Nada se aplica solo.
export default function DialogoSugerencia({ propuesta, avisos, onAplicar, onDescartar, onCerrar }: Props) {
  const [elegidas, setElegidas] = useState(() => new Set(propuesta.map((p) => p.bloqueId)))
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  function alternar(bloqueIds: string[], marcar: boolean) {
    const nuevas = new Set(elegidas)
    for (const id of bloqueIds) {
      if (marcar) nuevas.add(id)
      else nuevas.delete(id)
    }
    setElegidas(nuevas)
  }

  async function ejecutar(accion: () => Promise<void>) {
    setEnviando(true)
    setError('')
    try {
      await accion()
    } catch (err) {
      setError((err as Error).message)
      setEnviando(false)
    }
  }

  if (propuesta.length === 0) {
    return (
      <Modal titulo="Sugerir distribución" onCerrar={onCerrar}>
        <p className="text-sm text-slate-600">
          No hay nada que proponer: o no quedan bloques de estudio, trabajo o enfoque libres en tus días planificados, o tus tareas
          pendientes ya tienen todo su tiempo planeado.
        </p>
        <Avisos avisos={avisos} />
        <div className="mt-6 flex justify-end">
          <button onClick={onCerrar} className={claseBotonSecundario}>
            Entendido
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal titulo="Sugerencia de distribución" onCerrar={onCerrar}>
      <p className="text-sm text-slate-600">
        Reparte tus tareas en los bloques libres de tus días planificados, desde hoy, siguiendo tu orden sugerido: lo que vence antes va
        primero. Es solo una sugerencia: desmarca lo que no quieras y aplica el resto.
      </p>

      <Avisos avisos={avisos} />

      {porDia(propuesta).map(([fecha, items]) => {
        const ids = items.map((p) => p.bloqueId)
        const todas = ids.every((id) => elegidas.has(id))
        return (
          <section key={fecha} className="mt-5">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
              <input type="checkbox" checked={todas} onChange={() => alternar(ids, !todas)} className="h-4 w-4 accent-teal-600" />
              {tituloDia(fecha)}
            </label>
            <ul className="mt-2 space-y-2">
              {items.map((p) => (
                <li key={p.bloqueId}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={elegidas.has(p.bloqueId)}
                      onChange={() => alternar([p.bloqueId], !elegidas.has(p.bloqueId))}
                      className="mt-1 h-4 w-4 accent-teal-600"
                    />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block text-slate-500">
                        {formatearHora(p.bloque.horaInicio)} – {formatearHora(p.bloque.horaFin)} · {p.bloque.titulo} ({formatearDuracion(p.minutos)})
                      </span>
                      <span className="block font-medium text-slate-800">{p.tarea.titulo}</span>
                      <span className="block text-slate-500">{p.razon}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {error && <p role="alert" className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button onClick={() => ejecutar(onDescartar)} disabled={enviando} className={claseBotonSecundario}>
          Descartar
        </button>
        <button
          onClick={() => ejecutar(() => onAplicar(propuesta.filter((p) => elegidas.has(p.bloqueId))))}
          disabled={enviando || elegidas.size === 0}
          className={claseBotonPrincipal}
        >
          {enviando ? 'Aplicando…' : elegidas.size === propuesta.length ? 'Aplicar todo' : `Aplicar ${elegidas.size} de ${propuesta.length}`}
        </button>
      </div>
    </Modal>
  )
}
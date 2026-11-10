import { useState, type FormEvent } from 'react'
import type { DatosBloque, PlanOtroDia, Tarea, TipoBloque } from '../../tipos'
import { claseBotonPrincipal, claseBotonSecundario, claseCampo } from '../../utilidades/estilos'
import { formatearDuracion } from '../../utilidades/formato'
import { aMinutos, formatearDia } from '../../utilidades/tiempo'
import { estiloTipo } from '../../utilidades/tiposBloque'
import Campo from '../Campo'

type Props = {
  inicial: DatosBloque
  tareas: Tarea[] // tareas que se pueden asignar (las pendientes)
  minutosEnOtrosBloques: Record<string, number> // minutos que cada tarea ya tiene en los OTROS bloques del día
  otrosDias: PlanOtroDia[] // bloques de otros días (desde hoy) que ya tienen tarea
  esNuevo: boolean
  onGuardar: (datos: DatosBloque) => Promise<void>
  onCancelar: () => void
}

const tipos = Object.keys(estiloTipo) as TipoBloque[]

// "A" · "A y B" · "A, B y C"
function unir(partes: string[]) {
  return partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`
}

export default function FormularioBloque({ inicial, tareas, minutosEnOtrosBloques, otrosDias, esNuevo, onGuardar, onCancelar }: Props) {
  const [titulo, setTitulo] = useState(inicial.titulo)
  const [tipo, setTipo] = useState<TipoBloque>(inicial.tipo)
  const [horaInicio, setHoraInicio] = useState(inicial.horaInicio)
  const [horaFin, setHoraFin] = useState(inicial.horaFin)
  const [tareaId, setTareaId] = useState(inicial.tareaId ?? '')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const duracion = horaInicio && horaFin ? aMinutos(horaFin) - aMinutos(horaInicio) : 0
  const tarea = tareas.find((t) => t.id === tareaId)

  // Tiempo que cada tarea ya tiene planeado SIN este bloque: otros bloques de este día + otros días
  const planeadoSinEste = (id: string) =>
    (minutosEnOtrosBloques[id] ?? 0) + otrosDias.filter((p) => p.tareaId === id).reduce((total, p) => total + p.minutos, 0)

  const antes = tarea ? planeadoSinEste(tarea.id) : 0
  const totalPlaneado = antes + Math.max(duracion, 0)
  const falta = tarea ? tarea.duracionEstimadaMin - totalPlaneado : 0

  // Dónde está ese tiempo: "2 h en otros bloques de este día y 1 h 45 min el martes, 10 de noviembre"
  function dondeEsta(id: string) {
    const partes: string[] = []
    if (minutosEnOtrosBloques[id]) partes.push(`${formatearDuracion(minutosEnOtrosBloques[id])} en otros bloques de este día`)
    const porFecha = new Map<string, number>()
    for (const p of otrosDias.filter((p) => p.tareaId === id)) porFecha.set(p.fecha, (porFecha.get(p.fecha) ?? 0) + p.minutos)
    for (const [fecha, minutos] of [...porFecha].sort()) partes.push(`${formatearDuracion(minutos)} el ${formatearDia(fecha)}`)
    return unir(partes)
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (duracion <= 0) {
      setError('La hora de fin debe ser posterior a la de inicio')
      return
    }
    setEnviando(true)
    try {
      await onGuardar({ titulo, tipo, horaInicio, horaFin, tareaId: tareaId || null })
    } catch (err) {
      setError((err as Error).message)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Campo etiqueta="Nombre del bloque" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={60} />

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Tipo</span>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoBloque)} className={claseCampo}>
          {tipos.map((t) => (
            <option key={t} value={t}>
              {estiloTipo[t].nombre}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Empieza" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
        <Campo etiqueta="Termina" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} required />
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Tarea para este bloque (opcional)</span>
        <select value={tareaId} onChange={(e) => setTareaId(e.target.value)} className={claseCampo}>
          <option value="">Ninguna</option>
          {tareas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.titulo} ({formatearDuracion(t.duracionEstimadaMin)})
              {planeadoSinEste(t.id) >= t.duracionEstimadaMin ? ' · ya tiene su tiempo planeado' : ''}
            </option>
          ))}
        </select>
      </label>

      {/* Avisos orientativos (no impiden guardar): comparan la estimación con todo el tiempo ya planeado */}
      {tarea && duracion > 0 && falta > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Esta tarea está estimada en {formatearDuracion(tarea.duracionEstimadaMin)}.{' '}
          {antes > 0
            ? `Ya tiene ${dondeEsta(tarea.id)}; con este bloque tendrá ${formatearDuracion(totalPlaneado)} y le falta ${formatearDuracion(falta)}.`
            : `Este bloque dura ${formatearDuracion(duracion)}; le falta ${formatearDuracion(falta)}.`}{' '}
          Puedes alargar el bloque o asignarla también a otro.
        </p>
      )}
      {tarea && duracion > 0 && antes >= tarea.duracionEstimadaMin && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Esta tarea ya tiene su tiempo estimado ({formatearDuracion(tarea.duracionEstimadaMin)}) planeado: {dondeEsta(tarea.id)}. Este bloque
          sería tiempo extra. Guárdalo si crees que necesitará más, o usa el bloque para otra tarea.
        </p>
      )}
      {tarea && duracion > 0 && falta <= 0 && antes > 0 && antes < tarea.duracionEstimadaMin && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          Ya tiene {dondeEsta(tarea.id)}. Con este bloque completa sus {formatearDuracion(tarea.duracionEstimadaMin)} estimadas.
        </p>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancelar} className={claseBotonSecundario}>
          Cancelar
        </button>
        <button type="submit" disabled={enviando} className={claseBotonPrincipal}>
          {enviando ? 'Guardando…' : esNuevo ? 'Agregar bloque' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
import { useState, type FormEvent } from 'react'
import type { DatosBloque, Tarea, TipoBloque } from '../../tipos'
import { claseBotonPrincipal, claseBotonSecundario, claseCampo } from '../../utilidades/estilos'
import { formatearDuracion } from '../../utilidades/formato'
import { aMinutos } from '../../utilidades/tiempo'
import { estiloTipo } from '../../utilidades/tiposBloque'
import Campo from '../Campo'

type Props = {
  inicial: DatosBloque
  tareas: Tarea[] // tareas que se pueden asignar (las pendientes)
  minutosEnOtrosBloques: Record<string, number> // minutos que cada tarea ya tiene en los OTROS bloques del día
  esNuevo: boolean
  onGuardar: (datos: DatosBloque) => Promise<void>
  onCancelar: () => void
}

const tipos = Object.keys(estiloTipo) as TipoBloque[]

export default function FormularioBloque({ inicial, tareas, minutosEnOtrosBloques, esNuevo, onGuardar, onCancelar }: Props) {
  const [titulo, setTitulo] = useState(inicial.titulo)
  const [tipo, setTipo] = useState<TipoBloque>(inicial.tipo)
  const [horaInicio, setHoraInicio] = useState(inicial.horaInicio)
  const [horaFin, setHoraFin] = useState(inicial.horaFin)
  const [tareaId, setTareaId] = useState(inicial.tareaId ?? '')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const duracion = horaInicio && horaFin ? aMinutos(horaFin) - aMinutos(horaInicio) : 0
  const tarea = tareas.find((t) => t.id === tareaId)

  // Tiempo de la tarea en el día: lo que ya tiene en otros bloques + lo que le da este bloque
  const enOtros = tarea ? (minutosEnOtrosBloques[tarea.id] ?? 0) : 0
  const totalAsignado = enOtros + Math.max(duracion, 0)
  const falta = tarea ? tarea.duracionEstimadaMin - totalAsignado : 0

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
            </option>
          ))}
        </select>
      </label>

      {/* Aviso orientativo (no impide guardar): compara el tiempo estimado con el tiempo asignado en el día */}
      {tarea && duracion > 0 && falta > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Esta tarea está estimada en {formatearDuracion(tarea.duracionEstimadaMin)}.{' '}
          {enOtros > 0
            ? `Con este bloque tendrá ${formatearDuracion(totalAsignado)} asignados hoy; le falta ${formatearDuracion(falta)}.`
            : `Este bloque dura ${formatearDuracion(duracion)}; le falta ${formatearDuracion(falta)}.`}{' '}
          Puedes alargar el bloque o asignarla también a otro.
        </p>
      )}
      {tarea && duracion > 0 && falta <= 0 && enOtros > 0 && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          Con este bloque la tarea completa sus {formatearDuracion(tarea.duracionEstimadaMin)} estimadas para hoy.
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
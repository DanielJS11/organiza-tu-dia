import { useState, type FormEvent } from 'react'
import type { DatosTarea, EstadoTarea, Prioridad, Tarea } from '../../tipos'
import { aFechaLocal, nombresPrioridad } from '../../utilidades/formato'
import { claseBotonPrincipal, claseBotonSecundario, claseCampo } from '../../utilidades/estilos'
import Campo from '../Campo'
import CampoDuracion from './CampoDuracion'

type Props = {
  tarea?: Tarea // si viene, el formulario edita; si no, crea
  fechaInicial?: string // fecha sugerida al crear desde el calendario (formato "2026-10-24T23:59")
  onGuardar: (datos: DatosTarea) => Promise<void>
  onCancelar: () => void
}

const prioridades: Prioridad[] = ['ALTA', 'MEDIA', 'BAJA']
export default function FormularioTarea({ tarea, fechaInicial, onGuardar, onCancelar }: Props) {
  const [titulo, setTitulo] = useState(tarea?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(tarea?.descripcion ?? '')
    const fechaOriginal = tarea?.fechaEntrega ? aFechaLocal(tarea.fechaEntrega) : ''
    const [fechaEntrega, setFechaEntrega] = useState(fechaOriginal || fechaInicial || '')
  const [fechaMinima] = useState(() => aFechaLocal(new Date().toISOString())) // momento en que se abrió el formulario
  const [prioridad, setPrioridad] = useState<Prioridad>(tarea?.prioridad ?? 'MEDIA')
  const [duracion, setDuracion] = useState(tarea?.duracionEstimadaMin ?? 60)
  const [estado, setEstado] = useState<EstadoTarea>(tarea?.estado ?? 'PENDIENTE')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
    setError('')

    // No se permite una fecha pasada (si es la misma fecha que ya tenía la tarea, sí se acepta)
    if (fechaEntrega && fechaEntrega !== fechaOriginal && fechaEntrega < aFechaLocal(new Date().toISOString())) {
      setError('La fecha de entrega no puede estar en el pasado')
      return
    }

    setEnviando(true)
    try {
      await onGuardar({
        titulo,
        descripcion: descripcion.trim() || null,
        // El navegador interpreta la fecha en la hora local del usuario y la convierte a formato universal
        fechaEntrega: fechaEntrega ? new Date(fechaEntrega).toISOString() : null,
        prioridad,
        duracionEstimadaMin: duracion,
        ...(tarea && { estado }),
      })
    } catch (err) {
      setError((err as Error).message)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Campo etiqueta="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={120} autoFocus />

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Descripción (opcional)</span>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} maxLength={1000} className={claseCampo} />
      </label>

      <Campo
        etiqueta="Fecha de entrega (opcional)"
        type="datetime-local"
        value={fechaEntrega}
        onChange={(e) => setFechaEntrega(e.target.value)}
        min={tarea ? undefined : fechaMinima}
      />

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Prioridad</legend>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {prioridades.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrioridad(p)}
              aria-pressed={prioridad === p}
              className={`rounded-lg border py-2 text-sm font-medium ${
                prioridad === p ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {nombresPrioridad[p]}
            </button>
          ))}
        </div>
      </fieldset>

      <CampoDuracion etiqueta="Duración estimada" minutos={duracion} onChange={setDuracion} />

      {tarea && (
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Estado</span>
          <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoTarea)} className={claseCampo}>
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_PROGRESO">En progreso</option>
          </select>
        </label>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancelar} className={claseBotonSecundario}>
          Cancelar
        </button>
        <button type="submit" disabled={enviando} className={claseBotonPrincipal}>
          {enviando ? 'Guardando…' : tarea ? 'Guardar cambios' : 'Crear tarea'}
        </button>
      </div>
    </form>
  )
}
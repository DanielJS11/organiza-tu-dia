import { useState } from 'react'
import type { Tarea } from '../../tipos'
import { formatearDuracion } from '../../utilidades/formato'
import { claseBotonPrincipal, claseBotonSecundario } from '../../utilidades/estilos'
import Modal from '../Modal'
import CampoDuracion from './CampoDuracion'

type Props = {
  tarea: Tarea
  onCompletar: (tiempoRealMin: number | null) => Promise<void>
  onCerrar: () => void
}

// Al completar una tarea, pregunta (de forma opcional) cuánto tiempo tomó realmente
export default function DialogoCompletar({ tarea, onCompletar, onCerrar }: Props) {
  const [minutos, setMinutos] = useState(tarea.duracionEstimadaMin)
  const [enviando, setEnviando] = useState(false)

  async function completar(tiempo: number | null) {
    setEnviando(true)
    await onCompletar(tiempo)
  }

  return (
    <Modal titulo="¡Tarea completada!" onCerrar={onCerrar}>
      <p className="text-sm text-slate-600">
        Habías estimado <strong>{formatearDuracion(tarea.duracionEstimadaMin)}</strong> para "{tarea.titulo}". ¿Cuánto tiempo te tomó
        en realidad? Registrarlo te ayudará a estimar mejor.
      </p>
      <div className="mt-4">
        <CampoDuracion etiqueta="Tiempo real" minutos={minutos} onChange={setMinutos} />
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => completar(null)} disabled={enviando} className={claseBotonSecundario}>
          Completar sin registrar
        </button>
        <button type="button" onClick={() => completar(minutos)} disabled={enviando} className={claseBotonPrincipal}>
          Guardar tiempo
        </button>
      </div>
    </Modal>
  )
}
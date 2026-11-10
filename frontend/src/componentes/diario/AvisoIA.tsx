import { useState } from 'react'
import { useSesion } from '../../contexto/useSesion'

// Explica qué datos salen hacia la IA y permite activarla o desactivarla
export default function AvisoIA() {
  const { usuario, cambiarIA } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const activada = usuario?.iaActivada ?? false

  return (
    <div className="text-xs text-slate-500">
      <button onClick={() => setAbierto(!abierto)} className="underline decoration-dotted hover:text-slate-800" aria-expanded={abierto}>
        ¿Qué datos usa la IA?
      </button>
      {abierto && (
        <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3 leading-relaxed">
          <p>
            Solo cuando tú lo pides, se envían a Google Gemini (o a Groq, si Gemini no responde) el texto de tu entrada, sus etiquetas, las
            tareas del día con sus tiempos y tu plan. Para el resumen semanal, tus entradas de los últimos 7 días y las estadísticas. Nunca
            se envían tu nombre ni tu correo.
          </p>
          <p>Ojo: en el plan gratuito, Google puede usar lo que se le envía para mejorar sus productos.</p>
          <button onClick={() => cambiarIA(!activada)} className="font-medium text-teal-700 hover:text-teal-900">
            {activada ? 'Desactivar la IA' : 'Activar la IA'}
          </button>
        </div>
      )}
    </div>
  )
}
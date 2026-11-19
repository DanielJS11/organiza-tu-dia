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
        What data does the AI use?
      </button>
      {abierto && (
        <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3 leading-relaxed">
          <p>
            Only when you ask for it, the text of your entry, its tags, the day's tasks with their times and your plan are sent to Google
            Gemini (or to Groq, if Gemini doesn't respond). For the weekly summary, your entries from the last 7 days and the stats are
            sent. Your name and email are never sent.
          </p>
          <p>Note: on the free plan, Google may use what is sent to improve its products.</p>
          <button onClick={() => cambiarIA(!activada)} className="font-medium text-teal-700 hover:text-teal-900">
            {activada ? 'Turn off AI' : 'Turn on AI'}
          </button>
        </div>
      )}
    </div>
  )
}

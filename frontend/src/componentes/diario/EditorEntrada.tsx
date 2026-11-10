import { useRef, useState } from 'react'
import type { EntradaDiario } from '../../tipos'
import { claseBotonPrincipal, claseCampo } from '../../utilidades/estilos'
import CampoEtiquetas from './CampoEtiquetas'

const MAX_TEXTO = 5000

// Preguntas guía: ayudan a empezar cuando no se sabe qué escribir
const PREGUNTAS = ['¿Qué salió bien hoy?', '¿Qué se complicó y por qué?', '¿Qué harías distinto mañana?', '¿Cómo te sentiste con tu plan?']

type Props = {
  entrada: EntradaDiario | null
  sugerenciasEtiquetas: string[]
  onGuardar: (texto: string, etiquetas: string[]) => Promise<void>
  onEliminar: () => Promise<void>
}

// Escribir o editar la entrada de un día. Se monta de nuevo al cambiar de día (key en la página).
export default function EditorEntrada({ entrada, sugerenciasEtiquetas, onGuardar, onEliminar }: Props) {
  const [texto, setTexto] = useState(entrada?.texto ?? '')
  const [etiquetas, setEtiquetas] = useState(entrada?.etiquetas ?? [])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const areaTexto = useRef<HTMLTextAreaElement>(null)

  const hayCambios = texto.trim() !== (entrada?.texto ?? '') || etiquetas.join() !== (entrada?.etiquetas ?? []).join()

  function usarPregunta(pregunta: string) {
    const nuevo = texto.trim() ? `${texto.trimEnd()}\n\n${pregunta}\n` : `${pregunta}\n`
    setTexto(nuevo.slice(0, MAX_TEXTO))
    setAviso('')
    // El foco pasa al texto de inmediato (para no perder lo que se escriba) y, ya con la
    // pregunta agregada, el cursor queda al final, listo para responder
    areaTexto.current?.focus()
    requestAnimationFrame(() => {
      const area = areaTexto.current
      if (area) area.setSelectionRange(area.value.length, area.value.length)
    })
  }

  async function guardar() {
    setGuardando(true)
    setError('')
    try {
      await onGuardar(texto.trim(), etiquetas)
      setTexto(texto.trim())
      setAviso('Entrada guardada')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!window.confirm('¿Eliminar la entrada de este día?')) return
    try {
      await onEliminar()
      setTexto('')
      setEtiquetas([])
      setAviso('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-slate-800">{entrada ? 'Tu entrada' : 'Escribe sobre tu día'}</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        {PREGUNTAS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => usarPregunta(p)}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
          >
            {p}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="sr-only">Texto de la entrada</span>
        <textarea
          ref={areaTexto}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setAviso('')
          }}
          maxLength={MAX_TEXTO}
          rows={10}
          placeholder="¿Cómo te fue hoy? Puedes empezar con una de las preguntas de arriba."
          className={`${claseCampo} resize-y leading-relaxed`}
        />
      </label>
      <p className="mt-1 text-right text-xs text-slate-400">
        {texto.length} / {MAX_TEXTO}
      </p>

      <div className="mt-2">
        <CampoEtiquetas
          etiquetas={etiquetas}
          sugerencias={sugerenciasEtiquetas}
          onCambiar={(nuevas) => {
            setEtiquetas(nuevas)
            setAviso('')
          }}
        />
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          {entrada && (
            <button onClick={eliminar} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600">
              Eliminar entrada
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {aviso && !hayCambios && <span className="text-sm text-emerald-700">{aviso}</span>}
          <button onClick={guardar} disabled={guardando || !texto.trim() || !hayCambios} className={claseBotonPrincipal}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </section>
  )
}
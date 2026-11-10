import { useState, type KeyboardEvent } from 'react'
import { claseCampoBase } from '../../utilidades/estilos'

export const MAX_ETIQUETAS = 5

type Props = {
  etiquetas: string[]
  sugerencias: string[] // etiquetas que el usuario ya ha usado
  onCambiar: (etiquetas: string[]) => void
}

const normalizar = (texto: string) => texto.trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLowerCase().slice(0, 30)

// Etiquetas como "chips": se agregan con Enter o coma y se quitan con la ×
export default function CampoEtiquetas({ etiquetas, sugerencias, onCambiar }: Props) {
  const [texto, setTexto] = useState('')
  const lleno = etiquetas.length >= MAX_ETIQUETAS

  function agregar(valor: string) {
    const nueva = normalizar(valor)
    if (nueva && !etiquetas.includes(nueva) && !lleno) onCambiar([...etiquetas, nueva])
    setTexto('')
  }

  function teclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      agregar(texto)
    } else if (e.key === 'Backspace' && !texto && etiquetas.length) {
      onCambiar(etiquetas.slice(0, -1))
    }
  }

  const disponibles = sugerencias.filter((s) => !etiquetas.includes(s))

  return (
    <div>
      <span className="text-sm font-medium text-slate-700">Etiquetas (opcional)</span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {etiquetas.map((e) => (
          <span key={e} className="flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800">
            #{e}
            <button
              type="button"
              onClick={() => onCambiar(etiquetas.filter((x) => x !== e))}
              className="text-teal-600 hover:text-teal-900"
              aria-label={`Quitar la etiqueta ${e}`}
            >
              ×
            </button>
          </span>
        ))}
        {!lleno && (
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={teclear}
            onBlur={() => texto && agregar(texto)}
            list="etiquetas-usadas"
            placeholder="ej. enfoque, cansancio…"
            className={`${claseCampoBase} w-48 py-1 text-sm`}
            aria-label="Agregar etiqueta"
          />
        )}
        <datalist id="etiquetas-usadas">
          {disponibles.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {lleno ? `Máximo ${MAX_ETIQUETAS} etiquetas.` : 'Escribe y presiona Enter. Te sirven para encontrar días parecidos.'}
      </p>
    </div>
  )
}
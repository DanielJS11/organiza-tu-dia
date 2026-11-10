import type { FormEvent, ReactNode } from 'react'
import MarcoAcceso from './MarcoAcceso'

type Props = {
  titulo: string
  subtitulo: string
  textoBoton: string
  error: string
  enviando: boolean
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  pie: ReactNode
}

// Formulario compartido por las páginas de ingreso, registro y recuperación de contraseña
export default function FormularioAcceso({ titulo, subtitulo, textoBoton, error, enviando, onSubmit, children, pie }: Props) {
  return (
    <MarcoAcceso>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800">{titulo}</h1>
          <p className="mt-2 text-slate-600">{subtitulo}</p>
        </div>
        {children}
        {error && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-xl bg-teal-700 py-3 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {enviando ? 'Un momento…' : textoBoton}
        </button>
        <p className="text-center text-sm text-slate-600">{pie}</p>
      </form>
    </MarcoAcceso>
  )
}
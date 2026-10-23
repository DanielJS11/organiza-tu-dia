import type { FormEvent, ReactNode } from 'react'

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

// Tarjeta compartida por las páginas de ingreso y registro
export default function FormularioAcceso({ titulo, subtitulo, textoBoton, error, enviando, onSubmit, children, pie }: Props) {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{titulo}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
        </div>
        {children}
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-teal-600 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {enviando ? 'Un momento…' : textoBoton}
        </button>
        <p className="text-center text-sm text-slate-500">{pie}</p>
      </form>
    </main>
  )
}
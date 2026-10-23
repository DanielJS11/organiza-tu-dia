import { useEffect, type ReactNode } from 'react'

type Props = { titulo: string; onCerrar: () => void; children: ReactNode }

// Ventana flotante que se cierra con la tecla Escape o al hacer clic fuera
export default function Modal({ titulo, onCerrar, children }: Props) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-800">{titulo}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

type Props = { titulo: string; onCerrar: () => void; children: ReactNode }

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/*
  Ventana flotante accesible:
  - Se cierra con Escape o al hacer clic fuera.
  - Al abrirse, el foco del teclado entra en la ventana; con Tab no se sale de ella.
  - Al cerrarse, el foco vuelve al botón que la abrió.
*/
export default function Modal({ titulo, onCerrar, children }: Props) {
  const idTitulo = useId()
  // Elemento que tenía el foco al abrir (se lee al crear la ventana, antes de que algún campo con autoFocus lo tome)
  const [anterior] = useState(() => document.activeElement as HTMLElement | null)
  const ventana = useRef<HTMLDivElement>(null)
  // Siempre la versión más reciente de onCerrar, sin volver a montar el efecto principal
  const cerrar = useRef(onCerrar)
  useEffect(() => {
    cerrar.current = onCerrar
  })

  useEffect(() => {
    const nodo = ventana.current!
    // Primer campo de la ventana (o la ventana misma) recibe el foco
    const primero = nodo.querySelector<HTMLElement>('input, select, textarea') ?? nodo
    primero.focus()

    function alPresionar(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cerrar.current()
        return
      }
      if (e.key !== 'Tab') return
      // Mantiene el foco dentro de la ventana
      const elementos = [...nodo.querySelectorAll<HTMLElement>(ENFOCABLES)]
      if (elementos.length === 0) return
      const [inicio, fin] = [elementos[0], elementos[elementos.length - 1]]
      if (e.shiftKey && document.activeElement === inicio) {
        e.preventDefault()
        fin.focus()
      } else if (!e.shiftKey && document.activeElement === fin) {
        e.preventDefault()
        inicio.focus()
      }
    }

    window.addEventListener('keydown', alPresionar)
    return () => {
      window.removeEventListener('keydown', alPresionar)
      anterior?.focus()
    }
  }, [anterior])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div
        ref={ventana}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={idTitulo} className="text-lg font-semibold text-slate-800">
          {titulo}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
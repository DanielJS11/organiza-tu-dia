import type { ReactNode } from 'react'
import { seccionDe } from '../utilidades/secciones'

type Props = { ruta: '/elige' | '/organiza' | '/reflexiona'; descripcion: ReactNode; acciones?: ReactNode }

// Título de cada sección con el icono y el color de su momento del día
export default function EncabezadoPagina({ ruta, descripcion, acciones }: Props) {
  const { nombre, Icono, tinte } = seccionDe(ruta)
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-4">
        <span className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tinte}`}>
          <Icono className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold text-slate-800">{nombre}</h1>
          <p className="mt-1 max-w-prose text-slate-600">{descripcion}</p>
        </div>
      </div>
      {acciones}
    </div>
  )
}
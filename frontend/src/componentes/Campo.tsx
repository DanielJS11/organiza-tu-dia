import type { InputHTMLAttributes } from 'react'
import { claseCampo } from '../utilidades/estilos'

type Props = InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }

export default function Campo({ etiqueta, ...props }: Props) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{etiqueta}</span>
      <input {...props} className={claseCampo} />
    </label>
  )
}
import { claseCampoBase } from '../../utilidades/estilos'
import { fechaHoy, sumarDias } from '../../utilidades/tiempo'

type Props = { fecha: string; onCambiar: (fecha: string) => void }

// Atajos "Hoy" y "Ayer" más un selector para cualquier día que ya pasó (nunca uno futuro)
export default function SelectorFechaDiario({ fecha, onCambiar }: Props) {
  const hoy = fechaHoy()
  const atajos = [
    { valor: hoy, nombre: 'Hoy' },
    { valor: sumarDias(hoy, -1), nombre: 'Ayer' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {atajos.map((a) => (
        <button
          key={a.valor}
          onClick={() => onCambiar(a.valor)}
          aria-pressed={fecha === a.valor}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            fecha === a.valor ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
          }`}
        >
          {a.nombre}
        </button>
      ))}
      <input
        type="date"
        value={fecha}
        max={hoy}
        onChange={(e) => e.target.value && e.target.value <= hoy && onCambiar(e.target.value)}
        className={claseCampoBase}
        aria-label="Elegir otro día"
      />
    </div>
  )
}
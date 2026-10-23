import { claseCampoBase } from '../../utilidades/estilos'
import { fechaHoy, sumarDias } from '../../utilidades/tiempo'

type Props = { fecha: string; onCambiar: (fecha: string) => void }

// Atajos "Hoy" y "Mañana" más un selector para cualquier otro día (nunca uno pasado)
export default function SelectorFecha({ fecha, onCambiar }: Props) {
  const hoy = fechaHoy()
  const manana = sumarDias(hoy, 1)
  const atajos = [
    { valor: hoy, nombre: 'Hoy' },
    { valor: manana, nombre: 'Mañana' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {atajos.map((a) => (
        <button
          key={a.valor}
          onClick={() => onCambiar(a.valor)}
          aria-pressed={fecha === a.valor}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            fecha === a.valor ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
          }`}
        >
          {a.nombre}
        </button>
      ))}
      <input
        type="date"
        value={fecha}
        min={hoy}
        onChange={(e) => e.target.value && onCambiar(e.target.value)}
        className={claseCampoBase}
        aria-label="Elegir otra fecha"
      />
    </div>
  )
}
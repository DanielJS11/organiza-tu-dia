import { claseCampoBase } from '../../utilidades/estilos'

type Props = { etiqueta: string; minutos: number; onChange: (minutos: number) => void }

// Pide la duración en horas y minutos, y la entrega en minutos
export default function CampoDuracion({ etiqueta, minutos, onChange }: Props) {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60

  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">{etiqueta}</legend>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={24}
          value={horas}
          onChange={(e) => onChange(Number(e.target.value) * 60 + resto)}
          className={`${claseCampoBase} w-20`}
          aria-label="Horas"
        />
        <span className="text-sm text-slate-500">h</span>
        <input
          type="number"
          min={0}
          max={59}
          step={5}
          value={resto}
          onChange={(e) => onChange(horas * 60 + Number(e.target.value))}
          className={`${claseCampoBase} w-20`}
          aria-label="Minutos"
        />
        <span className="text-sm text-slate-500">min</span>
      </div>
    </fieldset>
  )
}
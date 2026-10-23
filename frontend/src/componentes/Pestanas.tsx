type Opcion<T extends string> = { valor: T; nombre: string }

type Props<T extends string> = {
  opciones: Opcion<T>[]
  valor: T
  onCambiar: (valor: T) => void
}

// Grupo de botones tipo pestaña: se usa para cambiar de vista y para filtrar
export default function Pestanas<T extends string>({ opciones, valor, onCambiar }: Props<T>) {
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          onClick={() => onCambiar(o.valor)}
          aria-pressed={valor === o.valor}
          className={`rounded-md px-3 py-1.5 text-sm ${valor === o.valor ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-600'}`}
        >
          {o.nombre}
        </button>
      ))}
    </div>
  )
}
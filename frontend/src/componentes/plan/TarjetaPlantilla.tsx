import type { Plantilla } from '../../tipos'
import { formatearHora } from '../../utilidades/tiempo'
import { bloquesDePlantilla } from '../../utilidades/tiposBloque'
import ResumenBloques from './ResumenBloques'

type Props = { plantilla: Plantilla; onVer: () => void }

export default function TarjetaPlantilla({ plantilla, onVer }: Props) {
  const bloques = bloquesDePlantilla(plantilla.bloques)
  const inicio = bloques[0]?.horaInicio
  const fin = bloques.at(-1)?.horaFin

  return (
    <button onClick={onVer} className="flex flex-col rounded-2xl bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md">
      <h3 className="text-lg font-semibold text-slate-800">{plantilla.nombre}</h3>
      <p className="mt-1 text-sm text-slate-500">{plantilla.descripcion}</p>
      {inicio && fin && (
        <p className="mt-3 text-sm text-slate-500">
          {formatearHora(inicio)} – {formatearHora(fin)} · {bloques.length} bloques
        </p>
      )}
      <div className="mt-4">
        <ResumenBloques bloques={bloques} />
      </div>
      <span className="mt-4 text-sm font-medium text-teal-700">Ver detalle →</span>
    </button>
  )
}
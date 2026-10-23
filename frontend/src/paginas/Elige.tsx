import { useState } from 'react'
import type { Plantilla } from '../tipos'
import { usePlantillas } from '../hooks/usePlantillas'
import { useDia } from '../hooks/useDia'
import { fechaHoy, formatearDia, sumarDias } from '../utilidades/tiempo'
import { bloquesDePlantilla } from '../utilidades/tiposBloque'
import { claseBotonPrincipal, claseBotonSecundario } from '../utilidades/estilos'
import Modal from '../componentes/Modal'
import SelectorFecha from '../componentes/plan/SelectorFecha'
import LineaDeTiempo from '../componentes/plan/LineaDeTiempo'
import ResumenBloques from '../componentes/plan/ResumenBloques'
import TarjetaPlantilla from '../componentes/plan/TarjetaPlantilla'

// "hoy", "mañana" o "el viernes, 30 de octubre"
function nombrarDia(fecha: string) {
  if (fecha === fechaHoy()) return 'hoy'
  if (fecha === sumarDias(fechaHoy(), 1)) return 'mañana'
  return `el ${formatearDia(fecha)}`
}

export default function Elige() {
  const [fecha, setFecha] = useState(fechaHoy())
  const { plantillas, cargando: cargandoPlantillas, error: errorPlantillas } = usePlantillas()
  const { dia, cargando: cargandoDia, error: errorDia, aplicarPlantilla, quitarPlan } = useDia(fecha)
  const [cambiando, setCambiando] = useState(false)
  const [vistaPrevia, setVistaPrevia] = useState<Plantilla | null>(null)
  const [aplicando, setAplicando] = useState(false)
  const [error, setError] = useState('')

  const mostrarPlantillas = !dia || cambiando

  function cambiarFecha(nueva: string) {
    setFecha(nueva)
    setCambiando(false)
  }

  async function aplicar(plantilla: Plantilla) {
    setAplicando(true)
    setError('')
    try {
      await aplicarPlantilla(plantilla.id)
      setVistaPrevia(null)
      setCambiando(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setAplicando(false)
    }
  }

  async function confirmarQuitar() {
    if (window.confirm(`¿Quitar el plan de ${nombrarDia(fecha)}?`)) {
      await quitarPlan()
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Elige</h1>
      <p className="mt-1 text-slate-500">No tienes que diseñar tu día desde cero: elige la estructura que mejor le queda.</p>

      <div className="mt-6">
        <SelectorFecha fecha={fecha} onCambiar={cambiarFecha} />
      </div>

      {(errorDia || errorPlantillas) && (
        <p className="mt-6 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorDia || errorPlantillas}</p>
      )}

      {cargandoDia || cargandoPlantillas ? (
        <p className="mt-8 text-center text-slate-500">Cargando…</p>
      ) : (
        <>
          {dia && !cambiando && (
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Tu plan para {nombrarDia(fecha)}</p>
                  <h2 className="text-xl font-semibold text-slate-800">{dia.plantilla?.nombre ?? 'Plan personalizado'}</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCambiando(true)} className={claseBotonSecundario}>
                    Cambiar plantilla
                  </button>
                  <button onClick={confirmarQuitar} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600">
                    Quitar plan
                  </button>
                </div>
              </div>
              <div className="mt-5">
                <ResumenBloques bloques={dia.bloques} />
              </div>
              <div className="mt-5">
                <LineaDeTiempo bloques={dia.bloques} />
              </div>
            </section>
          )}

          {mostrarPlantillas && (
            <section className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-800">
                  {cambiando ? `Elige otra plantilla para ${nombrarDia(fecha)}` : `¿Cómo quieres vivir ${nombrarDia(fecha)}?`}
                </h2>
                {cambiando && (
                  <button onClick={() => setCambiando(false)} className="text-sm text-slate-500 hover:text-slate-800">
                    Cancelar
                  </button>
                )}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {plantillas.map((p) => (
                  <TarjetaPlantilla key={p.id} plantilla={p} onVer={() => setVistaPrevia(p)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {vistaPrevia && (
        <Modal titulo={vistaPrevia.nombre} onCerrar={() => setVistaPrevia(null)}>
          <p className="text-sm text-slate-500">{vistaPrevia.descripcion}</p>
          <div className="mt-4">
            <LineaDeTiempo bloques={bloquesDePlantilla(vistaPrevia.bloques)} />
          </div>
          {dia && <p className="mt-4 text-sm text-amber-700">Esto reemplazará el plan que ya tienes para {nombrarDia(fecha)}.</p>}
          {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button onClick={() => setVistaPrevia(null)} className={claseBotonSecundario}>
              Volver
            </button>
            <button onClick={() => aplicar(vistaPrevia)} disabled={aplicando} className={claseBotonPrincipal}>
              {aplicando ? 'Aplicando…' : `Usar para ${nombrarDia(fecha)}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
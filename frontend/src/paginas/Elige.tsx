import { useState } from 'react'
import type { Bloque, DatosBloque, Plantilla } from '../tipos'
import { usePlantillas } from '../hooks/usePlantillas'
import { useDia } from '../hooks/useDia'
import { useTareas } from '../hooks/useTareas'
import { aHora, aMinutos, fechaHoy, formatearDia, sumarDias } from '../utilidades/tiempo'
import { bloquesDePlantilla, duracionBloque } from '../utilidades/tiposBloque'
import { claseBotonPrincipal, claseBotonSecundario } from '../utilidades/estilos'
import Modal from '../componentes/Modal'
import SelectorFecha from '../componentes/plan/SelectorFecha'
import LineaDeTiempo from '../componentes/plan/LineaDeTiempo'
import ResumenBloques from '../componentes/plan/ResumenBloques'
import TarjetaPlantilla from '../componentes/plan/TarjetaPlantilla'
import FormularioBloque from '../componentes/plan/FormularioBloque'

// "hoy", "mañana" o "el viernes, 30 de octubre"
function nombrarDia(fecha: string) {
  if (fecha === fechaHoy()) return 'hoy'
  if (fecha === sumarDias(fechaHoy(), 1)) return 'mañana'
  return `el ${formatearDia(fecha)}`
}

// Minutos que cada tarea tiene asignados en el día, sin contar el bloque que se está editando
function minutosPorTarea(bloques: Bloque[], excluirId?: string) {
  const minutos: Record<string, number> = {}
  for (const b of bloques) {
    if (b.tareaId && b.id !== excluirId) minutos[b.tareaId] = (minutos[b.tareaId] ?? 0) + duracionBloque(b)
  }
  return minutos
}

// Un bloque nuevo empieza donde termina el último y dura una hora (sin pasar de las 11:59 p. m.)
function bloqueNuevo(bloques: Bloque[]): DatosBloque {
  const inicio = Math.min(bloques.length ? aMinutos(bloques[bloques.length - 1].horaFin) : 8 * 60, 23 * 60)
  return { tipo: 'PERSONAL', titulo: '', horaInicio: aHora(inicio), horaFin: aHora(Math.min(inicio + 60, 23 * 60 + 59)), tareaId: null }
}

export default function Elige() {
  const [fecha, setFecha] = useState(fechaHoy())
  const { plantillas, cargando: cargandoPlantillas, error: errorPlantillas } = usePlantillas()
  const { dia, cargando: cargandoDia, error: errorDia, aplicarPlantilla, quitarPlan, agregarBloque, editarBloque, eliminarBloque } =
    useDia(fecha)
  const { tareas } = useTareas()
  const [cambiando, setCambiando] = useState(false)
  const [vistaPrevia, setVistaPrevia] = useState<Plantilla | null>(null)
  const [aplicando, setAplicando] = useState(false)
  const [error, setError] = useState('')
  // Bloque que se está editando: { bloque: null } significa que se está agregando uno nuevo
  const [editandoBloque, setEditandoBloque] = useState<{ bloque: Bloque | null } | null>(null)

  const mostrarPlantillas = !dia || cambiando
  const pendientes = tareas.filter((t) => t.estado !== 'COMPLETADA')
  const idsUbicadas = new Set(dia?.bloques.map((b) => b.tareaId).filter(Boolean))
  const sinUbicar = pendientes.filter((t) => !idsUbicadas.has(t.id))

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

  async function confirmarEliminarBloque(bloque: Bloque) {
    if (window.confirm(`¿Eliminar el bloque "${bloque.titulo}"?`)) {
      await eliminarBloque(bloque.id)
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
                <LineaDeTiempo
                  bloques={dia.bloques}
                  acciones={(i) => (
                    <span className="flex gap-1">
                      <button
                        onClick={() => setEditandoBloque({ bloque: dia.bloques[i] })}
                        className="rounded-lg px-2 py-1 text-slate-500 hover:bg-white hover:text-slate-800"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => confirmarEliminarBloque(dia.bloques[i])}
                        className="rounded-lg px-2 py-1 text-slate-500 hover:bg-white hover:text-red-600"
                      >
                        Eliminar
                      </button>
                    </span>
                  )}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button onClick={() => setEditandoBloque({ bloque: null })} className={claseBotonSecundario}>
                  + Agregar bloque
                </button>
                {pendientes.length > 0 && (
                  <p className="text-sm text-slate-500">
                    {sinUbicar.length === 0
                      ? 'Todas tus tareas pendientes tienen un bloque.'
                      : `${sinUbicar.length} de ${pendientes.length} tareas pendientes aún sin bloque. Usa "Editar" en un bloque para asignarlas.`}
                  </p>
                )}
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

      {editandoBloque && dia && (
        <Modal titulo={editandoBloque.bloque ? 'Editar bloque' : 'Agregar bloque'} onCerrar={() => setEditandoBloque(null)}>
          <FormularioBloque
            esNuevo={!editandoBloque.bloque}
                        inicial={editandoBloque.bloque ?? bloqueNuevo(dia.bloques)}
            minutosEnOtrosBloques={minutosPorTarea(dia.bloques, editandoBloque.bloque?.id)}
            // Se ofrecen las tareas pendientes; si el bloque ya tenía una completada, también se muestra
            tareas={tareas.filter((t) => t.estado !== 'COMPLETADA' || t.id === editandoBloque.bloque?.tareaId)}
            onGuardar={async (datos) => {
              if (editandoBloque.bloque) await editarBloque(editandoBloque.bloque.id, datos)
              else await agregarBloque(datos)
              setEditandoBloque(null)
            }}
            onCancelar={() => setEditandoBloque(null)}
          />
        </Modal>
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
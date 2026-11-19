import { useState } from 'react'
import type { Prioridad, Tarea } from '../tipos'
import { useTareas } from '../hooks/useTareas'
import { aFechaLocal, formatearDuracion } from '../utilidades/formato'
import { claseBotonPrincipal, claseCampoBase } from '../utilidades/estilos'
import Modal from '../componentes/Modal'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import FormularioTarea from '../componentes/tareas/FormularioTarea'
import TarjetaTarea from '../componentes/tareas/TarjetaTarea'
import DialogoCompletar from '../componentes/tareas/DialogoCompletar'
import CalendarioTareas from '../componentes/tareas/CalendarioTareas'
import Pestanas from '../componentes/Pestanas'
import PorDondeEmpezar from '../componentes/tareas/PorDondeEmpezar'

type Vista = 'lista' | 'prioridades' | 'calendario'
type FiltroEstado = 'pendientes' | 'completadas' | 'todas'

const vistas: { valor: Vista; nombre: string }[] = [
  { valor: 'lista', nombre: 'List' },
  { valor: 'prioridades', nombre: 'Where to start' },
  { valor: 'calendario', nombre: 'Calendar' },
]

const filtrosEstado: { valor: FiltroEstado; nombre: string }[] = [
  { valor: 'pendientes', nombre: 'Pending' },
  { valor: 'completadas', nombre: 'Completed' },
  { valor: 'todas', nombre: 'All' },
]

export default function Organiza() {
  const { tareas, cargando, error, crear, editar, eliminar } = useTareas()
  const [vista, setVista] = useState<Vista>('lista')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('pendientes')
  const [filtroPrioridad, setFiltroPrioridad] = useState<Prioridad | 'TODAS'>('TODAS')
  const [creando, setCreando] = useState<{ fechaInicial?: string } | null>(null)
  const [editando, setEditando] = useState<Tarea | null>(null)
  const [completando, setCompletando] = useState<Tarea | null>(null)
  const [detalle, setDetalle] = useState<Tarea | null>(null)

  const pendientes = tareas.filter((t) => t.estado !== 'COMPLETADA')
  const minutosPendientes = pendientes.reduce((total, t) => total + t.duracionEstimadaMin, 0)

  const visibles = tareas.filter((t) => {
    const completada = t.estado === 'COMPLETADA'
    if (filtroEstado === 'pendientes' && completada) return false
    if (filtroEstado === 'completadas' && !completada) return false
    return filtroPrioridad === 'TODAS' || t.prioridad === filtroPrioridad
  })

  function confirmarEliminar(tarea: Tarea) {
    if (window.confirm(`Delete "${tarea.titulo}"? This can't be undone.`)) {
      eliminar(tarea.id)
      setDetalle(null)
    }
  }

  // Al hacer clic en un día del calendario se abre "Nueva tarea" con esa fecha (nunca en el pasado)
  function crearDesdeCalendario(fecha: Date, todoElDia: boolean) {
    const ahora = new Date()
    const sugerida = new Date(fecha)
    if (todoElDia) sugerida.setHours(23, 59, 0, 0)
    if (sugerida < ahora) return
    setCreando({ fechaInicial: aFechaLocal(sugerida.toISOString()) })
  }

  // Botones de cada tarea; desde el detalle del calendario primero se cierra la ventana
  const accionesTarea = (t: Tarea) => ({
    onCompletar: () => {
      setDetalle(null)
      setCompletando(t)
    },
    onEditar: () => {
      setDetalle(null)
      setEditando(t)
    },
    onEliminar: () => confirmarEliminar(t),
  })

  return (
    <div>
      <EncabezadoPagina
        ruta="/organize"
        descripcion={
          pendientes.length === 0
            ? 'You have no pending tasks.'
            : `You have ${pendientes.length} ${pendientes.length === 1 ? 'pending task' : 'pending tasks'}, about ${formatearDuracion(minutosPendientes)} of estimated work.`
        }
        acciones={
          <button onClick={() => setCreando({})} className={claseBotonPrincipal}>
            + New task
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Pestanas opciones={vistas} valor={vista} onCambiar={setVista} />
        {vista === 'lista' && (
          <div className="flex flex-wrap gap-3">
            <Pestanas opciones={filtrosEstado} valor={filtroEstado} onCambiar={setFiltroEstado} />
            <select
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value as Prioridad | 'TODAS')}
              className={claseCampoBase}
              aria-label="Filter by priority"
            >
              <option value="TODAS">All priorities</option>
              <option value="ALTA">High priority</option>
              <option value="MEDIA">Medium priority</option>
              <option value="BAJA">Low priority</option>
            </select>
          </div>
        )}
      </div>

      {error && <p role="alert" className="mt-6 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {cargando ? (
        <p className="mt-8 text-center text-slate-500">Loading tasks…</p>
      ) : vista === 'prioridades' ? (
        <PorDondeEmpezar tareas={tareas} onSeleccionar={setDetalle} />
      ) : vista === 'calendario' ? (
        <div className="mt-6">
          <CalendarioTareas tareas={tareas} onSeleccionarTarea={setDetalle} onSeleccionarFecha={crearDesdeCalendario} />
          <p className="mt-3 text-sm text-slate-500">
            Click a day to create a task with that date. Tasks without a due date only appear in the list.
          </p>
        </div>
      ) : visibles.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {tareas.length === 0 ? 'You have no tasks yet. Create the first one with "+ New task".' : 'No tasks match these filters.'}
        </p>
      ) : (
        <>
          <h2 className="sr-only">Your tasks</h2>
          <ul className="mt-6 space-y-3">
            {visibles.map((t) => (
              <TarjetaTarea key={t.id} tarea={t} {...accionesTarea(t)} />
            ))}
          </ul>
        </>
      )}

      {detalle && (
        <Modal titulo="Task details" onCerrar={() => setDetalle(null)}>
          <ul className="rounded-xl border border-slate-200">
            <TarjetaTarea tarea={detalle} {...accionesTarea(detalle)} />
          </ul>
        </Modal>
      )}

      {creando && (
        <Modal titulo="New task" onCerrar={() => setCreando(null)}>
          <FormularioTarea
            fechaInicial={creando.fechaInicial}
            onGuardar={async (datos) => {
              await crear(datos)
              setCreando(null)
            }}
            onCancelar={() => setCreando(null)}
          />
        </Modal>
      )}

      {editando && (
        <Modal titulo="Edit task" onCerrar={() => setEditando(null)}>
          <FormularioTarea
            tarea={editando}
            onGuardar={async (datos) => {
              await editar(editando.id, datos)
              setEditando(null)
            }}
            onCancelar={() => setEditando(null)}
          />
        </Modal>
      )}

      {completando && (
        <DialogoCompletar
          tarea={completando}
          onCompletar={async (tiempoRealMin) => {
            await editar(completando.id, { estado: 'COMPLETADA', tiempoRealMin })
            setCompletando(null)
          }}
          onCerrar={() => setCompletando(null)}
        />
      )}
    </div>
  )
}

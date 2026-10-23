import { useState } from 'react'
import type { Prioridad, Tarea } from '../tipos'
import { useTareas } from '../hooks/useTareas'
import { aFechaLocal, formatearDuracion } from '../utilidades/formato'
import { claseBotonPrincipal, claseCampoBase } from '../utilidades/estilos'
import Modal from '../componentes/Modal'
import FormularioTarea from '../componentes/tareas/FormularioTarea'
import TarjetaTarea from '../componentes/tareas/TarjetaTarea'
import DialogoCompletar from '../componentes/tareas/DialogoCompletar'
import CalendarioTareas from '../componentes/tareas/CalendarioTareas'
import Pestanas from '../componentes/Pestanas'
import PorDondeEmpezar from '../componentes/tareas/PorDondeEmpezar'

type Vista = 'lista' | 'prioridades' | 'calendario'
type FiltroEstado = 'pendientes' | 'completadas' | 'todas'

const vistas: { valor: Vista; nombre: string }[] = [
    { valor: 'lista', nombre: 'Lista' },
  { valor: 'prioridades', nombre: 'Por dónde empezar' },
  { valor: 'calendario', nombre: 'Calendario' },
]

const filtrosEstado: { valor: FiltroEstado; nombre: string }[] = [
  { valor: 'pendientes', nombre: 'Pendientes' },
  { valor: 'completadas', nombre: 'Completadas' },
  { valor: 'todas', nombre: 'Todas' },
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
    if (window.confirm(`¿Eliminar "${tarea.titulo}"? Esta acción no se puede deshacer.`)) {
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Organiza</h1>
          <p className="mt-1 text-slate-500">
            {pendientes.length === 0
              ? 'No tienes tareas pendientes.'
              : `${pendientes.length} ${pendientes.length === 1 ? 'tarea pendiente' : 'tareas pendientes'} · ${formatearDuracion(minutosPendientes)} estimadas`}
          </p>
        </div>
        <button onClick={() => setCreando({})} className={claseBotonPrincipal}>
          + Nueva tarea
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Pestanas opciones={vistas} valor={vista} onCambiar={setVista} />
        {vista === 'lista' && (
          <div className="flex flex-wrap gap-3">
            <Pestanas opciones={filtrosEstado} valor={filtroEstado} onCambiar={setFiltroEstado} />
            <select
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value as Prioridad | 'TODAS')}
              className={claseCampoBase}
              aria-label="Filtrar por prioridad"
            >
              <option value="TODAS">Todas las prioridades</option>
              <option value="ALTA">Prioridad alta</option>
              <option value="MEDIA">Prioridad media</option>
              <option value="BAJA">Prioridad baja</option>
            </select>
          </div>
        )}
      </div>

      {error && <p className="mt-6 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {cargando ? (
        <p className="mt-8 text-center text-slate-500">Cargando tareas…</p>
            ) : vista === 'prioridades' ? (
        <PorDondeEmpezar tareas={tareas} onSeleccionar={setDetalle} />
      ) : vista === 'calendario' ? (
        <div className="mt-6">
          <CalendarioTareas tareas={tareas} onSeleccionarTarea={setDetalle} onSeleccionarFecha={crearDesdeCalendario} />
          <p className="mt-3 text-sm text-slate-500">
            Haz clic en un día para crear una tarea con esa fecha. Las tareas sin fecha de entrega solo aparecen en la lista.
          </p>
        </div>
      ) : visibles.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {tareas.length === 0 ? 'Aún no tienes tareas. Crea la primera con "+ Nueva tarea".' : 'No hay tareas con estos filtros.'}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {visibles.map((t) => (
            <TarjetaTarea key={t.id} tarea={t} {...accionesTarea(t)} />
          ))}
        </ul>
      )}

      {detalle && (
        <Modal titulo="Detalle de la tarea" onCerrar={() => setDetalle(null)}>
          <ul className="rounded-xl border border-slate-200">
            <TarjetaTarea tarea={detalle} {...accionesTarea(detalle)} />
          </ul>
        </Modal>
      )}

      {creando && (
        <Modal titulo="Nueva tarea" onCerrar={() => setCreando(null)}>
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
        <Modal titulo="Editar tarea" onCerrar={() => setEditando(null)}>
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
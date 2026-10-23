import { useState } from 'react'
import type { Prioridad, Tarea } from '../tipos'
import { useTareas } from '../hooks/useTareas'
import { formatearDuracion } from '../utilidades/formato'
import { claseBotonPrincipal, claseCampoBase } from '../utilidades/estilos'
import Modal from '../componentes/Modal'
import FormularioTarea from '../componentes/tareas/FormularioTarea'
import TarjetaTarea from '../componentes/tareas/TarjetaTarea'
import DialogoCompletar from '../componentes/tareas/DialogoCompletar'

type FiltroEstado = 'pendientes' | 'completadas' | 'todas'

const filtrosEstado: { valor: FiltroEstado; nombre: string }[] = [
  { valor: 'pendientes', nombre: 'Pendientes' },
  { valor: 'completadas', nombre: 'Completadas' },
  { valor: 'todas', nombre: 'Todas' },
]

export default function Organiza() {
  const { tareas, cargando, error, crear, editar, eliminar } = useTareas()
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('pendientes')
  const [filtroPrioridad, setFiltroPrioridad] = useState<Prioridad | 'TODAS'>('TODAS')
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Tarea | null>(null)
  const [completando, setCompletando] = useState<Tarea | null>(null)

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
    }
  }

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
        <button onClick={() => setCreando(true)} className={claseBotonPrincipal}>
          + Nueva tarea
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {filtrosEstado.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltroEstado(f.valor)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                filtroEstado === f.valor ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              {f.nombre}
            </button>
          ))}
        </div>
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

      {error && <p className="mt-6 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {cargando ? (
        <p className="mt-8 text-center text-slate-500">Cargando tareas…</p>
      ) : visibles.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {tareas.length === 0 ? 'Aún no tienes tareas. Crea la primera con "+ Nueva tarea".' : 'No hay tareas con estos filtros.'}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {visibles.map((t) => (
            <TarjetaTarea
              key={t.id}
              tarea={t}
              onCompletar={() => setCompletando(t)}
              onEditar={() => setEditando(t)}
              onEliminar={() => confirmarEliminar(t)}
            />
          ))}
        </ul>
      )}

      {creando && (
        <Modal titulo="Nueva tarea" onCerrar={() => setCreando(false)}>
          <FormularioTarea
            onGuardar={async (datos) => {
              await crear(datos)
              setCreando(false)
            }}
            onCancelar={() => setCreando(false)}
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
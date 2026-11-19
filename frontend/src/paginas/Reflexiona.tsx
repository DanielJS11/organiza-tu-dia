import { useCallback, useState } from 'react'
import { useDiaDiario, useHistorialDiario } from '../hooks/useDiario'
import { fechaHoy, formatearDia, sumarDias } from '../utilidades/tiempo'
import { confirmarSalida } from '../utilidades/cambiosPendientes'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import SelectorFechaDiario from '../componentes/diario/SelectorFechaDiario'
import EditorEntrada from '../componentes/diario/EditorEntrada'
import ResumenDelDia from '../componentes/diario/ResumenDelDia'
import HistorialDiario from '../componentes/diario/HistorialDiario'
import ReflexionDelDia from '../componentes/diario/ReflexionDelDia'
import ResumenSemana from '../componentes/diario/ResumenSemana'

// "Your day today", "Your day yesterday" o "Your day on Monday, November 9"
function tituloDia(fecha: string) {
  if (fecha === fechaHoy()) return 'Your day today'
  if (fecha === sumarDias(fechaHoy(), -1)) return 'Your day yesterday'
  return `Your day on ${formatearDia(fecha)}`
}

export default function Reflexiona() {
  const [fecha, setFecha] = useState(fechaHoy())
  const [etiqueta, setEtiqueta] = useState('')
  const [buscar, setBuscar] = useState('')
  const [version, setVersion] = useState(0) // cambia al guardar o borrar para recargar el historial

  const { dia, cargando, error, guardar, eliminar } = useDiaDiario(fecha)
  const { entradas, etiquetas } = useHistorialDiario(etiqueta, buscar, version)
  const alBuscar = useCallback((texto: string) => setBuscar(texto), [])

  // Cambiar de día: si la entrada actual tiene cambios sin guardar, primero se pide confirmación
  function cambiarDia(nueva: string) {
    if (nueva === fecha || !confirmarSalida()) return
    setFecha(nueva)
  }

  function abrir(nueva: string) {
    cambiarDia(nueva)
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: sinMovimiento ? 'auto' : 'smooth' })
  }

  return (
    <div>
      <EncabezadoPagina
        ruta="/reflect"
        descripcion="A few minutes to look back on how it went: what you learn today helps you plan better tomorrow."
      />

      <div className="mt-6">
        <SelectorFechaDiario fecha={fecha} onCambiar={cambiarDia} />
      </div>

      {error && <p role="alert" className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {cargando ? (
        <p className="mt-8 text-center text-slate-500">Loading…</p>
      ) : (
        dia && (
          <>
            <p className="mt-6 text-sm text-slate-500">{tituloDia(fecha)}</p>
            <div className="mt-2 grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <EditorEntrada
                  key={`${fecha}-${dia.entrada?.id ?? 'nueva'}`}
                  entrada={dia.entrada}
                  sugerenciasEtiquetas={etiquetas.map((e) => e.nombre)}
                  onGuardar={async (texto, lista) => {
                    await guardar(texto, lista)
                    setVersion((v) => v + 1)
                  }}
                  onEliminar={async () => {
                    await eliminar()
                    setVersion((v) => v + 1)
                  }}
                />
                <ReflexionDelDia fecha={fecha} hayEntrada={!!dia.entrada} version={version} />
              </div>
              <ResumenDelDia resumen={dia.resumen} />
            </div>
          </>
        )
      )}

      <ResumenSemana version={version} />

      <HistorialDiario
        entradas={entradas}
        etiquetas={etiquetas}
        etiqueta={etiqueta}
        fechaActual={fecha}
        onFiltrar={setEtiqueta}
        onBuscar={alBuscar}
        onAbrir={abrir}
      />
    </div>
  )
}

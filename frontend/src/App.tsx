import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import RutaProtegida from './componentes/RutaProtegida'
import Plantilla from './componentes/Plantilla'
import Ingresar from './paginas/Ingresar'

// Cada sección se descarga solo cuando se visita: la primera carga es más liviana
// (por ejemplo, el calendario de Organiza no se descarga en la página de ingreso)
const Registro = lazy(() => import('./paginas/Registro'))
const Recuperar = lazy(() => import('./paginas/Recuperar'))
const Restablecer = lazy(() => import('./paginas/Restablecer'))
const Inicio = lazy(() => import('./paginas/Inicio'))
const Organiza = lazy(() => import('./paginas/Organiza'))
const Elige = lazy(() => import('./paginas/Elige'))
const Reflexiona = lazy(() => import('./paginas/Reflexiona'))

export default function App() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-slate-500">Cargando…</p>}>
      <Routes>
        <Route path="/ingresar" element={<Ingresar />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/restablecer" element={<Restablecer />} />

        <Route element={<RutaProtegida />}>
          <Route element={<Plantilla />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/elige" element={<Elige />} />
            <Route path="/organiza" element={<Organiza />} />
            <Route path="/reflexiona" element={<Reflexiona />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
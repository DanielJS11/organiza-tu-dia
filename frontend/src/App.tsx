import { Navigate, Route, Routes } from 'react-router'
import RutaProtegida from './componentes/RutaProtegida'
import Plantilla from './componentes/Plantilla'
import Ingresar from './paginas/Ingresar'
import Registro from './paginas/Registro'
import Inicio from './paginas/Inicio'
import Organiza from './paginas/Organiza'
import Elige from './paginas/Elige'
import EnConstruccion from './paginas/EnConstruccion'

export default function App() {
  return (
    <Routes>
      <Route path="/ingresar" element={<Ingresar />} />
      <Route path="/registro" element={<Registro />} />

      <Route element={<RutaProtegida />}>
        <Route element={<Plantilla />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/elige" element={<Elige />} />
          <Route path="/organiza" element={<Organiza />} />
          <Route path="/reflexiona" element={<EnConstruccion titulo="Reflexiona" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
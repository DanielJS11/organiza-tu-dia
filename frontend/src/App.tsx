import { Navigate, Route, Routes } from 'react-router'
import RutaProtegida from './componentes/RutaProtegida'
import Plantilla from './componentes/Plantilla'
import Ingresar from './paginas/Ingresar'
import Registro from './paginas/Registro'
import Recuperar from './paginas/Recuperar'
import Restablecer from './paginas/Restablecer'
import Inicio from './paginas/Inicio'
import Organiza from './paginas/Organiza'
import Elige from './paginas/Elige'
import Reflexiona from './paginas/Reflexiona'

export default function App() {
  return (
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
  )
}
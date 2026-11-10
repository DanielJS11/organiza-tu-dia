import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useSesion } from '../contexto/useSesion'
import Campo from '../componentes/Campo'
import FormularioAcceso from '../componentes/FormularioAcceso'

// Paso 2 de la recuperación: elegir la contraseña nueva con el enlace del correo
export default function Restablecer() {
  const { restablecer } = useSesion()
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const token = parametros.get('token') ?? ''
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (contrasena !== confirmacion) {
      setError('Las dos contraseñas no coinciden')
      return
    }
    setEnviando(true)
    try {
      await restablecer(token, contrasena)
      navegar('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setEnviando(false)
    }
  }

  const pie = (
    <Link to="/recuperar" className="text-teal-700 font-medium">
      Pedir un enlace nuevo
    </Link>
  )

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-semibold text-slate-800">Enlace incompleto</h1>
          <p className="text-sm text-slate-600">Abre el enlace completo que te llegó al correo, o pide uno nuevo.</p>
          <p className="text-center text-sm">{pie}</p>
        </div>
      </main>
    )
  }

  return (
    <FormularioAcceso
      titulo="Elige una nueva contraseña"
      subtitulo="Al guardarla, se cerrará la sesión en tus otros dispositivos."
      textoBoton="Guardar contraseña"
      error={error}
      enviando={enviando}
      onSubmit={enviar}
      pie={pie}
    >
      <Campo
        etiqueta="Nueva contraseña"
        type="password"
        value={contrasena}
        onChange={(e) => setContrasena(e.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
      />
      <Campo
        etiqueta="Repítela"
        type="password"
        value={confirmacion}
        onChange={(e) => setConfirmacion(e.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
      />
    </FormularioAcceso>
  )
}
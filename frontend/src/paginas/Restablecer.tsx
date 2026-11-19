import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useSesion } from '../contexto/useSesion'
import Campo from '../componentes/Campo'
import FormularioAcceso from '../componentes/FormularioAcceso'
import MarcoAcceso from '../componentes/MarcoAcceso'

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
      setError('The two passwords do not match')
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
    <Link to="/forgot-password" className="text-teal-700 font-medium">
      Request a new link
    </Link>
  )

  if (!token) {
    return (
      <MarcoAcceso>
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold text-slate-800">Incomplete link</h1>
          <p className="text-sm text-slate-600">Open the full link from your email, or request a new one.</p>
          <p className="text-center text-sm">{pie}</p>
        </div>
      </MarcoAcceso>
    )
  }

  return (
    <FormularioAcceso
      titulo="Choose a new password"
      subtitulo="When you save it, you will be logged out on your other devices."
      textoBoton="Save password"
      error={error}
      enviando={enviando}
      onSubmit={enviar}
      pie={pie}
    >
      <Campo
        etiqueta="New password"
        type="password"
        value={contrasena}
        onChange={(e) => setContrasena(e.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
      />
      <Campo
        etiqueta="Repeat it"
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

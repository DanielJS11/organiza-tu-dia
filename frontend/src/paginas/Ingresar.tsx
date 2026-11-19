import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useSesion } from '../contexto/useSesion'
import Campo from '../componentes/Campo'
import FormularioAcceso from '../componentes/FormularioAcceso'

export default function Ingresar() {
  const { usuario, ingresar } = useSesion()
  const navegar = useNavigate()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await ingresar(correo, contrasena)
      navegar('/')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <FormularioAcceso
      titulo="Welcome back"
      subtitulo="Log in to organize your day"
      textoBoton="Log in"
      error={error}
      enviando={enviando}
      onSubmit={enviar}
      pie={<>Don't have an account? <Link to="/signup" className="text-teal-700 font-medium">Sign up</Link></>}
    >
      <Campo etiqueta="Email" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
      <Campo etiqueta="Password" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required autoComplete="current-password" />
      <p className="-mt-2 text-right text-sm">
        <Link to="/forgot-password" className="text-teal-700 hover:text-teal-900">
          Forgot your password?
        </Link>
      </p>
    </FormularioAcceso>
  )
}

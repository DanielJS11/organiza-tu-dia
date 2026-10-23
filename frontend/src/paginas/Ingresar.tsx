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
      titulo="Bienvenido de nuevo"
      subtitulo="Ingresa para organizar tu día"
      textoBoton="Ingresar"
      error={error}
      enviando={enviando}
      onSubmit={enviar}
      pie={<>¿No tienes cuenta? <Link to="/registro" className="text-teal-700 font-medium">Regístrate</Link></>}
    >
      <Campo etiqueta="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
      <Campo etiqueta="Contraseña" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required autoComplete="current-password" />
    </FormularioAcceso>
  )
}
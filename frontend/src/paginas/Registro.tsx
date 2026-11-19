import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useSesion } from '../contexto/useSesion'
import Campo from '../componentes/Campo'
import FormularioAcceso from '../componentes/FormularioAcceso'

export default function Registro() {
  const { usuario, registrar } = useSesion()
  const navegar = useNavigate()
  const [nombre, setNombre] = useState('')
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
      await registrar(nombre, correo, contrasena)
      navegar('/')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <FormularioAcceso
      titulo="Create your account"
      subtitulo="Choose, organize and reflect on your time"
      textoBoton="Create account"
      error={error}
      enviando={enviando}
      onSubmit={enviar}
      pie={<>Already have an account? <Link to="/login" className="text-teal-700 font-medium">Log in</Link></>}
    >
      <Campo etiqueta="Name" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoComplete="name" />
      <Campo etiqueta="Email" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
      <Campo etiqueta="Password (at least 8 characters)" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required minLength={8} autoComplete="new-password" />
    </FormularioAcceso>
  )
}

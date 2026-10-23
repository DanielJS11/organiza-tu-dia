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
      titulo="Crea tu cuenta"
      subtitulo="Elige, organiza y reflexiona sobre tu tiempo"
      textoBoton="Crear cuenta"
      error={error}
      enviando={enviando}
      onSubmit={enviar}
      pie={<>¿Ya tienes cuenta? <Link to="/ingresar" className="text-teal-700 font-medium">Ingresa</Link></>}
    >
      <Campo etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoComplete="name" />
      <Campo etiqueta="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
      <Campo etiqueta="Contraseña (mínimo 8 caracteres)" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required minLength={8} autoComplete="new-password" />
    </FormularioAcceso>
  )
}
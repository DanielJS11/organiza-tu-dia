import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { api } from '../api'
import Campo from '../componentes/Campo'
import FormularioAcceso from '../componentes/FormularioAcceso'
import MarcoAcceso from '../componentes/MarcoAcceso'

// Paso 1 de la recuperación: pedir el enlace por correo
export default function Recuperar() {
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const respuesta = await api<{ mensaje: string }>('/auth/olvide', { method: 'POST', body: JSON.stringify({ correo }) })
      setMensaje(respuesta.mensaje)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  const volver = (
    <Link to="/ingresar" className="text-teal-700 font-medium">
      Volver a ingresar
    </Link>
  )

  if (mensaje) {
    return (
            <MarcoAcceso>
        <div className="space-y-4" role="status">
          <h1 className="text-3xl font-semibold text-slate-800">Revisa tu correo</h1>
          <p className="text-sm text-slate-600">{mensaje}</p>
          <p className="text-sm text-slate-500">El enlace vence en 30 minutos.</p>
          <p className="text-center text-sm">{volver}</p>
        </div>
        </MarcoAcceso>
    )
  }

  return (
    <FormularioAcceso
      titulo="Recupera tu contraseña"
      subtitulo="Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una nueva."
      textoBoton="Enviar enlace"
      error={error}
      enviando={enviando}
      onSubmit={enviar}
      pie={volver}
    >
      <Campo etiqueta="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
    </FormularioAcceso>
  )
}
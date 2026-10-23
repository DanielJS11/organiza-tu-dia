import { useEffect, useState } from 'react'

type Estado = 'cargando' | 'conectado' | 'error'

export default function App() {
  const [estado, setEstado] = useState<Estado>('cargando')

  useEffect(() => {
    fetch('/api/salud')
      .then((res) => (res.ok ? setEstado('conectado') : setEstado('error')))
      .catch(() => setEstado('error'))
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold text-slate-800">Organiza tu día</h1>
        <p className="mt-2 text-slate-500">Elige · Organiza · Reflexiona</p>
        <p className="mt-6 text-sm">
          Backend:{' '}
          {estado === 'cargando' && <span className="text-slate-400">comprobando…</span>}
          {estado === 'conectado' && <span className="text-emerald-600 font-medium">conectado ✓</span>}
          {estado === 'error' && <span className="text-red-600 font-medium">sin conexión</span>}
        </p>
      </div>
    </main>
  )
}
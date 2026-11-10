import type { ReactNode } from 'react'
import ArcoDelDia from './ArcoDelDia'
import { Logo } from './Iconos'

// Marco de las páginas sin sesión (ingresar, registro, recuperar contraseña):
// a la izquierda la presentación de la app y a la derecha el formulario
export default function MarcoAcceso({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr] bg-slate-50 lg:grid-cols-2 lg:grid-rows-1">
      <section className="flex flex-col justify-between bg-white px-6 py-8 sm:px-10 lg:min-h-screen lg:border-r lg:border-slate-200 lg:px-14 lg:py-12">
        <p className="flex items-center gap-2.5">
          <Logo />
          <span className="text-lg font-semibold tracking-tight text-slate-800">Organiza tu día</span>
        </p>
        <div>
          <ArcoDelDia className="mt-6 w-full max-w-[240px] lg:mt-0 lg:max-w-md" />
          <h2 className="mt-10 hidden max-w-md text-4xl font-semibold leading-tight text-slate-800 lg:block">Un día bien vivido empieza con un buen plan.</h2>
          <p className="mt-4 hidden max-w-md text-lg text-slate-600 lg:block">
            Elige cómo quieres vivir tu día, organiza tus tareas sin agobio y reflexiona sobre cómo te fue.
          </p>
        </div>
        <p className="hidden text-sm text-slate-500 lg:block">Pensado para estudiantes universitarios.</p>
      </section>

      <div className="flex items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  )
}
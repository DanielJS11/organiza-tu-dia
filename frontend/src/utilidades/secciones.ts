import { IconoAlba, IconoDia, IconoNoche } from '../componentes/Iconos'

// Las tres secciones de la app, cada una asociada a un momento del día y a su color
export const secciones = [
  {
    ruta: '/elige',
    nombre: 'Elige',
    momento: 'Por la mañana',
    invitacion: 'elegir cómo vas a vivir tu día',
    descripcion: 'Escoge la estructura de tu día y reparte tus tareas en bloques.',
    Icono: IconoAlba,
    // Clases completas (Tailwind solo genera las que aparecen escritas tal cual)
    tinte: 'bg-alba-100 text-alba-700',
    activo: 'bg-alba-50 text-alba-800',
    punto: 'bg-alba-500',
  },
  {
    ruta: '/organiza',
    nombre: 'Organiza',
    momento: 'Durante el día',
    invitacion: 'avanzar en tus tareas',
    descripcion: 'Registra tus tareas y mira por cuál conviene empezar.',
    Icono: IconoDia,
    tinte: 'bg-teal-100 text-teal-700',
    activo: 'bg-teal-50 text-teal-800',
    punto: 'bg-teal-500',
  },
  {
    ruta: '/reflexiona',
    nombre: 'Reflexiona',
    momento: 'Al final del día',
    invitacion: 'mirar cómo te fue',
    descripcion: 'Escribe cómo te fue y aprende de tu semana.',
    Icono: IconoNoche,
    tinte: 'bg-noche-100 text-noche-700',
    activo: 'bg-noche-50 text-noche-800',
    punto: 'bg-noche-500',
  },
] as const

export type Seccion = (typeof secciones)[number]

export const seccionDe = (ruta: string) => secciones.find((s) => s.ruta === ruta)!

// Qué momento del día es ahora: antes de las 11 a. m. se elige, hasta las 6 p. m. se organiza, después se reflexiona
export function seccionDelMomento(hora = new Date().getHours()) {
  return hora < 11 ? secciones[0] : hora < 18 ? secciones[1] : secciones[2]
}
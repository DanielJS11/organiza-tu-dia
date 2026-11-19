import { IconoAlba, IconoDia, IconoNoche } from '../componentes/Iconos'

// Las tres secciones de la app, cada una asociada a un momento del día y a su color
export const secciones = [
  {
    ruta: '/choose',
    nombre: 'Choose',
    momento: 'In the morning',
    invitacion: 'choose how you will live your day',
    descripcion: 'Pick the structure of your day and spread your tasks into blocks.',
    Icono: IconoAlba,
    // Clases completas (Tailwind solo genera las que aparecen escritas tal cual)
    tinte: 'bg-alba-100 text-alba-700',
    activo: 'bg-alba-50 text-alba-800',
    punto: 'bg-alba-500',
  },
  {
    ruta: '/organize',
    nombre: 'Organize',
    momento: 'During the day',
    invitacion: 'make progress on your tasks',
    descripcion: 'Add your tasks and see which one to start with.',
    Icono: IconoDia,
    tinte: 'bg-teal-100 text-teal-700',
    activo: 'bg-teal-50 text-teal-800',
    punto: 'bg-teal-500',
  },
  {
    ruta: '/reflect',
    nombre: 'Reflect',
    momento: 'At the end of the day',
    invitacion: 'look back on how it went',
    descripcion: 'Write about how it went and learn from your week.',
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

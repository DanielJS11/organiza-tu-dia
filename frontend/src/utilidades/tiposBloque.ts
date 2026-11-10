import type { BloquePlantilla, BloqueVista, TipoBloque } from '../tipos'
import { aHora, aMinutos } from './tiempo'

// Nombre y colores de cada tipo de bloque (se usan en toda la sección Elige)
export const estiloTipo: Record<TipoBloque, { nombre: string; barra: string; fondo: string; texto: string }> = {
    ESTUDIO: { nombre: 'Estudio', barra: 'bg-indigo-400', fondo: 'bg-indigo-50', texto: 'text-indigo-700' },
  TRABAJO: { nombre: 'Trabajo', barra: 'bg-sky-400', fondo: 'bg-sky-50', texto: 'text-sky-800' },
  ENFOQUE: { nombre: 'Enfoque', barra: 'bg-fuchsia-400', fondo: 'bg-fuchsia-50', texto: 'text-fuchsia-800' },
  DESCANSO: { nombre: 'Descanso', barra: 'bg-teal-400', fondo: 'bg-teal-50', texto: 'text-teal-800' },
  PERSONAL: { nombre: 'Personal', barra: 'bg-alba-500', fondo: 'bg-alba-50', texto: 'text-alba-800' },
}

// Convierte los bloques de una plantilla (inicio + duración) a la forma común (inicio + fin)
export function bloquesDePlantilla(bloques: BloquePlantilla[]): BloqueVista[] {
  return bloques.map((b) => ({
    tipo: b.tipo,
    titulo: b.titulo,
    horaInicio: b.horaInicio,
    horaFin: aHora(aMinutos(b.horaInicio) + b.duracionMin),
  }))
}

export function duracionBloque(b: BloqueVista) {
  return aMinutos(b.horaFin) - aMinutos(b.horaInicio)
}

// Total de minutos por tipo, de mayor a menor: [["ESTUDIO", 435], ["PERSONAL", 180], ...]
export function resumenPorTipo(bloques: BloqueVista[]) {
  const totales = new Map<TipoBloque, number>()
  for (const b of bloques) totales.set(b.tipo, (totales.get(b.tipo) ?? 0) + duracionBloque(b))
  return [...totales.entries()].sort((a, b) => b[1] - a[1])
}
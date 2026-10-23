import type { Prioridad } from '../tipos'

export const nombresPrioridad: Record<Prioridad, string> = {
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
}

// 90 → "1 h 30 min"
export function formatearDuracion(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

const formatoHora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' })

function inicioDelDia(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
}

export type TonoEntrega = 'vencida' | 'pronto' | 'normal'

// Describe la fecha de entrega en palabras: "Vence hoy, 11:59 p. m.", "Vencida", etc.
export function describirEntrega(fechaIso: string, completada: boolean): { texto: string; tono: TonoEntrega } {
  const fecha = new Date(fechaIso)
  const ahora = new Date()
  const dias = Math.round((inicioDelDia(fecha).getTime() - inicioDelDia(ahora).getTime()) / 86_400_000)
  const hora = formatoHora.format(fecha)

  if (completada) return { texto: `Entrega: ${formatoFecha.format(fecha)}`, tono: 'normal' }
  if (fecha < ahora) return { texto: `Vencida: ${formatoFecha.format(fecha)}`, tono: 'vencida' }
  if (dias === 0) return { texto: `Vence hoy, ${hora}`, tono: 'pronto' }
  if (dias === 1) return { texto: `Vence mañana, ${hora}`, tono: 'pronto' }
  return { texto: `Vence en ${dias} días: ${formatoFecha.format(fecha)}`, tono: 'normal' }
}

// Convierte una fecha ISO al formato que usa <input type="datetime-local">: "2026-10-24T23:59"
export function aFechaLocal(fechaIso: string) {
  const f = new Date(fechaIso)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}T${dos(f.getHours())}:${dos(f.getMinutes())}`
}
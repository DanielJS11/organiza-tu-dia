// "08:30" → 510 minutos desde la medianoche
export function aMinutos(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

// 510 → "08:30"
export function aHora(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// "13:30" → "1:30 p. m."
export function formatearHora(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, h, m))
}

// Fecha de hoy en formato "2026-10-23", según el reloj del usuario
export function fechaHoy() {
  return aFechaTexto(new Date())
}

export function aFechaTexto(fecha: Date) {
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
}

// "2026-10-23" + 1 → "2026-10-24"
export function sumarDias(fecha: string, dias: number) {
  const [a, m, d] = fecha.split('-').map(Number)
  return aFechaTexto(new Date(a, m - 1, d + dias))
}

// "2026-10-23" → "viernes, 23 de octubre"
export function formatearDia(fecha: string) {
  const [a, m, d] = fecha.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(a, m - 1, d))
}
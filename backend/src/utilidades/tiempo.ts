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

// Fecha de hoy ("2026-10-23") en la zona horaria del usuario
export function hoyEnZona(zonaHoraria: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zonaHoraria }).format(new Date())
}

// "2026-10-23" → Date que Prisma guarda como fecha sin hora
export function aFechaBD(fecha: string) {
  return new Date(`${fecha}T00:00:00.000Z`)
}

// Valida que el texto sea una fecha real con formato AAAA-MM-DD
export function esFechaValida(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const d = aFechaBD(fecha)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(fecha)
}
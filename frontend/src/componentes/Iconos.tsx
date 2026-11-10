// Iconos de los tres momentos del día (SVG simples, heredan el color del texto)
type Props = { className?: string }

// Mañana: sol saliendo sobre el horizonte
export function IconoAlba({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M6 16a6 6 0 0 1 12 0" />
      <path d="M3 19h18M12 5v2.5M5.2 8.2l1.7 1.7M18.8 8.2l-1.7 1.7" />
    </svg>
  )
}

// Día: sol completo
export function IconoDia({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M18.5 5.5 17 7M7 17l-1.5 1.5" />
    </svg>
  )
}

// Noche: luna creciente
export function IconoNoche({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10Z" />
    </svg>
  )
}

// Marca de la app: el arco del día con el sol en lo alto
export function Logo({ className = 'h-7 w-7' }: Props) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M5 23a11 11 0 0 1 22 0" fill="none" stroke="var(--color-slate-300)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="6.5" cy="17.5" r="2.4" fill="var(--color-alba-500)" />
      <circle cx="16" cy="12" r="3.2" fill="var(--color-teal-600)" />
      <circle cx="25.5" cy="17.5" r="2.4" fill="var(--color-noche-500)" />
      <path d="M3 26.5h26" stroke="var(--color-slate-800)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
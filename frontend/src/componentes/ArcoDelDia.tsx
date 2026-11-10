// Ilustración de la portada: el día como un arco, de la mañana (Elige) a la noche (Reflexiona)
// Los tres puntos están sobre el arco (centro 180,170 y radio 150): a 150°, 90° y 30°
const momentos = [
  { x: 50, y: 95, color: 'var(--color-alba-500)', nombre: 'Elige' },
  { x: 180, y: 20, color: 'var(--color-teal-600)', nombre: 'Organiza' },
  { x: 310, y: 95, color: 'var(--color-noche-500)', nombre: 'Reflexiona' },
]

export default function ArcoDelDia({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 208" className={className} role="img" aria-label="El día como un arco: Elige en la mañana, Organiza durante el día y Reflexiona en la noche">
      <defs>
        <linearGradient id="cielo" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--color-alba-500)" />
          <stop offset="0.5" stopColor="var(--color-teal-500)" />
          <stop offset="1" stopColor="var(--color-noche-500)" />
        </linearGradient>
      </defs>
      {/* Recorrido del sol */}
      <path d="M30 170 A150 150 0 0 1 330 170" fill="none" stroke="url(#cielo)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
      {/* Horizonte */}
      <line x1="10" y1="170" x2="350" y2="170" stroke="var(--color-slate-800)" strokeWidth="2.5" strokeLinecap="round" />
      {momentos.map((m) => (
        <g key={m.nombre}>
          <circle cx={m.x} cy={m.y} r={m.nombre === 'Organiza' ? 15 : 10} fill={m.color} />
          <text x={m.x} y="196" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--color-slate-800)">
            {m.nombre}
          </text>
        </g>
      ))}
    </svg>
  )
}
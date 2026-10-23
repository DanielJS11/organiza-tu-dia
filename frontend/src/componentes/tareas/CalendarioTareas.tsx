import { useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import classicThemePlugin from '@fullcalendar/react/themes/classic'
import esLocale from '@fullcalendar/react/locales/es'
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/classic/theme.css'
import '@fullcalendar/react/themes/classic/palette.css'
import type { Tarea } from '../../tipos'

type Props = {
  tareas: Tarea[]
  onSeleccionarTarea: (tarea: Tarea) => void
  onSeleccionarFecha: (fecha: Date, todoElDia: boolean) => void
}

// Colores por prioridad; las tareas completadas se muestran en gris
const colores = {
  ALTA: '#e11d48',
  MEDIA: '#d97706',
  BAJA: '#64748b',
  COMPLETADA: '#cbd5e1',
}

export default function CalendarioTareas({ tareas, onSeleccionarTarea, onSeleccionarFecha }: Props) {
  const [vistaActual, setVistaActual] = useState('dayGridMonth')

  // Solo las tareas con fecha de entrega aparecen en el calendario
  const eventos = tareas
    .filter((t) => t.fechaEntrega)
    .map((t) => {
      const color = t.estado === 'COMPLETADA' ? colores.COMPLETADA : colores[t.prioridad]
      return {
        id: t.id,
        title: t.titulo,
        start: t.fechaEntrega!,
        color,
        contrastColor: t.estado === 'COMPLETADA' ? '#475569' : '#ffffff',
      }
    })

  return (
    <div className="calendario rounded-2xl bg-white p-4 shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, classicThemePlugin]}
        locale={esLocale}
        initialView="dayGridMonth"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
        events={eventos}
        eventDisplay="block"
        dayMaxEvents={3}
        nowIndicator
        // En mes la altura se ajusta sola; en semana y día se limita y se puede desplazar
        height={vistaActual === 'dayGridMonth' ? 'auto' : 640}
        datesSet={(info) => setVistaActual(info.view.type)}
        scrollTime="07:00:00"
        nextDayThreshold="09:00:00" // una entrega a las 11:59 p. m. no se dibuja también en el día siguiente
        eventClick={(info) => {
          const tarea = tareas.find((t) => t.id === info.event.id)
          if (tarea) onSeleccionarTarea(tarea)
        }}
        dateClick={(info) => onSeleccionarFecha(info.date, info.allDay)}
      />
    </div>
  )
}
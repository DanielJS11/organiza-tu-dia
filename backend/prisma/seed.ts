import { prisma } from '../src/db.js'
import { TipoBloque } from '../src/generated/prisma/client.js'

type BloqueSemilla = { tipo: TipoBloque; titulo: string; horaInicio: string; duracionMin: number }

const plantillas: { clave: string; nombre: string; descripcion: string; bloques: BloqueSemilla[] }[] = [
  {
    clave: 'estudio',
    nombre: 'Día de estudio',
    descripcion: 'Bloques largos de estudio con pausas cortas entre ellos.',
    bloques: [
      { tipo: 'ESTUDIO', titulo: 'Estudio', horaInicio: '08:00', duracionMin: 120 },
      { tipo: 'DESCANSO', titulo: 'Pausa', horaInicio: '10:00', duracionMin: 15 },
      { tipo: 'ESTUDIO', titulo: 'Estudio', horaInicio: '10:15', duracionMin: 105 },
      { tipo: 'PERSONAL', titulo: 'Almuerzo', horaInicio: '12:00', duracionMin: 60 },
      { tipo: 'ESTUDIO', titulo: 'Estudio', horaInicio: '13:00', duracionMin: 120 },
      { tipo: 'DESCANSO', titulo: 'Pausa', horaInicio: '15:00', duracionMin: 30 },
      { tipo: 'ESTUDIO', titulo: 'Repaso', horaInicio: '15:30', duracionMin: 90 },
      { tipo: 'PERSONAL', titulo: 'Tiempo libre', horaInicio: '17:00', duracionMin: 120 },
    ],
  },
  {
    clave: 'trabajo',
    nombre: 'Día de trabajo',
    descripcion: 'Jornada laboral organizada en bloques con pausas y almuerzo.',
    bloques: [
      { tipo: 'TRABAJO', titulo: 'Trabajo', horaInicio: '08:00', duracionMin: 120 },
      { tipo: 'DESCANSO', titulo: 'Pausa', horaInicio: '10:00', duracionMin: 15 },
      { tipo: 'TRABAJO', titulo: 'Trabajo', horaInicio: '10:15', duracionMin: 105 },
      { tipo: 'PERSONAL', titulo: 'Almuerzo', horaInicio: '12:00', duracionMin: 60 },
      { tipo: 'TRABAJO', titulo: 'Trabajo', horaInicio: '13:00', duracionMin: 120 },
      { tipo: 'DESCANSO', titulo: 'Pausa', horaInicio: '15:00', duracionMin: 15 },
      { tipo: 'TRABAJO', titulo: 'Cierre del día', horaInicio: '15:15', duracionMin: 105 },
      { tipo: 'PERSONAL', titulo: 'Tiempo libre', horaInicio: '17:00', duracionMin: 120 },
    ],
  },
  {
    clave: 'enfoque',
    nombre: 'Día de enfoque',
    descripcion: 'Pocas tareas importantes con bloques largos sin interrupciones.',
    bloques: [
      { tipo: 'ENFOQUE', titulo: 'Enfoque profundo', horaInicio: '08:00', duracionMin: 150 },
      { tipo: 'DESCANSO', titulo: 'Pausa', horaInicio: '10:30', duracionMin: 30 },
      { tipo: 'ENFOQUE', titulo: 'Enfoque profundo', horaInicio: '11:00', duracionMin: 120 },
      { tipo: 'PERSONAL', titulo: 'Almuerzo', horaInicio: '13:00', duracionMin: 60 },
      { tipo: 'TRABAJO', titulo: 'Tareas ligeras', horaInicio: '14:00', duracionMin: 90 },
      { tipo: 'DESCANSO', titulo: 'Pausa', horaInicio: '15:30', duracionMin: 30 },
      { tipo: 'PERSONAL', titulo: 'Tiempo libre', horaInicio: '16:00', duracionMin: 120 },
    ],
  },
  {
    clave: 'equilibrado',
    nombre: 'Día equilibrado',
    descripcion: 'Combina obligaciones, descanso y tiempo personal en partes similares.',
    bloques: [
      { tipo: 'PERSONAL', titulo: 'Rutina de la mañana', horaInicio: '08:00', duracionMin: 60 },
      { tipo: 'TRABAJO', titulo: 'Tareas principales', horaInicio: '09:00', duracionMin: 120 },
      { tipo: 'DESCANSO', titulo: 'Pausa', horaInicio: '11:00', duracionMin: 30 },
      { tipo: 'ESTUDIO', titulo: 'Aprendizaje', horaInicio: '11:30', duracionMin: 90 },
      { tipo: 'PERSONAL', titulo: 'Almuerzo', horaInicio: '13:00', duracionMin: 60 },
      { tipo: 'TRABAJO', titulo: 'Tareas secundarias', horaInicio: '14:00', duracionMin: 90 },
      { tipo: 'PERSONAL', titulo: 'Ejercicio o tiempo libre', horaInicio: '15:30', duracionMin: 90 },
      { tipo: 'DESCANSO', titulo: 'Descanso', horaInicio: '17:00', duracionMin: 60 },
    ],
  },
]

async function main() {
  for (const p of plantillas) {
    const bloques = p.bloques.map((b, i) => ({ ...b, orden: i + 1 }))

    await prisma.plantilla.upsert({
      where: { clave: p.clave },
      update: {
        nombre: p.nombre,
        descripcion: p.descripcion,
        bloques: { deleteMany: {}, create: bloques },
      },
      create: {
        clave: p.clave,
        nombre: p.nombre,
        descripcion: p.descripcion,
        bloques: { create: bloques },
      },
    })
    console.log(`✓ Plantilla "${p.nombre}" con ${bloques.length} bloques`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
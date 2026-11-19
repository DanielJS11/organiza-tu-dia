import { prisma } from '../src/db.js'
import { TipoBloque } from '../src/generated/prisma/client.js'

type BloqueSemilla = { tipo: TipoBloque; titulo: string; horaInicio: string; duracionMin: number }

const plantillas: { clave: string; nombre: string; descripcion: string; bloques: BloqueSemilla[] }[] = [
  {
    clave: 'estudio',
    nombre: 'Study day',
    descripcion: 'Long study blocks with short breaks between them.',
    bloques: [
      { tipo: 'ESTUDIO', titulo: 'Study', horaInicio: '08:00', duracionMin: 120 },
      { tipo: 'DESCANSO', titulo: 'Break', horaInicio: '10:00', duracionMin: 15 },
      { tipo: 'ESTUDIO', titulo: 'Study', horaInicio: '10:15', duracionMin: 105 },
      { tipo: 'PERSONAL', titulo: 'Lunch', horaInicio: '12:00', duracionMin: 60 },
      { tipo: 'ESTUDIO', titulo: 'Study', horaInicio: '13:00', duracionMin: 120 },
      { tipo: 'DESCANSO', titulo: 'Break', horaInicio: '15:00', duracionMin: 30 },
      { tipo: 'ESTUDIO', titulo: 'Review', horaInicio: '15:30', duracionMin: 90 },
      { tipo: 'PERSONAL', titulo: 'Free time', horaInicio: '17:00', duracionMin: 120 },
    ],
  },
  {
    clave: 'trabajo',
    nombre: 'Work day',
    descripcion: 'A workday organized in blocks, with breaks and lunch.',
    bloques: [
      { tipo: 'TRABAJO', titulo: 'Work', horaInicio: '08:00', duracionMin: 120 },
      { tipo: 'DESCANSO', titulo: 'Break', horaInicio: '10:00', duracionMin: 15 },
      { tipo: 'TRABAJO', titulo: 'Work', horaInicio: '10:15', duracionMin: 105 },
      { tipo: 'PERSONAL', titulo: 'Lunch', horaInicio: '12:00', duracionMin: 60 },
      { tipo: 'TRABAJO', titulo: 'Work', horaInicio: '13:00', duracionMin: 120 },
      { tipo: 'DESCANSO', titulo: 'Break', horaInicio: '15:00', duracionMin: 15 },
      { tipo: 'TRABAJO', titulo: 'Wrap up the day', horaInicio: '15:15', duracionMin: 105 },
      { tipo: 'PERSONAL', titulo: 'Free time', horaInicio: '17:00', duracionMin: 120 },
    ],
  },
  {
    clave: 'enfoque',
    nombre: 'Focus day',
    descripcion: 'A few important tasks with long, uninterrupted blocks.',
    bloques: [
      { tipo: 'ENFOQUE', titulo: 'Deep focus', horaInicio: '08:00', duracionMin: 150 },
      { tipo: 'DESCANSO', titulo: 'Break', horaInicio: '10:30', duracionMin: 30 },
      { tipo: 'ENFOQUE', titulo: 'Deep focus', horaInicio: '11:00', duracionMin: 120 },
      { tipo: 'PERSONAL', titulo: 'Lunch', horaInicio: '13:00', duracionMin: 60 },
      { tipo: 'TRABAJO', titulo: 'Light tasks', horaInicio: '14:00', duracionMin: 90 },
      { tipo: 'DESCANSO', titulo: 'Break', horaInicio: '15:30', duracionMin: 30 },
      { tipo: 'PERSONAL', titulo: 'Free time', horaInicio: '16:00', duracionMin: 120 },
    ],
  },
  {
    clave: 'equilibrado',
    nombre: 'Balanced day',
    descripcion: 'Combines obligations, rest and personal time in similar amounts.',
    bloques: [
      { tipo: 'PERSONAL', titulo: 'Morning routine', horaInicio: '08:00', duracionMin: 60 },
      { tipo: 'TRABAJO', titulo: 'Main tasks', horaInicio: '09:00', duracionMin: 120 },
      { tipo: 'DESCANSO', titulo: 'Break', horaInicio: '11:00', duracionMin: 30 },
      { tipo: 'ESTUDIO', titulo: 'Learning', horaInicio: '11:30', duracionMin: 90 },
      { tipo: 'PERSONAL', titulo: 'Lunch', horaInicio: '13:00', duracionMin: 60 },
      { tipo: 'TRABAJO', titulo: 'Secondary tasks', horaInicio: '14:00', duracionMin: 90 },
      { tipo: 'PERSONAL', titulo: 'Exercise or free time', horaInicio: '15:30', duracionMin: 90 },
      { tipo: 'DESCANSO', titulo: 'Rest', horaInicio: '17:00', duracionMin: 60 },
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

import { Router } from 'express'
import { prisma } from '../db.js'
import { requiereSesion } from '../middleware/autenticacion.js'
import { analizarPrioridades, type ContextoMotor, type Intervalo } from '../motor/planificador.js'
import { aFechaBD, aMinutos, hoyEnZona } from '../utilidades/tiempo.js'

const router = Router()
router.use(requiereSesion)

// Minutos de trabajo que se asumen en un día que no tiene plan
export const CAPACIDAD_POR_DEFECTO_MIN = 4 * 60

// Tipos de bloque en los que se puede avanzar en tareas
export const TIPOS_DE_TRABAJO = ['ESTUDIO', 'TRABAJO', 'ENFOQUE'] as const

// Reúne lo que el motor necesita saber del usuario: su jornada y sus días planificados desde hoy
async function crearContexto(usuarioId: string): Promise<ContextoMotor> {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } })
  const dias = await prisma.diaPlanificado.findMany({
    where: { usuarioId, fecha: { gte: aFechaBD(hoyEnZona(usuario.zonaHoraria)) } },
    include: { bloques: { where: { tipo: { in: [...TIPOS_DE_TRABAJO] } } } },
  })

  const diasPlanificados = new Map<string, Intervalo[]>()
  for (const dia of dias) {
    const fecha = dia.fecha.toISOString().slice(0, 10)
    diasPlanificados.set(
      fecha,
      dia.bloques.map((b) => ({ inicio: aMinutos(b.horaInicio), fin: aMinutos(b.horaFin) })),
    )
  }

  return {
    ahora: new Date(),
    zonaHoraria: usuario.zonaHoraria,
    jornada: { inicio: aMinutos(usuario.horaInicio), fin: aMinutos(usuario.horaFin) },
    capacidadPorDefectoMin: CAPACIDAD_POR_DEFECTO_MIN,
    diasPlanificados,
  }
}

// Por dónde empezar: tareas pendientes ordenadas, cada una con la razón de su lugar
router.get('/prioridades', async (req, res) => {
  const ctx = await crearContexto(req.usuarioId!)
  const tareas = await prisma.tarea.findMany({
    where: { usuarioId: req.usuarioId, estado: { not: 'COMPLETADA' } },
  })

  const resultados = analizarPrioridades(tareas, ctx)
  const porId = new Map(tareas.map((t) => [t.id, t]))

  res.json({
    capacidadPorDefectoMin: CAPACIDAD_POR_DEFECTO_MIN,
    resultados: resultados.map((r) => ({ ...r, tarea: porId.get(r.tareaId) })),
  })
})

export default router
-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "TipoBloque" AS ENUM ('ESTUDIO', 'TRABAJO', 'ENFOQUE', 'DESCANSO', 'PERSONAL');

-- CreateEnum
CREATE TYPE "EstadoSugerencia" AS ENUM ('PENDIENTE', 'ACEPTADA', 'EDITADA', 'DESCARTADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "hashContrasena" TEXT NOT NULL,
    "zonaHoraria" TEXT NOT NULL DEFAULT 'America/Bogota',
    "horaInicio" TEXT NOT NULL DEFAULT '08:00',
    "horaFin" TEXT NOT NULL DEFAULT '22:00',
    "iaActivada" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "plantillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloques_plantilla" (
    "id" SERIAL NOT NULL,
    "plantillaId" INTEGER NOT NULL,
    "tipo" "TipoBloque" NOT NULL,
    "titulo" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "duracionMin" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "bloques_plantilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dias_planificados" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "plantillaId" INTEGER,

    CONSTRAINT "dias_planificados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloques" (
    "id" TEXT NOT NULL,
    "diaId" TEXT NOT NULL,
    "tipo" "TipoBloque" NOT NULL,
    "titulo" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "tareaId" TEXT,

    CONSTRAINT "bloques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaEntrega" TIMESTAMP(3),
    "prioridad" "Prioridad" NOT NULL DEFAULT 'MEDIA',
    "duracionEstimadaMin" INTEGER NOT NULL,
    "tiempoRealMin" INTEGER,
    "estado" "EstadoTarea" NOT NULL DEFAULT 'PENDIENTE',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entradas_diario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "texto" TEXT NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entradas_diario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etiquetas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sugerencias" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "contenido" TEXT NOT NULL,
    "estado" "EstadoSugerencia" NOT NULL DEFAULT 'PENDIENTE',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sugerencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EntradaDiarioToEtiqueta" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EntradaDiarioToEtiqueta_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_clave_key" ON "plantillas"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "dias_planificados_usuarioId_fecha_key" ON "dias_planificados"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "tareas_usuarioId_fechaEntrega_idx" ON "tareas"("usuarioId", "fechaEntrega");

-- CreateIndex
CREATE INDEX "entradas_diario_usuarioId_fecha_idx" ON "entradas_diario"("usuarioId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "etiquetas_usuarioId_nombre_key" ON "etiquetas"("usuarioId", "nombre");

-- CreateIndex
CREATE INDEX "_EntradaDiarioToEtiqueta_B_index" ON "_EntradaDiarioToEtiqueta"("B");

-- AddForeignKey
ALTER TABLE "bloques_plantilla" ADD CONSTRAINT "bloques_plantilla_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "plantillas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dias_planificados" ADD CONSTRAINT "dias_planificados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dias_planificados" ADD CONSTRAINT "dias_planificados_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "plantillas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloques" ADD CONSTRAINT "bloques_diaId_fkey" FOREIGN KEY ("diaId") REFERENCES "dias_planificados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloques" ADD CONSTRAINT "bloques_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas_diario" ADD CONSTRAINT "entradas_diario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugerencias" ADD CONSTRAINT "sugerencias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EntradaDiarioToEtiqueta" ADD CONSTRAINT "_EntradaDiarioToEtiqueta_A_fkey" FOREIGN KEY ("A") REFERENCES "entradas_diario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EntradaDiarioToEtiqueta" ADD CONSTRAINT "_EntradaDiarioToEtiqueta_B_fkey" FOREIGN KEY ("B") REFERENCES "etiquetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

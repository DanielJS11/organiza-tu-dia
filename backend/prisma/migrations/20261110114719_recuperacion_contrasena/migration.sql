/*
  Warnings:

  - A unique constraint covering the columns `[tokenRecuperacion]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "contrasenaCambiadaEn" TIMESTAMP(3),
ADD COLUMN     "tokenRecuperacion" TEXT,
ADD COLUMN     "tokenRecuperacionExpira" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tokenRecuperacion_key" ON "usuarios"("tokenRecuperacion");

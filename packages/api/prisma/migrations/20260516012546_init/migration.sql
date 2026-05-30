-- Migración parcialmente omitida: EquipmentLoanStatus y tabla equipment_loans 
-- ya existen en 20260515014422_init. Solo se crean los objetos de Locker.

-- CreateEnum
CREATE TYPE "LockerStatus" AS ENUM ('Available', 'Assigned', 'Maintenance');

-- CreateEnum
CREATE TYPE "LockerLocation" AS ENUM ('Hall', 'Vestibulo', 'Pasillo', 'Gimnasio', 'Administracion');

-- CreateTable
CREATE TABLE "lockers" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "location" "LockerLocation" NOT NULL,
    "status" "LockerStatus" NOT NULL DEFAULT 'Available',
    "member_id" TEXT,
    "deleted_at" DATE,

    CONSTRAINT "lockers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lockers_number_key" ON "lockers"("number");

-- AddForeignKey
ALTER TABLE "lockers" ADD CONSTRAINT "lockers_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
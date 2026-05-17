-- CreateEnum
CREATE TYPE "LockerStatus" AS ENUM ('Available', 'Assigned', 'Maintenance');

-- CreateEnum
CREATE TYPE "LockerLocation" AS ENUM ('Hall', 'Vestibulo', 'Pasillo', 'Gimnasio', 'Administracion');

-- CreateEnum
CREATE TYPE "EquipmentLoanStatus" AS ENUM ('Loaned', 'Returned', 'Damaged', 'Canceled');

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

-- CreateTable
CREATE TABLE "equipment_loans" (
    "id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "status" "EquipmentLoanStatus" NOT NULL DEFAULT 'Loaned',
    "loan_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "canceled_at" TIMESTAMP(3),
    "member_id" TEXT NOT NULL,

    CONSTRAINT "equipment_loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lockers_number_key" ON "lockers"("number");

-- AddForeignKey
ALTER TABLE "lockers" ADD CONSTRAINT "lockers_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_loans" ADD CONSTRAINT "equipment_loans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

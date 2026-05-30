-- DropForeignKey
ALTER TABLE "equipment_loans" DROP CONSTRAINT "equipment_loans_member_id_fkey";

-- AddForeignKey
ALTER TABLE "equipment_loans" ADD CONSTRAINT "equipment_loans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

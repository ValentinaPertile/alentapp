import { PrismaClient } from '../generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { EquipmentLoanDTO, CreateEquipmentLoanRequest } from '@alentapp/shared';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';

// Helper: convierte un registro de Prisma a EquipmentLoanDTO
function toDTO(e: any): EquipmentLoanDTO {
    return {
        id:          e.id,
        item_name:   e.item_name,
        status:      e.status,
        loan_date:   e.loan_date.toISOString(),
        due_date:    e.due_date.toISOString(),
        canceled_at: e.canceled_at ? e.canceled_at.toISOString() : null,
        member_id:   e.member_id,
    };
}

export class PostgresEquipmentLoanRepository implements EquipmentLoanRepository {
    private prisma: PrismaClient;

    constructor() {
        const adapter = new PrismaPg(process.env.DATABASE_URL as any);
        this.prisma = new PrismaClient({ adapter });
    }

    async create(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        const equipmentLoan = await this.prisma.equipmentLoan.create({
            data: {
                item_name:   data.item_name,
                loan_date:   new Date(data.loan_date),
                due_date:    new Date(data.due_date),
                canceled_at: null,
                // status queda en Loaned por defecto (definido en el schema)
                member:      { connect: { id: data.member_id } },
            },
        });
        return toDTO(equipmentLoan);
    }

    async findById(id: string): Promise<EquipmentLoanDTO | null> {
        const equipmentLoan = await this.prisma.equipmentLoan.findUnique({ where: { id } });
        return equipmentLoan ? toDTO(equipmentLoan) : null;
    }

    async update(id: string, data: Partial<EquipmentLoanDTO>): Promise<EquipmentLoanDTO> {
        const equipmentLoan = await this.prisma.equipmentLoan.update({
            where: { id },
            data: {
                ...(data.status && { status: data.status as any }),
                ...(data.canceled_at !== undefined && {
                    canceled_at: data.canceled_at ? new Date(data.canceled_at) : null,
                }),
            },
        });
        return toDTO(equipmentLoan);
    }
}
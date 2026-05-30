import { PrismaClient } from '../generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PaymentDTO, CreatePaymentRequest, PaymentStatus } from '@alentapp/shared';
import { PaymentRepository } from '../domain/PaymentRepository.js';

// Helper: convierte un registro de Prisma a PaymentDTO
function toDTO(p: {
    id: string;
    amount: number;
    month: number;
    year: number;
    status: string;
    due_date: Date;
    payment_date: Date | null;
    cancelled_at: Date | null;
    member_id: string;
}): PaymentDTO {
    return {
        id:           p.id,
        amount:       p.amount,
        month:        p.month,
        year:         p.year,
        status:       p.status as PaymentStatus,
        due_date: p.due_date.toISOString().split('T')[0],  // ← sin el ternario
        payment_date: p.payment_date ? p.payment_date.toISOString() : null,
        cancelled_at: p.cancelled_at ? p.cancelled_at.toISOString() : null,
        member_id:    p.member_id,
    };
}

export class PostgresPaymentRepository implements PaymentRepository {
    private prisma: PrismaClient;

    constructor() {
        const adapter = new PrismaPg(process.env.DATABASE_URL as string);
        this.prisma = new PrismaClient({ adapter });
    }

    async create(data: CreatePaymentRequest): Promise<PaymentDTO> {
        const payment = await this.prisma.payment.create({
            data: {
                amount:       data.amount,
                month:        data.month,
                year:         data.year,
                due_date:     new Date(data.due_date!),
                payment_date: data.payment_date ? new Date(data.payment_date) : null,
                cancelled_at: null,
                // status queda en Pending por defecto (definido en el schema)
                member:       { connect: { id: data.member_id } },
            },
        });
        return toDTO(payment);
    }

    async findAll(): Promise<PaymentDTO[]> {
        const payments = await this.prisma.payment.findMany({
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
        });
        return payments.map(toDTO);
    }

    async findById(id: string): Promise<PaymentDTO | null> {
        const payment = await this.prisma.payment.findUnique({ where: { id } });
        return payment ? toDTO(payment) : null;
    }

    async findActiveByMemberMonthYear(
        memberId: string,
        month: number,
        year: number,
    ): Promise<PaymentDTO | null> {
        const payment = await this.prisma.payment.findFirst({
            where: {
                member_id: memberId,
                month,
                year,
                status: { not: 'Canceled' },
            },
        });
        return payment ? toDTO(payment) : null;
    }

    async update(id: string, data: Partial<PaymentDTO>): Promise<PaymentDTO> {
        const payment = await this.prisma.payment.update({
            where: { id },
            data: {
                ...(data.status && { status: data.status }),
                ...(data.payment_date !== undefined && {
                    payment_date: data.payment_date ? new Date(data.payment_date) : null,
                }),
                ...(data.cancelled_at !== undefined && {
                    cancelled_at: data.cancelled_at ? new Date(data.cancelled_at) : null,
                }),
            },
        });
        return toDTO(payment);
    }
}
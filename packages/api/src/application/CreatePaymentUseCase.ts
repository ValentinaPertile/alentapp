import { CreatePaymentRequest, PaymentDTO } from '@alentapp/shared';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';

export class CreatePaymentUseCase {
    constructor(
        private readonly paymentRepo: PaymentRepository,
        private readonly memberRepo: MemberRepository,
    ) {}

    async execute(data: CreatePaymentRequest): Promise<PaymentDTO> {
        // 1. Validar campos obligatorios ausentes
        if (!data.member_id) throw new Error('El campo member_id es requerido');
        if (data.amount === undefined || data.amount === null) throw new Error('El campo amount es requerido');
        if (data.month === undefined || data.month === null) throw new Error('El campo month es requerido');
        if (data.year === undefined || data.year === null) throw new Error('El campo year es requerido');
        if (!data.due_date) throw new Error('El campo due_date es requerido');

        // 2. Validar tipos
        if (typeof data.amount !== 'number' || isNaN(data.amount)) {
            throw new Error('El campo amount debe ser un número válido');
        }
        if (typeof data.month !== 'number' || isNaN(data.month)) {
            throw new Error('El campo month debe ser un número válido');
        }
        if (typeof data.year !== 'number' || isNaN(data.year)) {
            throw new Error('El campo year debe ser un número válido');
        }

        // 3. Validar que el monto sea mayor a cero
        if (data.amount <= 0) {
            throw new Error('El monto debe ser mayor a cero');
        }

        // 4. Validar mes
        if (data.month < 1 || data.month > 12) {
            throw new Error('El mes debe estar entre 1 y 12');
        }

        // 5. Validar rango de año
        if (data.year < 2000 || data.year > 2100) {
            throw new Error('El año debe estar entre 2000 y 2100');
        }

        // 6. Validar que el socio existe, lanza 404 desde el controller
        const member = await this.memberRepo.findById(data.member_id);
        if (!member) {
            throw new Error('MEMBER_NOT_FOUND: El socio no existe');
        }
 
        // 7. Validar que no exista un pago activo para ese socio en el mismo mes/año
        //Que no este en estado Canceled se verifica en infrastructure/PostgresPaymentRepository.ts en el método findActiveByMemberMonthYear
        const existing = await this.paymentRepo.findActiveByMemberMonthYear(
            data.member_id,
            data.month,
            data.year,
        );
        if (existing) {
            throw new Error('Ya existe un pago activo para ese socio en ese período');
        }

        // 8. Crear el pago (siempre arranca en Pending)
        return await this.paymentRepo.create(data);
    }
}
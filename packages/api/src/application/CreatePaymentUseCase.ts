import { CreatePaymentRequest, PaymentDTO } from '@alentapp/shared';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';

export class CreatePaymentUseCase {
    constructor(
        private readonly paymentRepo: PaymentRepository,
        private readonly memberRepo: MemberRepository,
    ) {}

    async execute(data: CreatePaymentRequest): Promise<PaymentDTO> {
        // 1. Validar que el socio existe
        const member = await this.memberRepo.findById(data.member_id);
        if (!member) {
            throw new Error('El socio no existe');
        }

        // 2. Validar que el monto sea mayor a cero
        if (data.amount <= 0) {
            throw new Error('El monto debe ser mayor a cero');
        }

        // 3. Validarmes
        if (data.month < 1 || data.month > 12) {
            throw new Error('El mes debe estar entre 1 y 12');
        }

        // 4. Validar que no exista un pago activo para ese socio en el mismo mes/año
        const existing = await this.paymentRepo.findActiveByMemberMonthYear(
            data.member_id,
            data.month,
            data.year,
        );
        if (existing) {
            throw new Error('Ya existe un pago activo para ese socio en ese período');
        }

        // 5. Crear el pago (siempre arranca en Pending)
        return await this.paymentRepo.create(data);
    }
}
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentDTO, PaymentStatus } from '@alentapp/shared';
import { Payment } from '../domain/Payment.js';

export class UpdatePaymentUseCase {
    constructor(
        private readonly paymentRepo: PaymentRepository
    ) {}

    async execute(id: string, newStatus: PaymentStatus): Promise<PaymentDTO> {
                // 1. Validar existencia del pago
                const dto = await this.paymentRepo.findById(id);
                if (!dto) {
                    throw new Error('El pago no existe');
                }
         
                // 2. Construir la entidad de dominio e invocar transitionTo
                //    — transitionTo maneja idempotencia y validación de transiciones
                const payment = new Payment(dto);
                payment.transitionTo(newStatus);
         
                // 3. Persistir y retornar
                return await this.paymentRepo.update(id, {
                    status:       payment.status,
                    payment_date: payment.payment_date,
                    cancelled_at: payment.cancelled_at,
                });
    }

}
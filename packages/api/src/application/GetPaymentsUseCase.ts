import { PaymentDTO } from '@alentapp/shared';
import { PaymentRepository } from '../domain/PaymentRepository.js';

export class GetPaymentsUseCase {
    constructor(private readonly paymentRepo: PaymentRepository) {}

    async execute(): Promise<PaymentDTO[]> {
        return await this.paymentRepo.findAll();
    }
}
// UpdatePaymentUseCase.test.ts se ubica en src/application/ siguiendo la misma
// estructura que los demás casos de uso. Testea la orquestación del caso de uso:
// búsqueda del pago, delegación a la entidad Payment y persistencia.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePaymentUseCase } from './UpdatePaymentUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';

describe('UpdatePaymentUseCase', () => {

    const mockPaymentRepo = {
        create: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        findActiveByMemberMonthYear: vi.fn(),
        update: vi.fn(),
    } as unknown as PaymentRepository;

    const useCase = new UpdatePaymentUseCase(mockPaymentRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    //test unitario 16 - UpdatePaymentUseCase Pending a Paid retorna payment_date
    it('16 - debe retornar el pago actualizado con payment_date seteado al pasar de Pending a Paid', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce({
            id: 'aabbccdd-e89b-12d3-a456-426614174000',
            amount: 1500,
            month: 5,
            year: 2026,
            status: 'Pending',
            due_date: '2026-06-10',
            payment_date: null,
            cancelled_at: null,
            member_id: '123e4567-e89b-12d3-a456-426614174000',
        });

        vi.mocked(mockPaymentRepo.update).mockResolvedValueOnce({
            id: 'aabbccdd-e89b-12d3-a456-426614174000',
            amount: 1500,
            month: 5,
            year: 2026,
            status: 'Paid',
            due_date: '2026-06-10',
            payment_date: '2026-05-24T00:00:00.000Z',
            cancelled_at: null,
            member_id: '123e4567-e89b-12d3-a456-426614174000',
        });

        const result = await useCase.execute('aabbccdd-e89b-12d3-a456-426614174000', 'Paid');

        expect(result.status).toBe('Paid');
        expect(result.payment_date).not.toBeNull();
        expect(result.cancelled_at).toBeNull();
        expect(mockPaymentRepo.update).toHaveBeenCalledWith(
            'aabbccdd-e89b-12d3-a456-426614174000',
            expect.objectContaining({ status: 'Paid' }),
        );
    });

    //test unitario 17 - UpdatePaymentUseCase id inexistente lanza error
    it('17 - debe lanzar un error si el id del pago no existe', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute('id-inexistente-0000-0000-000000000000', 'Paid'),
        ).rejects.toThrow('El pago no existe');
    });

});
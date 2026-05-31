import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateEquipmentLoanUseCase } from './UpdateEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';

describe('UpdateEquipmentLoanUseCase', () => {

    const mockEquipmentLoanRepo = {
        create: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as EquipmentLoanRepository;

    const useCase = new UpdateEquipmentLoanUseCase(mockEquipmentLoanRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const baseLoanDTO = {
        id: 'aabbccdd-e89b-12d3-a456-426614174000',
        item_name: 'Pelota',
        status: 'Loaned' as const,
        loan_date: '2026-05-01T00:00:00.000Z',
        due_date: '2026-05-15T00:00:00.000Z',
        canceled_at: null,
        member_id: '123e4567-e89b-12d3-a456-426614174000',
    };

    // test unitario 1 - actualizar a Returned
    it('1 - debe actualizar el status a Returned correctamente', async () => {
        vi.mocked(mockEquipmentLoanRepo.findById).mockResolvedValueOnce(baseLoanDTO);
        vi.mocked(mockEquipmentLoanRepo.update).mockResolvedValueOnce({
            ...baseLoanDTO,
            status: 'Returned',
        });

        const result = await useCase.execute(baseLoanDTO.id, 'Returned');

        expect(mockEquipmentLoanRepo.findById).toHaveBeenCalledWith(baseLoanDTO.id);
        expect(mockEquipmentLoanRepo.update).toHaveBeenCalled();
        expect(result.status).toBe('Returned');
    });

    // test unitario 2 - actualizar a Canceled setea canceled_at
    it('2 - debe actualizar el status a Canceled y setear canceled_at', async () => {
        vi.mocked(mockEquipmentLoanRepo.findById).mockResolvedValueOnce(baseLoanDTO);
        vi.mocked(mockEquipmentLoanRepo.update).mockResolvedValueOnce({
            ...baseLoanDTO,
            status: 'Canceled',
            canceled_at: '2026-05-15T00:00:00.000Z',
        });

        const result = await useCase.execute(baseLoanDTO.id, 'Canceled');

        expect(result.status).toBe('Canceled');
        expect(mockEquipmentLoanRepo.update).toHaveBeenCalledWith(
            baseLoanDTO.id,
            expect.objectContaining({ status: 'Canceled', canceled_at: expect.any(String) })
        );
    });

    // test unitario 3 - préstamo no existe
    it('3 - debe lanzar error si el préstamo no existe', async () => {
        vi.mocked(mockEquipmentLoanRepo.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute('id-inexistente', 'Returned')
        ).rejects.toThrow('El préstamo no existe');
    });

    // test unitario 4 - transición inválida
    it('4 - debe lanzar error si la transición de estado es inválida', async () => {
        vi.mocked(mockEquipmentLoanRepo.findById).mockResolvedValueOnce({
            ...baseLoanDTO,
            status: 'Canceled',
            canceled_at: '2026-05-01T00:00:00.000Z',
        });

        await expect(
            useCase.execute(baseLoanDTO.id, 'Loaned')
        ).rejects.toThrow('Transición de estado inválida');
    });
});
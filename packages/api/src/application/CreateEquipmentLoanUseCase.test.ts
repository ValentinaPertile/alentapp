import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateEquipmentLoanUseCase } from './CreateEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';

describe('CreateEquipmentLoanUseCase', () => {

    const mockEquipmentLoanRepo = {
        create: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as EquipmentLoanRepository;

    const mockMemberRepo = {
        create: vi.fn(),
        findById: vi.fn(),
        findByDni: vi.fn(),
        findAll: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    } as unknown as MemberRepository;

    const useCase = new CreateEquipmentLoanUseCase(mockEquipmentLoanRepo, mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // test unitario 1 - happy path
    it('1 - debe crear un préstamo y retornar el EquipmentLoanDTO cuando los datos son válidos', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({
            id: '123e4567-e89b-12d3-a456-426614174000',
            dni: '12345678',
            name: 'Juan Pérez',
            email: 'juan@test.com',
            birthdate: '1990-01-01',
            category: 'Pleno',
            status: 'Activo',
            created_at: '2026-01-01T00:00:00.000Z',
        });

        vi.mocked(mockEquipmentLoanRepo.create).mockResolvedValueOnce({
            id: 'aabbccdd-e89b-12d3-a456-426614174000',
            item_name: 'Pelota',
            status: 'Loaned',
            loan_date: '2026-05-01T00:00:00.000Z',
            due_date: '2026-05-15T00:00:00.000Z',
            canceled_at: null,
            member_id: '123e4567-e89b-12d3-a456-426614174000',
        });

        const result = await useCase.execute({
            item_name: 'Pelota',
            loan_date: '2026-05-01T00:00:00.000Z',
            due_date: '2026-05-15T00:00:00.000Z',
            member_id: '123e4567-e89b-12d3-a456-426614174000',
        });

        expect(mockMemberRepo.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
        expect(mockEquipmentLoanRepo.create).toHaveBeenCalled();
        expect(result.status).toBe('Loaned');
        expect(result.canceled_at).toBeNull();
        expect(result.item_name).toBe('Pelota');
    });

    // test unitario 2 - socio no existe
    it('2 - debe lanzar error si el socio no existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute({
                item_name: 'Pelota',
                loan_date: '2026-05-01T00:00:00.000Z',
                due_date: '2026-05-15T00:00:00.000Z',
                member_id: '123e4567-e89b-12d3-a456-426614174000',
            }),
        ).rejects.toThrow('El socio no existe');
    });

    // test unitario 3 - socio Cadete no puede pedir prestamo
    it('3 - debe lanzar error si el socio es Cadete', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({
            id: '123e4567-e89b-12d3-a456-426614174000',
            dni: '12345678',
            name: 'Juan Pérez',
            email: 'juan@test.com',
            birthdate: '2010-01-01',
            category: 'Cadete',
            status: 'Activo',
            created_at: '2026-01-01T00:00:00.000Z',
        });

        await expect(
            useCase.execute({
                item_name: 'Pelota',
                loan_date: '2026-05-01T00:00:00.000Z',
                due_date: '2026-05-15T00:00:00.000Z',
                member_id: '123e4567-e89b-12d3-a456-426614174000',
            }),
        ).rejects.toThrow('Los socios Cadet no pueden solicitar equipamiento');
    });
});
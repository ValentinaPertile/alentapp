import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePaymentUseCase } from './CreatePaymentUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';

describe('CreatePaymentUseCase', () => {

    const mockPaymentRepo = {
        create: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        findActiveByMemberMonthYear: vi.fn(),
        update: vi.fn(),
    } as unknown as PaymentRepository;

    const mockMemberRepo = {
        create: vi.fn(),
        findById: vi.fn(),
        findByDni: vi.fn(),
        findAll: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    } as unknown as MemberRepository;

    const useCase = new CreatePaymentUseCase(mockPaymentRepo, mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    //test unitario 1 - happy path CreatePaymentUseCase
    it('1 - debe crear un pago y retornar el PaymentDTO cuando los datos son válidos', async () => {
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
        vi.mocked(mockPaymentRepo.findActiveByMemberMonthYear).mockResolvedValueOnce(null);

        vi.mocked(mockPaymentRepo.create).mockResolvedValueOnce({
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

        const result = await useCase.execute({
            amount: 1500,
            month: 5,
            year: 2026,
            member_id: '123e4567-e89b-12d3-a456-426614174000',
        });

        expect(mockMemberRepo.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
        expect(mockPaymentRepo.findActiveByMemberMonthYear).toHaveBeenCalledWith(
            '123e4567-e89b-12d3-a456-426614174000',
            5,
            2026,
        );
        expect(mockPaymentRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                amount: 1500,
                month: 5,
                year: 2026,
                member_id: '123e4567-e89b-12d3-a456-426614174000',
                due_date: '2026-06-10',
            }),
        );
        expect(result.status).toBe('Pending');
        expect(result.cancelled_at).toBeNull();
        expect(result.id).toBe('aabbccdd-e89b-12d3-a456-426614174000');
    });

    //test unitario 2 - member_id faltante
    it('2 - debe lanzar un error si falta el campo member_id', async () => {
        await expect(
            useCase.execute({
                amount: 1500,
                month: 5,
                year: 2026,
                member_id: '',
            }),
        ).rejects.toThrow('El campo member_id es requerido');
    });

    //test unitario 3 - amount inválido
    it('3 - debe lanzar un error si el amount es cero o negativo', async () => {
        await expect(
            useCase.execute({
                amount: 0,
                month: 5,
                year: 2026,
                member_id: '123e4567-e89b-12d3-a456-426614174000',
            }),
        ).rejects.toThrow('El monto debe ser mayor a cero');
    
        await expect(
            useCase.execute({
                amount: -100,
                month: 5,
                year: 2026,
                member_id: '123e4567-e89b-12d3-a456-426614174000',
            }),
        ).rejects.toThrow('El monto debe ser mayor a cero');
    });


    //test unitario 4 - month fuera de rango
    it('4 - debe lanzar un error si el month está fuera de rango', async () => {
        await expect(
            useCase.execute({
                amount: 1500,
                month: 13,
                year: 2026,
                member_id: '123e4567-e89b-12d3-a456-426614174000',
            }),
        ).rejects.toThrow('El mes debe estar entre 1 y 12');
    
        await expect(
            useCase.execute({
                amount: 1500,
                month: 0,
                year: 2026,
                member_id: '123e4567-e89b-12d3-a456-426614174000',
            }),
        ).rejects.toThrow('El mes debe estar entre 1 y 12');
    });

    //test unitario 5 - socio no existe
    it('5 - debe lanzar un error si el socio no existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);
    
        await expect(
            useCase.execute({
                amount: 1500,
                month: 5,
                year: 2026,
                member_id: '123e4567-e89b-12d3-a456-426614174000',
            }),
        ).rejects.toThrow('MEMBER_NOT_FOUND');
    });

    //test unitario 6 - pago duplicado
    it('6 - debe lanzar un error si ya existe un pago activo para ese socio en ese período', async () => {
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
    
        vi.mocked(mockPaymentRepo.findActiveByMemberMonthYear).mockResolvedValueOnce({
            id: 'existing-payment-id',
            amount: 1500,
            month: 5,
            year: 2026,
            status: 'Pending',
            due_date: '2026-06-10',
            payment_date: null,
            cancelled_at: null,
            member_id: '123e4567-e89b-12d3-a456-426614174000',
        });
    
        await expect(
            useCase.execute({
                amount: 1500,
                month: 5,
                year: 2026,
                member_id: '123e4567-e89b-12d3-a456-426614174000',
            }),
        ).rejects.toThrow('Ya existe un pago activo para ese socio en ese período');
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateLockerUseCase } from './CreateLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';
import { CreateLockerRequest, LockerDTO } from '@alentapp/shared';

describe('CreateLockerUseCase', () => {
    const mockLockerRepo = {
        create: vi.fn(),
    } as unknown as LockerRepository;

    const mockLockerValidator = {
        validateNumber: vi.fn(),
        validateLocation: vi.fn(),
        validateNumberIsUnique: vi.fn(),
    } as unknown as LockerValidator;

    const useCase = new CreateLockerUseCase(mockLockerRepo, mockLockerValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un casillero válido', async () => {
        const mockRequest: CreateLockerRequest = {
            number: 10,
            location: 'Hall',
        };

        const mockLocker: LockerDTO = {
            id: 'locker-1',
            number: 10,
            location: 'Hall',
            status: 'Available',
            member_id: null,
            deleted_at: null,
        };

        vi.mocked(mockLockerRepo.create).mockResolvedValueOnce(mockLocker);

        const result = await useCase.execute(mockRequest);

        expect(mockLockerValidator.validateNumber).toHaveBeenCalledWith(10);
        expect(mockLockerValidator.validateLocation).toHaveBeenCalledWith('Hall');
        expect(mockLockerValidator.validateNumberIsUnique).toHaveBeenCalledWith(10);
        expect(mockLockerRepo.create).toHaveBeenCalledWith(mockRequest);

        expect(result).toEqual(mockLocker);
    });
    it('debe crear el casillero con estado inicial Available', async () => {
        const mockRequest: CreateLockerRequest = {
            number: 11,
            location: 'Hall',
        };

        const mockLocker: LockerDTO = {
            id: 'locker-2',
            number: 11,
            location: 'Hall',
            status: 'Available',
            member_id: null,
            deleted_at: null,
        };

        vi.mocked(mockLockerRepo.create).mockResolvedValueOnce(mockLocker);

        const result = await useCase.execute(mockRequest);

        expect(result.status).toBe('Available');
    });
    it('debe crear el casillero sin socio asignado y sin fecha de baja', async () => {
        const mockRequest: CreateLockerRequest = {
            number: 12,
            location: 'Hall',
        };

        const mockLocker: LockerDTO = {
            id: 'locker-3',
            number: 12,
            location: 'Hall',
            status: 'Available',
            member_id: null,
            deleted_at: null,
        };

        vi.mocked(mockLockerRepo.create).mockResolvedValueOnce(mockLocker);

        const result = await useCase.execute(mockRequest);

        expect(result.member_id).toBeNull();
        expect(result.deleted_at).toBeNull();
    });
});
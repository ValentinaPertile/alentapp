import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateLockerUseCase } from './UpdateLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';
import { LockerDTO, UpdateLockerRequest } from '@alentapp/shared';

describe('UpdateLockerUseCase', () => {
    const mockLockerRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as LockerRepository;

    const mockLockerValidator = {
        validateNumber: vi.fn(),
        validateLocation: vi.fn(),
        validateStatus: vi.fn(),
        validateNumberIsUnique: vi.fn(),
        validateStatusAndMember: vi.fn(),
    } as unknown as LockerValidator;

    const useCase = new UpdateLockerUseCase(mockLockerRepo, mockLockerValidator);

    const existingLocker: LockerDTO = {
        id: 'locker-1',
        number: 10,
        location: 'Hall',
        status: 'Available',
        member_id: null,
        deleted_at: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockLockerRepo.findById).mockResolvedValue(existingLocker);
    });

    it('debe permitir modificar la ubicación de un casillero existente', async () => {
        const updateData: UpdateLockerRequest = {
            number: 10,
            location: 'Gimnasio',
            status: 'Available',
            member_id: null,
        };

        const updatedLocker: LockerDTO = {
            ...existingLocker,
            location: 'Gimnasio',
        };

        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce(updatedLocker);

        const result = await useCase.execute('locker-1', updateData);

        expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
        expect(mockLockerValidator.validateNumber).toHaveBeenCalledWith(10);
        expect(mockLockerValidator.validateLocation).toHaveBeenCalledWith('Gimnasio');
        expect(mockLockerValidator.validateStatus).toHaveBeenCalledWith('Available');
        expect(mockLockerValidator.validateNumberIsUnique).toHaveBeenCalledWith(10, 'locker-1');
        expect(mockLockerValidator.validateStatusAndMember).toHaveBeenCalledWith('Available', null);

        expect(mockLockerRepo.update).toHaveBeenCalledWith('locker-1', updateData);
        expect(result.location).toBe('Gimnasio');
    });
});
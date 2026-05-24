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
    it('debe permitir cambiar el estado de un casillero a Maintenance', async () => {
        const updateData: UpdateLockerRequest = {
            number: 10,
            location: 'Hall',
            status: 'Maintenance',
            member_id: null,
        };

        const updatedLocker: LockerDTO = {
            ...existingLocker,
            status: 'Maintenance',
        };

        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce(updatedLocker);

        const result = await useCase.execute('locker-1', updateData);

        expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
        expect(mockLockerValidator.validateNumber).toHaveBeenCalledWith(10);
        expect(mockLockerValidator.validateLocation).toHaveBeenCalledWith('Hall');
        expect(mockLockerValidator.validateStatus).toHaveBeenCalledWith('Maintenance');
        expect(mockLockerValidator.validateNumberIsUnique).toHaveBeenCalledWith(10, 'locker-1');
        expect(mockLockerValidator.validateStatusAndMember).toHaveBeenCalledWith('Maintenance', null);

        expect(mockLockerRepo.update).toHaveBeenCalledWith('locker-1', updateData);
        expect(result.status).toBe('Maintenance');
    });

    it('debe permitir asignar un casillero a un socio', async () => {
        const updateData: UpdateLockerRequest = {
            number: 10,
            location: 'Hall',
            status: 'Assigned',
            member_id: 'member-1',
        };

        const updatedLocker: LockerDTO = {
            ...existingLocker,
            status: 'Assigned',
            member_id: 'member-1',
        };

        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce(updatedLocker);

        const result = await useCase.execute('locker-1', updateData);

        expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
        expect(mockLockerValidator.validateNumber).toHaveBeenCalledWith(10);
        expect(mockLockerValidator.validateLocation).toHaveBeenCalledWith('Hall');
        expect(mockLockerValidator.validateStatus).toHaveBeenCalledWith('Assigned');
        expect(mockLockerValidator.validateNumberIsUnique).toHaveBeenCalledWith(10, 'locker-1');
        expect(mockLockerValidator.validateStatusAndMember).toHaveBeenCalledWith('Assigned', 'member-1');

        expect(mockLockerRepo.update).toHaveBeenCalledWith('locker-1', updateData);
        expect(result.status).toBe('Assigned');
        expect(result.member_id).toBe('member-1');
    });
    it('no debe permitir dejar un casillero como Assigned sin socio asignado', async () => {
        const updateData: UpdateLockerRequest = {
            number: 10,
            location: 'Hall',
            status: 'Assigned',
            member_id: null,
        };

        vi.mocked(mockLockerValidator.validateStatusAndMember)
            .mockRejectedValueOnce(new Error('Debe indicarse un socio para asignar el casillero'));

        await expect(useCase.execute('locker-1', updateData))
            .rejects
            .toThrow('Debe indicarse un socio para asignar el casillero');

        expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
        expect(mockLockerValidator.validateNumber).toHaveBeenCalledWith(10);
        expect(mockLockerValidator.validateLocation).toHaveBeenCalledWith('Hall');
        expect(mockLockerValidator.validateStatus).toHaveBeenCalledWith('Assigned');
        expect(mockLockerValidator.validateNumberIsUnique).toHaveBeenCalledWith(10, 'locker-1');
        expect(mockLockerValidator.validateStatusAndMember).toHaveBeenCalledWith('Assigned', null);

        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteLockerUseCase } from './DeleteLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerDTO } from '@alentapp/shared';

describe('DeleteLockerUseCase', () => {
    const mockLockerRepo = {
        findById: vi.fn(),
        softDelete: vi.fn(),
    } as unknown as LockerRepository;

    const useCase = new DeleteLockerUseCase(mockLockerRepo);

    const existingLocker: LockerDTO = {
        id: 'locker-1',
        number: 10,
        location: 'Hall',
        status: 'Assigned',
        member_id: 'member-1',
        deleted_at: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockLockerRepo.findById).mockResolvedValue(existingLocker);
    });

    it('debe realizar la baja lógica de un casillero existente', async () => {
        const deletedLocker: LockerDTO = {
            ...existingLocker,
            status: 'Canceled',
            member_id: null,
            deleted_at: '2026-05-24',
        };

        vi.mocked(mockLockerRepo.softDelete).mockResolvedValueOnce(deletedLocker);

        const result = await useCase.execute('locker-1');

        expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
        expect(mockLockerRepo.softDelete).toHaveBeenCalledWith(
            'locker-1',
            expect.any(Date),
        );

        expect(result).toEqual(deletedLocker);
    });
    it('debe cambiar el estado del casillero a Canceled al darlo de baja', async () => {
        const deletedLocker: LockerDTO = {
            ...existingLocker,
            status: 'Canceled',
            member_id: null,
            deleted_at: '2026-05-24',
        };

        vi.mocked(mockLockerRepo.softDelete).mockResolvedValueOnce(deletedLocker);

        const result = await useCase.execute('locker-1');

        expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
        expect(mockLockerRepo.softDelete).toHaveBeenCalledWith(
            'locker-1',
            expect.any(Date),
        );

        expect(result.status).toBe('Canceled');
    });
    it('debe liberar el socio asignado al dar de baja el casillero', async () => {
        const deletedLocker: LockerDTO = {
            ...existingLocker,
            status: 'Canceled',
            member_id: null,
            deleted_at: '2026-05-24',
        };

        vi.mocked(mockLockerRepo.softDelete).mockResolvedValueOnce(deletedLocker);

        const result = await useCase.execute('locker-1');

        expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
        expect(mockLockerRepo.softDelete).toHaveBeenCalledWith(
            'locker-1',
            expect.any(Date),
        );

        expect(result.member_id).toBeNull();
    });

    it('no debe permitir dar de baja un casillero que ya fue dado de baja', async () => {
        const alreadyDeletedLocker: LockerDTO = {
            ...existingLocker,
            status: 'Canceled',
            member_id: null,
            deleted_at: '2026-05-24',
        };

        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(alreadyDeletedLocker);

        await expect(useCase.execute('locker-1'))
            .rejects
            .toThrow('El casillero ya fue dado de baja');

        expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
        expect(mockLockerRepo.softDelete).not.toHaveBeenCalled();
    });

});

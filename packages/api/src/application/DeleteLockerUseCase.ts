import { LockerDTO } from '@alentapp/shared';
import { LockerRepository } from '../domain/LockerRepository.js';

export class DeleteLockerUseCase {
    constructor(private readonly lockerRepository: LockerRepository) {}

    async execute(id: string): Promise<LockerDTO> {
        const existingLocker = await this.lockerRepository.findById(id);

        if (!existingLocker) {
            throw new Error('El casillero no fue encontrado');
        }

        if (existingLocker.deleted_at !== null) {
            throw new Error('El casillero ya fue dado de baja');
        }

        const deletedAt = new Date();

        return this.lockerRepository.softDelete(id, deletedAt);
    }
}
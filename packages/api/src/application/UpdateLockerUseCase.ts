import { LockerDTO, UpdateLockerRequest } from '@alentapp/shared';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';

export class UpdateLockerUseCase {
    constructor(
        private readonly lockerRepository: LockerRepository,
        private readonly lockerValidator: LockerValidator,
    ) {}

    async execute(id: string, data: UpdateLockerRequest): Promise<LockerDTO> {
        const existingLocker = await this.lockerRepository.findById(id);

        if (!existingLocker) {
            throw new Error('El casillero no fue encontrado');
        }

        if (existingLocker.deleted_at !== null) {
            throw new Error('El casillero no puede modificarse porque fue dado de baja');
        }

        this.lockerValidator.validateNumber(data.number);
        this.lockerValidator.validateLocation(data.location);
        this.lockerValidator.validateStatus(data.status);

        await this.lockerValidator.validateNumberIsUnique(data.number, id);
        await this.lockerValidator.validateStatusAndMember(data.status, data.member_id);

        return this.lockerRepository.update(id, data);
    }
}
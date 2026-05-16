import { LockerDTO, CreateLockerRequest } from '@alentapp/shared';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';

export class CreateLockerUseCase {
    constructor(
        private readonly lockerRepository: LockerRepository,
        private readonly lockerValidator: LockerValidator,
    ) {}

    async execute(data: CreateLockerRequest): Promise<LockerDTO> {
        this.lockerValidator.validateNumber(data.number);
        this.lockerValidator.validateLocation(data.location);

        await this.lockerValidator.validateNumberIsUnique(data.number);

        return this.lockerRepository.create(data);
    }
}

import { LockerLocation, LockerStatus } from '@alentapp/shared';
import { LockerRepository } from '../LockerRepository.js';
import { MemberRepository } from '../MemberRepository.js';

const VALID_LOCATIONS: LockerLocation[] = [
    'Hall',
    'Vestibulo',
    'Pasillo',
    'Gimnasio',
    'Administracion',
];

const VALID_STATUSES: LockerStatus[] = [
    'Available',
    'Assigned',
    'Maintenance',
];

export class LockerValidator {
    constructor(
        private readonly lockerRepository: LockerRepository,
        private readonly memberRepository: MemberRepository,
    ) {}

    validateNumber(number: number): void {
        if (number === undefined || number === null) {
            throw new Error('El número de casillero es requerido');
        }

        if (!Number.isInteger(number) || number <= 0) {
            throw new Error('El número de casillero debe ser mayor a cero');
        }
    }

    validateLocation(location: LockerLocation): void {
        if (!location) {
            throw new Error('La ubicación es requerida');
        }

        if (!VALID_LOCATIONS.includes(location)) {
            throw new Error('La ubicación no es válida');
        }
    }

    validateStatus(status: LockerStatus): void {
        if (!status) {
            throw new Error('El estado del casillero es requerido');
        }

        if (!VALID_STATUSES.includes(status)) {
            throw new Error('El estado del casillero no es válido');
        }
    }

    async validateNumberIsUnique(number: number, currentLockerId?: string): Promise<void> {
        const existingLocker = currentLockerId
            ? await this.lockerRepository.findByNumberExcludingId(number, currentLockerId)
            : await this.lockerRepository.findByNumber(number);

        if (existingLocker) {
            throw new Error('El número de casillero ya está en uso');
        }
    }

    async validateStatusAndMember(status: LockerStatus, memberId: string | null): Promise<void> {
        if (status === 'Assigned') {
            if (!memberId) {
                throw new Error('Debe indicarse un socio para asignar el casillero');
            }

            const member = await this.memberRepository.findById(memberId);

            if (!member) {
                throw new Error('El socio no fue encontrado');
            }

            return;
        }

        if (status === 'Maintenance' && memberId) {
            throw new Error('No se puede asignar un casillero en mantenimiento');
        }

        if (status === 'Available' && memberId) {
            throw new Error('Un casillero disponible no puede tener socio asignado');
        }
    }
}
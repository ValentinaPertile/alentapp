import { CreateEquipmentLoanRequest, EquipmentLoanDTO } from '@alentapp/shared';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';

export class CreateEquipmentLoanUseCase {
    constructor(
        private readonly equipmentLoanRepo: EquipmentLoanRepository,
        private readonly memberRepo: MemberRepository,
    ) {}

    async execute(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        // 1. Validar que el socio existe
        const member = await this.memberRepo.findById(data.member_id);
        if (!member) {
            throw new Error('El socio no existe');
        }

        // 2. Validar que el socio sea Senior o Lifetime (no Cadet)
        if (member.category === 'Cadete') {
            throw new Error('Los socios Cadet no pueden solicitar equipamiento');
        }

        // 3. Crear el préstamo (siempre arranca en Loaned)
        return await this.equipmentLoanRepo.create(data);
    }
}
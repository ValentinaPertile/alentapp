import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO, EquipmentLoanStatus } from '@alentapp/shared';
import { EquipmentLoan } from '../domain/EquipmentLoan.js';

export class UpdateEquipmentLoanUseCase {
    constructor(
        private readonly equipmentLoanRepo: EquipmentLoanRepository,
    ) {}

    async execute(id: string, newStatus: EquipmentLoanStatus): Promise<EquipmentLoanDTO> {
        // 1. Validar existencia del préstamo
        const dto = await this.equipmentLoanRepo.findById(id);
        if (!dto) {
            throw new Error('El préstamo no existe');
        }

        // 2. Construir la entidad de dominio e invocar transitionTo
        //    — transitionTo maneja idempotencia y validación de transiciones
        const equipmentLoan = new EquipmentLoan(dto);
        equipmentLoan.transitionTo(newStatus);

        // 3. Persistir y retornar
        return await this.equipmentLoanRepo.update(id, {
            status:      equipmentLoan.status,
            canceled_at: equipmentLoan.canceled_at,
        });
    }
}
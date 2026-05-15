import { EquipmentLoanDTO, CreateEquipmentLoanRequest } from '@alentapp/shared';

// Puerto de Salida — el dominio define el contrato, la infraestructura lo implementa.
export interface EquipmentLoanRepository {
  create(equipmentLoan: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO>;
  findById(id: string): Promise<EquipmentLoanDTO | null>;
  update(id: string, data: Partial<EquipmentLoanDTO>): Promise<EquipmentLoanDTO>;
}
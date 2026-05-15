import { PaymentDTO, CreatePaymentRequest } from '@alentapp/shared';
 
// Puerto de Salida — el dominio define el contrato, la infraestructura lo implementa.
export interface PaymentRepository {
  create(payment: CreatePaymentRequest): Promise<PaymentDTO>;
  findById(id: string): Promise<PaymentDTO | null>;
  findActiveByMemberMonthYear(memberId: string, month: number, year: number): Promise<PaymentDTO | null>;
  update(id: string, data: Partial<PaymentDTO>): Promise<PaymentDTO>;
}
 
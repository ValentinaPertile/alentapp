// ==========================================
// Member
// ==========================================
export type MemberCategory = 'Pleno' | 'Cadete' | 'Honorario';
export type MemberStatus = 'Activo' | 'Moroso' | 'Suspendido';

export interface MemberDTO {
  id: string; // UUID
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
  status: MemberStatus;
  created_at: string; // ISO Date String
}

export interface CreateMemberRequest {
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
}

export interface UpdateMemberRequest {
  dni?: string;
  name?: string;
  email?: string;
  birthdate?: string; // ISO Date String (YYYY-MM-DD)
  category?: MemberCategory;
  status?: MemberStatus;
}


// ==========================================
// Payment
// ==========================================

export type PaymentStatus = 'Pending' | 'Paid' | 'Canceled';
 
export interface PaymentDTO {
  id: string;
  amount: number;
  month: number;
  year: number;
  status: PaymentStatus;
  due_date: string;        
  payment_date: string | null;
  cancelled_at: string | null;
  member_id: string;
}
 
export interface CreatePaymentRequest {
  amount: number;
  month: number;
  year: number;
  due_date: string;        
  payment_date?: string | null;
  member_id: string;
}
 
export interface UpdatePaymentRequest {
  status: PaymentStatus;
}
// ==========================================
// EquipmentLoan
// ==========================================
export type EquipmentLoanStatus = 'Loaned' | 'Returned' | 'Damaged' | 'Canceled';

export interface EquipmentLoanDTO {
  id: string;
  item_name: string;
  status: EquipmentLoanStatus;
  loan_date: string;
  due_date: string;
  canceled_at: string | null;
  member_id: string;
}

export interface CreateEquipmentLoanRequest {
  item_name: string;
  loan_date: string;
  due_date: string;
  member_id: string;
}

export interface UpdateEquipmentLoanRequest {
  status: EquipmentLoanStatus;
}
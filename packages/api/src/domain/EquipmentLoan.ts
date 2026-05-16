import { EquipmentLoanStatus } from '@alentapp/shared';

// EquipmentLoan tiene lógica de negocio propia relacionada al ciclo de vida
// de su estado: no cualquier transición está permitida, y cancelled_at
// se setea automáticamente al pasar a Canceled.
const ALLOWED_TRANSITIONS: Record<EquipmentLoanStatus, EquipmentLoanStatus[]> = {
    Loaned:   ['Returned', 'Damaged', 'Canceled'],
    Returned: ['Canceled'],
    Damaged:  ['Canceled'],
    Canceled: [], // estado final
};

export class EquipmentLoan {
    id:          string;
    item_name:   string;
    status:      EquipmentLoanStatus;
    loan_date:   string;
    due_date:    string;
    canceled_at: string | null;
    member_id:   string;

    constructor(data: {
        id: string;
        item_name: string;
        status: EquipmentLoanStatus;
        loan_date: string;
        due_date: string;
        canceled_at: string | null;
        member_id: string;
    }) {
        this.id          = data.id;
        this.item_name   = data.item_name;
        this.status      = data.status;
        this.loan_date   = data.loan_date;
        this.due_date    = data.due_date;
        this.canceled_at = data.canceled_at;
        this.member_id   = data.member_id;
    }

    // Cambia el estado del préstamo aplicando las reglas de negocio:
    // - valida que la transición esté permitida
    // - setea canceled_at automáticamente si el nuevo estado es Canceled
    // - si el estado ya es el solicitado, no hace nada (idempotente)
    transitionTo(newStatus: EquipmentLoanStatus): void {
        if (this.status === newStatus) return;

        const allowed = ALLOWED_TRANSITIONS[this.status];
        if (!allowed.includes(newStatus)) {
            throw new Error(
                `Transición de estado inválida: no se puede pasar de '${this.status}' a '${newStatus}'`
            );
        }

        if (newStatus === 'Canceled') {
            this.canceled_at = new Date().toISOString();
        }

        this.status = newStatus;
    }
}
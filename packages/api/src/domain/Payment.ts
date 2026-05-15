import { PaymentStatus } from '@alentapp/shared';

// A diferencia de Member, Payment tiene lógica de negocio propia relacionada
// al ciclo de vida de su estado: no cualquier transición está permitida, y algunos
// campos se setean automáticamente según el nuevo estado.
// Por eso cree una clase aparte donde esten esas reglas en el dominio
// en lugar de dispersarlas por los casos de uso.

// Qué transiciones están permitidas desde cada estado
const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
    Pending:  ['Paid', 'Canceled'],
    Paid:     ['Canceled'],
    Canceled: [], // estado final
};

export class Payment {
    id:           string;
    amount:       number;
    month:        number;
    year:         number;
    status:       PaymentStatus;
    due_date:     string;
    payment_date: string | null; // se setea sólo al pasar a Paid
    cancelled_at: string | null; // se setea automáticamente al pasar a Canceled
    member_id:    string;

    constructor(data: {
        id: string;
        amount: number;
        month: number;
        year: number;
        status: PaymentStatus;
        due_date: string;
        payment_date: string | null;
        cancelled_at: string | null;
        member_id: string;
    }) {
        this.id           = data.id;
        this.amount       = data.amount;
        this.month        = data.month;
        this.year         = data.year;
        this.status       = data.status;
        this.due_date     = data.due_date;
        this.payment_date = data.payment_date;
        this.cancelled_at = data.cancelled_at;
        this.member_id    = data.member_id;
    }

    // Cambia el estado del pago aplicando las reglas de negocio:
    // - valida que la transición esté permitida
    // - setea payment_date o cancelled_at automáticamente según corresponda
    // - si el estado ya es el solicitado, no hace nada
    transitionTo(newStatus: PaymentStatus): void {
        if (this.status === newStatus) return;

        const allowed = ALLOWED_TRANSITIONS[this.status];
        if (!allowed.includes(newStatus)) {
            throw new Error(
                `Transición de estado inválida: no se puede pasar de '${this.status}' a '${newStatus}'`
            );
        }

        if (newStatus === 'Paid') {
            this.payment_date = new Date().toISOString();
        }

        if (newStatus === 'Canceled') {
            this.cancelled_at = new Date().toISOString();
        }

        this.status = newStatus;
    }
}
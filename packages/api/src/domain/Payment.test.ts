// Payment.test.ts se ubica en src/domain/ junto a Payment.ts porque la entidad
// Payment tiene lógica de negocio propia (transitionTo) que pertenece al dominio.
// A diferencia de Member, que no tiene entidad de dominio, Payment encapsula
// las reglas de transición de estados y el seteo automático de fechas.
// Por eso sus tests unitarios viven aquí y no en src/application/.

import { describe, it, expect } from 'vitest';
import { Payment } from './Payment.js';

const basePaymentData = {
    id: 'aabbccdd-e89b-12d3-a456-426614174000',
    amount: 1500,
    month: 5,
    year: 2026,
    due_date: '2026-06-10',
    payment_date: null,
    cancelled_at: null,
    member_id: '123e4567-e89b-12d3-a456-426614174000',
};

describe('Payment', () => {

    //test unitario 10 - transitionTo Paid desde Pending
    it('10 - transitionTo Paid desde Pending debe cambiar status y setear payment_date', () => {
        const payment = new Payment({ ...basePaymentData, status: 'Pending' });

        payment.transitionTo('Paid');

        expect(payment.status).toBe('Paid');
        expect(payment.payment_date).not.toBeNull();
        expect(payment.cancelled_at).toBeNull();
    });

});
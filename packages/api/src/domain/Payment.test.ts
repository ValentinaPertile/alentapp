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

    //test unitario 11 - transitionTo Canceled desde Pending
    it('11 - transitionTo Canceled desde Pending debe cambiar status y setear cancelled_at', () => {
        const payment = new Payment({ ...basePaymentData, status: 'Pending' });

        payment.transitionTo('Canceled');

        expect(payment.status).toBe('Canceled');
        expect(payment.cancelled_at).not.toBeNull();
        expect(payment.payment_date).toBeNull();
    });

    //test unitario 12 - transitionTo Canceled desde Paid
    it('12 - transitionTo Canceled desde Paid debe cambiar status y setear cancelled_at', () => {
        const payment = new Payment({ ...basePaymentData, status: 'Paid', payment_date: '2026-05-01T00:00:00.000Z' });

        payment.transitionTo('Canceled');

        expect(payment.status).toBe('Canceled');
        expect(payment.cancelled_at).not.toBeNull();
    });

    //test unitario 13 - transitionTo Pending desde Paid es inválida
    it('13 - transitionTo Pending desde Paid debe lanzar error de transición inválida', () => {
        const payment = new Payment({ ...basePaymentData, status: 'Paid', payment_date: '2026-05-01T00:00:00.000Z' });

        expect(() => payment.transitionTo('Pending')).toThrow('Transición de estado inválida');
    });

    //test unitario 14 - transitionTo desde Canceled es estado terminal
    it('14 - transitionTo desde Canceled debe lanzar error porque es estado terminal', () => {
        const payment = new Payment({ ...basePaymentData, status: 'Canceled', cancelled_at: '2026-05-01T00:00:00.000Z' });

        expect(() => payment.transitionTo('Pending')).toThrow('Transición de estado inválida');
        expect(() => payment.transitionTo('Paid')).toThrow('Transición de estado inválida');
    });

    //test unitario 15 - transitionTo mismo estado es idempotente
    it('15 - transitionTo al mismo estado debe ser idempotente y no lanzar error', () => {
        const payment = new Payment({ ...basePaymentData, status: 'Pending' });

        expect(() => payment.transitionTo('Pending')).not.toThrow();
        expect(payment.status).toBe('Pending');
    });
});
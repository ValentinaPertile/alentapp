// EquipmentLoan.test.ts se ubica en src/domain/ junto a EquipmentLoan.ts porque
// la entidad tiene lógica de negocio propia (transitionTo) que pertenece al dominio.
// Encapsula las reglas de transición de estados y el seteo automático de canceled_at.
import { describe, it, expect } from 'vitest';
import { EquipmentLoan } from './EquipmentLoan.js';

const baseEquipmentLoanData = {
    id: 'aabbccdd-e89b-12d3-a456-426614174000',
    item_name: 'Pelota',
    loan_date: '2026-05-01T00:00:00.000Z',
    due_date: '2026-05-15T00:00:00.000Z',
    canceled_at: null,
    member_id: '123e4567-e89b-12d3-a456-426614174000',
};

describe('EquipmentLoan', () => {

    // test unitario 1 - transitionTo Returned desde Loaned
    it('1 - transitionTo Returned desde Loaned debe cambiar status', () => {
        const loan = new EquipmentLoan({ ...baseEquipmentLoanData, status: 'Loaned' });
        loan.transitionTo('Returned');
        expect(loan.status).toBe('Returned');
        expect(loan.canceled_at).toBeNull();
    });

    // test unitario 2 - transitionTo Damaged desde Loaned
    it('2 - transitionTo Damaged desde Loaned debe cambiar status', () => {
        const loan = new EquipmentLoan({ ...baseEquipmentLoanData, status: 'Loaned' });
        loan.transitionTo('Damaged');
        expect(loan.status).toBe('Damaged');
        expect(loan.canceled_at).toBeNull();
    });

    // test unitario 3 - transitionTo Canceled desde Loaned setea canceled_at
    it('3 - transitionTo Canceled desde Loaned debe cambiar status y setear canceled_at', () => {
        const loan = new EquipmentLoan({ ...baseEquipmentLoanData, status: 'Loaned' });
        loan.transitionTo('Canceled');
        expect(loan.status).toBe('Canceled');
        expect(loan.canceled_at).not.toBeNull();
    });

    // test unitario 4 - transitionTo Canceled desde Returned setea canceled_at
    it('4 - transitionTo Canceled desde Returned debe cambiar status y setear canceled_at', () => {
        const loan = new EquipmentLoan({ ...baseEquipmentLoanData, status: 'Returned' });
        loan.transitionTo('Canceled');
        expect(loan.status).toBe('Canceled');
        expect(loan.canceled_at).not.toBeNull();
    });

    // test unitario 5 - transitionTo Canceled desde Damaged setea canceled_at
    it('5 - transitionTo Canceled desde Damaged debe cambiar status y setear canceled_at', () => {
        const loan = new EquipmentLoan({ ...baseEquipmentLoanData, status: 'Damaged' });
        loan.transitionTo('Canceled');
        expect(loan.status).toBe('Canceled');
        expect(loan.canceled_at).not.toBeNull();
    });

    // test unitario 6 - transitionTo desde Canceled es estado terminal
    it('6 - transitionTo desde Canceled debe lanzar error porque es estado terminal', () => {
        const loan = new EquipmentLoan({ ...baseEquipmentLoanData, status: 'Canceled', canceled_at: '2026-05-01T00:00:00.000Z' });
        expect(() => loan.transitionTo('Loaned')).toThrow('Transición de estado inválida');
        expect(() => loan.transitionTo('Returned')).toThrow('Transición de estado inválida');
        expect(() => loan.transitionTo('Damaged')).toThrow('Transición de estado inválida');
    });

    // test unitario 7 - transitionTo Loaned desde Returned es inválida
    it('7 - transitionTo Loaned desde Returned debe lanzar error de transición inválida', () => {
        const loan = new EquipmentLoan({ ...baseEquipmentLoanData, status: 'Returned' });
        expect(() => loan.transitionTo('Loaned')).toThrow('Transición de estado inválida');
    });

    // test unitario 8 - transitionTo Loaned desde Damaged es inválida
    it('8 - transitionTo Loaned desde Damaged debe lanzar error de transición inválida', () => {
        const loan = new EquipmentLoan({ ...baseEquipmentLoanData, status: 'Damaged' });
        expect(() => loan.transitionTo('Loaned')).toThrow('Transición de estado inválida');
    });

    // test unitario 9 - transitionTo mismo estado es idempotente
    it('9 - transitionTo al mismo estado debe ser idempotente y no lanzar error', () => {
        const loan = new EquipmentLoan({ ...baseEquipmentLoanData, status: 'Loaned' });
        expect(() => loan.transitionTo('Loaned')).not.toThrow();
        expect(loan.status).toBe('Loaned');
    });

    // test unitario 10 - canceled_at es null al crear con status Loaned
    it('10 - canceled_at debe ser null al crear un préstamo en estado Loaned', () => {
        const loan = new EquipmentLoan({ ...baseEquipmentLoanData, status: 'Loaned' });
        expect(loan.canceled_at).toBeNull();
    });

    // test unitario 11 - canceled_at se setea con timestamp al cancelar
    it('11 - canceled_at debe ser un timestamp ISO válido al cancelar', () => {
        const loan = new EquipmentLoan({ ...baseEquipmentLoanData, status: 'Loaned' });
        loan.transitionTo('Canceled');
        expect(loan.canceled_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    // test unitario 12 - los datos del préstamo se asignan correctamente
    it('12 - los datos del préstamo deben asignarse correctamente al construir la entidad', () => {
        const loan = new EquipmentLoan({ ...baseEquipmentLoanData, status: 'Loaned' });
        expect(loan.id).toBe(baseEquipmentLoanData.id);
        expect(loan.item_name).toBe('Pelota');
        expect(loan.member_id).toBe(baseEquipmentLoanData.member_id);
        expect(loan.loan_date).toBe(baseEquipmentLoanData.loan_date);
        expect(loan.due_date).toBe(baseEquipmentLoanData.due_date);
    });
});
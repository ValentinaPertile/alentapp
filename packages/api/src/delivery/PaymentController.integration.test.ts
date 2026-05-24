import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findAll() { return []; }
            async findById(id: string) {
                return id === '123e4567-e89b-12d3-a456-426614174000'
                    ? { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Juan Pérez', dni: '12345678', email: 'juan@test.com', birthdate: '1990-01-01', category: 'Pleno', status: 'Activo', created_at: '2026-01-01T00:00:00.000Z' }
                    : null;
            }
            async findByDni() { return null; }
            async create(data: any) { return { id: 'new-id', ...data, status: 'Activo' }; }
            async update(id: string, data: any) { return { id, ...data }; }
            async delete() { return; }
        }
    };
});

vi.mock('../infrastructure/PostgresPaymentRepository.js', () => {
    return {
        PostgresPaymentRepository: class {
            async findAll() { return []; }
            async findById(id: string) {
                return id === 'existing-payment-id'
                    ? { id: 'existing-payment-id', amount: 1500, month: 5, year: 2026, status: 'Pending', due_date: '2026-06-10', payment_date: null, cancelled_at: null, member_id: '123e4567-e89b-12d3-a456-426614174000' }
                    : null;
            }
            async findActiveByMemberMonthYear(memberId: string, month: number, year: number) {
                return memberId === 'duplicate-member-id' && month === 5 && year === 2026
                    ? { id: 'existing-payment-id', amount: 1500, month: 5, year: 2026, status: 'Pending', due_date: '2026-06-10', payment_date: null, cancelled_at: null, member_id: 'duplicate-member-id' }
                    : null;
            }
            async create(data: any) { return { id: 'new-payment-id', ...data, status: 'Pending', payment_date: null, cancelled_at: null }; }
            async update(id: string, data: any) { return { id, amount: 1500, month: 5, year: 2026, due_date: '2026-06-10', member_id: '123e4567-e89b-12d3-a456-426614174000', ...data }; }
        }
    };
});

vi.mock('../infrastructure/PostgresLockerRepository.js', () => {
    return {
        PostgresLockerRepository: class {
            async findAll() { return []; }
            async findById() { return null; }
            async findByNumber() { return null; }
            async create(data: any) { return { id: 'locker-id', ...data }; }
            async update(id: string, data: any) { return { id, ...data }; }
            async delete() { return; }
        }
    };
});

vi.mock('../infrastructure/PostgresEquipmentLoanRepository.js', () => {
    return {
        PostgresEquipmentLoanRepository: class {
            async findAll() { return []; }
            async findById() { return null; }
            async create(data: any) { return { id: 'loan-id', ...data }; }
            async update(id: string, data: any) { return { id, ...data }; }
            async delete() { return; }
        }
    };
});

describe('Payment API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/payments', () => {
        //test de integración 7 - crear pago persiste en DB
        it('7 - debe retornar 201 y crear el pago cuando los datos son válidos', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload: {
                    amount: 1500,
                    month: 5,
                    year: 2026,
                    member_id: '123e4567-e89b-12d3-a456-426614174000',
                },
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('Pending');
            expect(body.data.member_id).toBe('123e4567-e89b-12d3-a456-426614174000');
            expect(body.data.id).toBeDefined();
        });
    });
});
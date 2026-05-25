import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findAll() { return []; }
            async findById(id: string) {
                if (id === '123e4567-e89b-12d3-a456-426614174000') {
                    return { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Juan Pérez', dni: '12345678', email: 'juan@test.com', birthdate: '1990-01-01', category: 'Pleno', status: 'Activo', created_at: '2026-01-01T00:00:00.000Z' };
                }
                if (id === '999e4567-e89b-12d3-a456-426614174999') {
                    return { id: '999e4567-e89b-12d3-a456-426614174999', name: 'Socio Duplicado', dni: '99999999', email: 'dup@test.com', birthdate: '1990-01-01', category: 'Pleno', status: 'Activo', created_at: '2026-01-01T00:00:00.000Z' };
                }
                return null;
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
                return memberId === '999e4567-e89b-12d3-a456-426614174999' && month === 5 && year === 2026
                    ? { id: 'existing-payment-id', amount: 1500, month: 5, year: 2026, status: 'Pending', due_date: '2026-06-10', payment_date: null, cancelled_at: null, member_id: '999e4567-e89b-12d3-a456-426614174999' }
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

        //test de integración 8 - pago duplicado mismo socio mes año
        it('8 - debe retornar 409 si ya existe un pago activo para ese socio en ese período', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload: {
                    amount: 1500,
                    month: 5,
                    year: 2026,
                    member_id: '999e4567-e89b-12d3-a456-426614174999',
                },
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('Ya existe un pago activo');
        });
    });

    describe('PATCH /api/v1/payments/:id', () => {

        //test de integración 18 - Pending a Paid persiste payment_date
        it('18 - debe retornar 200 y el pago con payment_date seteado al pasar de Pending a Paid', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/payments/existing-payment-id',
                payload: { status: 'Paid' },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('Paid');
            expect(body.data.payment_date).not.toBeNull();
        });
    });
});
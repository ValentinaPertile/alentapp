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
                if (id === 'cadete-member-id') {
                    return { id: 'cadete-member-id', name: 'Pedro Cadete', dni: '87654321', email: 'pedro@test.com', birthdate: '2010-01-01', category: 'Cadete', status: 'Activo', created_at: '2026-01-01T00:00:00.000Z' };
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
            async findById() { return null; }
            async findActiveByMemberMonthYear() { return null; }
            async create(data: any) { return { id: 'new-payment-id', ...data, status: 'Pending', payment_date: null, cancelled_at: null }; }
            async update(id: string, data: any) { return { id, ...data }; }
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
            async findById(id: string) {
                return id === 'existing-loan-id'
                    ? { id: 'existing-loan-id', item_name: 'Pelota', status: 'Loaned', loan_date: '2026-05-01T00:00:00.000Z', due_date: '2026-05-15T00:00:00.000Z', canceled_at: null, member_id: '123e4567-e89b-12d3-a456-426614174000' }
                    : null;
            }
            async create(data: any) { return { id: 'new-loan-id', ...data, status: 'Loaned', canceled_at: null }; }
            async update(id: string, data: any) { return { id, item_name: 'Pelota', loan_date: '2026-05-01T00:00:00.000Z', due_date: '2026-05-15T00:00:00.000Z', member_id: '123e4567-e89b-12d3-a456-426614174000', ...data }; }
        }
    };
});

describe('EquipmentLoan API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/equipment-loans', () => {

        // test de integración 1 - crear préstamo con socio válido
        it('1 - debe retornar 201 y crear el préstamo cuando los datos son válidos', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload: {
                    item_name: 'Pelota',
                    loan_date: '2026-05-01T00:00:00.000Z',
                    due_date: '2026-05-15T00:00:00.000Z',
                    member_id: '123e4567-e89b-12d3-a456-426614174000',
                },
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('Loaned');
            expect(body.data.item_name).toBe('Pelota');
            expect(body.data.canceled_at).toBeNull();
            expect(body.data.id).toBeDefined();
        });

        // test de integración 2 - socio no existe retorna 404
        it('2 - debe retornar 404 si el socio no existe', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload: {
                    item_name: 'Pelota',
                    loan_date: '2026-05-01T00:00:00.000Z',
                    due_date: '2026-05-15T00:00:00.000Z',
                    member_id: '00000000-0000-0000-0000-000000000000',
                },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('no existe');
        });

        // test de integración 3 - socio Cadete retorna 403
        it('3 - debe retornar 403 si el socio es Cadete', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload: {
                    item_name: 'Pelota',
                    loan_date: '2026-05-01T00:00:00.000Z',
                    due_date: '2026-05-15T00:00:00.000Z',
                    member_id: 'cadete-member-id',
                },
            });

            expect(response.statusCode).toBe(403);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('Cadet');
        });
    });

    describe('PATCH /api/v1/equipment-loans/:id', () => {

        // test de integración 4 - actualizar a Returned
        it('4 - debe retornar 200 al actualizar status a Returned', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/equipment-loans/existing-loan-id',
                payload: { status: 'Returned' },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('Returned');
        });

        // test de integración 5 - borrado lógico via PATCH a Canceled
        it('5 - debe retornar 200 y setear canceled_at al pasar a Canceled via PATCH', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/equipment-loans/existing-loan-id',
                payload: { status: 'Canceled' },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('Canceled');
            expect(body.data.canceled_at).not.toBeNull();
        });

        // test de integración 6 - id inexistente retorna 404
        it('6 - debe retornar 404 si el id del préstamo no existe', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/equipment-loans/00000000-0000-0000-0000-000000000000',
                payload: { status: 'Returned' },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('no existe');
        });
    });
    describe('GET /api/v1/equipment-loans', () => {

        // test de integración 7 - listar préstamos retorna 200
        it('7 - debe retornar 200 y una lista de préstamos', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/equipment-loans',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(Array.isArray(body.data)).toBe(true);
        });
    });

    describe('DELETE /api/v1/equipment-loans/:id', () => {

        // test de integración 8 - borrado lógico via DELETE
        it('8 - debe retornar 200 y cancelar el préstamo via DELETE', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/equipment-loans/existing-loan-id',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('Canceled');
            expect(body.data.canceled_at).not.toBeNull();
        });

        // test de integración 9 - DELETE con id inexistente retorna 404
        it('9 - debe retornar 404 si el id del préstamo no existe en DELETE', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/equipment-loans/00000000-0000-0000-0000-000000000000',
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('no existe');
        });
    });

});
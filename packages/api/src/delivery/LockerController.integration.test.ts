import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateLockerRequest } from '@alentapp/shared';

const mockState = vi.hoisted(() => ({
    lockers: [] as any[],
}));

vi.mock('../infrastructure/PostgresLockerRepository.js', () => {
    return {
        PostgresLockerRepository: class {
            async findAll() {
                return mockState.lockers;
            }

            async findByNumber(number: number) {
                return mockState.lockers.find((locker) => locker.number === number) || null;
            }

            async findByNumberExcludingId(number: number, id: string) {
                return mockState.lockers.find(
                    (locker) => locker.number === number && locker.id !== id
                ) || null;
            }

            async findById(id: string) {
                return mockState.lockers.find((locker) => locker.id === id) || null;
            }

            async create(data: any) {
                const locker = {
                    id: `locker-${data.number}`,
                    number: data.number,
                    location: data.location,
                    status: 'Available',
                    member_id: null,
                    deleted_at: null,
                };

                mockState.lockers.push(locker);
                return locker;
            }

            async update(id: string, data: any) {
                const locker = {
                    id,
                    ...data,
                    deleted_at: null,
                };

                return locker;
            }

            async softDelete(id: string, deletedAt: Date) {
                return {
                    id,
                    number: 1,
                    location: 'Hall',
                    status: 'Canceled',
                    member_id: null,
                    deleted_at: deletedAt.toISOString(),
                };
            }
        },
    };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findAll() {
                return [];
            }

            async findById(id: string) {
                return { id, name: 'Socio Mock' };
            }

            async findByDni() {
                return null;
            }

            async create(data: any) {
                return { id: 'member-1', ...data };
            }

            async update(id: string, data: any) {
                return { id, ...data };
            }

            async delete() {
                return;
            }
        },
    };
});

vi.mock('../infrastructure/PostgresPaymentRepository.js', () => {
    return {
        PostgresPaymentRepository: class {
            async findAll() {
                return [];
            }

            async create(data: any) {
                return { id: 'payment-1', ...data };
            }

            async update(id: string, data: any) {
                return { id, ...data };
            }

            async delete() {
                return;
            }
        },
    };
});

vi.mock('../infrastructure/PostgresEquipmentLoanRepository.js', () => {
    return {
        PostgresEquipmentLoanRepository: class {
            async findAll() {
                return [];
            }

            async create(data: any) {
                return { id: 'loan-1', ...data };
            }

            async update(id: string, data: any) {
                return { id, ...data };
            }

            async delete() {
                return;
            }
        },
    };
});

describe('Locker API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        mockState.lockers = [];
    });

    describe('POST /api/v1/lockers', () => {
        it('debe retornar 201 y crear un casillero', async () => {
            const payload: CreateLockerRequest = {
                number: 30,
                location: 'Hall',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload,
            });

            expect(response.statusCode).toBe(201);

            const body = JSON.parse(response.payload);

            expect(body.data.id).toBe('locker-30');
            expect(body.data.number).toBe(30);
            expect(body.data.location).toBe('Hall');
            expect(body.data.status).toBe('Available');
            expect(body.data.member_id).toBeNull();
            expect(body.data.deleted_at).toBeNull();
        });
    });
        describe('GET /api/v1/lockers luego de crear', () => {
        it('debe incluir en el listado el casillero creado previamente', async () => {
            const payload: CreateLockerRequest = {
                number: 31,
                location: 'Hall',
            };

            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload,
            });

            expect(createResponse.statusCode).toBe(201);

            const getResponse = await app.inject({
                method: 'GET',
                url: '/api/v1/lockers',
            });

            expect(getResponse.statusCode).toBe(200);

            const body = JSON.parse(getResponse.payload);

            expect(body.data).toBeInstanceOf(Array);
            expect(body.data).toHaveLength(1);
            expect(body.data[0].id).toBe('locker-31');
            expect(body.data[0].number).toBe(31);
            expect(body.data[0].location).toBe('Hall');
            expect(body.data[0].status).toBe('Available');
            expect(body.data[0].member_id).toBeNull();
            expect(body.data[0].deleted_at).toBeNull();
        });
    });
});

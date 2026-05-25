import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { UpdateLockerRequest } from '@alentapp/shared';
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

            async findById(id: string) {
                return mockState.lockers.find((locker) => locker.id === id) || null;
            }

            async findByNumber(number: number) {
                return mockState.lockers.find((locker) => locker.number === number) || null;
            }

            async findByNumberExcludingId(number: number, id: string) {
                return mockState.lockers.find(
                    (locker) => locker.number === number && locker.id !== id
                ) || null;
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
                const index = mockState.lockers.findIndex((locker) => locker.id === id);
                const updatedLocker = {
                    ...mockState.lockers[index],
                    ...data,
                };
                mockState.lockers[index] = updatedLocker;
                return updatedLocker;
            }

            async softDelete(id: string, deletedAt: Date) {
                const index = mockState.lockers.findIndex((locker) => locker.id === id);
                const deletedLocker = {
                    ...mockState.lockers[index],
                    status: 'Canceled',
                    member_id: null,
                    deleted_at: deletedAt.toISOString(),
                };
                mockState.lockers[index] = deletedLocker;
                return deletedLocker;
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
                if (id === 'member-1') {
                    return { id: 'member-1', name: 'Socio Mock' };
                }
                return null;
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

describe('Locker API Integration Tests - Update', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        mockState.lockers = [
            {
                id: 'locker-1',
                number: 10,
                location: 'Hall',
                status: 'Available',
                member_id: null,
                deleted_at: null,
            },
        ];
    });

    describe('PUT /api/v1/lockers/:id', () => {
        it('debe actualizar los datos de un casillero', async () => {
            const payload: UpdateLockerRequest = {
                number: 10,
                location: 'Gimnasio',
                status: 'Available',
                member_id: null,
            };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/lockers/locker-1',
                payload,
            });

            expect(response.statusCode).toBe(200);

            const body = JSON.parse(response.payload);

            expect(body.data.id).toBe('locker-1');
            expect(body.data.number).toBe(10);
            expect(body.data.location).toBe('Gimnasio');
            expect(body.data.status).toBe('Available');
            expect(body.data.member_id).toBeNull();
            expect(body.data.deleted_at).toBeNull();
        });

        it('debe permitir asignar un socio existente al casillero', async () => {
            const payload: UpdateLockerRequest = {
                number: 10,
                location: 'Hall',
                status: 'Assigned',
                member_id: 'member-1',
            };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/lockers/locker-1',
                payload,
            });

            expect(response.statusCode).toBe(200);

            const body = JSON.parse(response.payload);

            expect(body.data.id).toBe('locker-1');
            expect(body.data.number).toBe(10);
            expect(body.data.location).toBe('Hall');
            expect(body.data.status).toBe('Assigned');
            expect(body.data.member_id).toBe('member-1');
            expect(body.data.deleted_at).toBeNull();
        });
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
            expect(body.data).toHaveLength(2);
            expect(body.data[1].id).toBe('locker-31');
            expect(body.data[1].number).toBe(31);
            expect(body.data[1].location).toBe('Hall');
            expect(body.data[1].status).toBe('Available');
            expect(body.data[1].member_id).toBeNull();
            expect(body.data[1].deleted_at).toBeNull();
        });
    });
});
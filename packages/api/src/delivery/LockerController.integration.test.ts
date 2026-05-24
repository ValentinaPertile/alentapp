import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

type LockerMock = {
    id: string;
    number: number;
    location: 'Hall' | 'Vestibulo' | 'Pasillo' | 'Gimnasio' | 'Administracion';
    status: 'Available' | 'Assigned' | 'Maintenance' | 'Canceled';
    member_id: string | null;
    deleted_at: string | null;
};

const mockState = vi.hoisted(() => ({
    lockers: [] as LockerMock[],
}));

vi.mock('../infrastructure/PostgresLockerRepository.js', () => {
    return {
        PostgresLockerRepository: class {
            async findAll() {
                return mockState.lockers;
            }

            async findById(id: string) {
                return mockState.lockers.find((locker: LockerMock) => locker.id === id) || null;
            }

            async findByNumber(number: number) {
                return mockState.lockers.find((locker: LockerMock) => locker.number === number) || null;
            }

            async findByNumberExcludingId(number: number, id: string) {
                return (
                    mockState.lockers.find(
                        (locker: LockerMock) =>
                            locker.number === number && locker.id !== id,
                    ) || null
                );
            }

            async create(data: any) {
                const locker: LockerMock = {
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
                const index = mockState.lockers.findIndex(
                    (locker: LockerMock) => locker.id === id,
                );

                const updatedLocker: LockerMock = {
                    ...mockState.lockers[index],
                    ...data,
                };

                mockState.lockers[index] = updatedLocker;

                return updatedLocker;
            }

            async softDelete(id: string, deletedAt: Date) {
                const index = mockState.lockers.findIndex(
                    (locker: LockerMock) => locker.id === id,
                );

                const deletedLocker: LockerMock = {
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

describe('Locker API Integration Tests - Delete', () => {
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
                status: 'Assigned',
                member_id: 'member-1',
                deleted_at: null,
            },
        ];
    });

    describe('DELETE /api/v1/lockers/:id', () => {
        it('debe dar de baja lógicamente un casillero', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/locker-1',
            });

            expect(response.statusCode).toBe(200);

            const body = JSON.parse(response.payload);

            expect(body.data.id).toBe('locker-1');
            expect(body.data.number).toBe(10);
            expect(body.data.location).toBe('Hall');
            expect(body.data.status).toBe('Canceled');
            expect(body.data.member_id).toBeNull();
            expect(body.data.deleted_at).not.toBeNull();
        });

        it('debe seguir mostrando el casillero en el listado luego de la baja lógica', async () => {
            const deleteResponse = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/locker-1',
            });

            expect(deleteResponse.statusCode).toBe(200);

            const getResponse = await app.inject({
                method: 'GET',
                url: '/api/v1/lockers',
            });

            expect(getResponse.statusCode).toBe(200);

            const body = JSON.parse(getResponse.payload);

            expect(body.data).toBeInstanceOf(Array);
            expect(body.data).toHaveLength(1);

            expect(body.data[0].id).toBe('locker-1');
            expect(body.data[0].status).toBe('Canceled');
            expect(body.data[0].member_id).toBeNull();
            expect(body.data[0].deleted_at).not.toBeNull();
        });
    });
});
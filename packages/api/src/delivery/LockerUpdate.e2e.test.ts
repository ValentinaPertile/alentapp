import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Locker Update API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdLockerId: string;

    const randomSuffix = Math.floor(Math.random() * 100000);
    const testLockerNumber = 800000 + randomSuffix;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });

        await prisma.$connect();

        await prisma.locker.deleteMany({
            where: { number: testLockerNumber },
        });
    });

    afterAll(async () => {
        if (createdLockerId) {
            await prisma.locker.deleteMany({
                where: { id: createdLockerId },
            });
        }

        await prisma.$disconnect();
        await app.close();
    });

    it('debe actualizar un casillero en la base de datos real', async () => {
        const createResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/lockers',
            payload: {
                number: testLockerNumber,
                location: 'Hall',
            },
        });

        expect(createResponse.statusCode).toBe(201);

        const createBody = JSON.parse(createResponse.payload);
        createdLockerId = createBody.data.id;

        const updateResponse = await app.inject({
            method: 'PUT',
            url: `/api/v1/lockers/${createdLockerId}`,
            payload: {
                number: testLockerNumber,
                location: 'Gimnasio',
                status: 'Maintenance',
                member_id: null,
            },
        });

        expect(updateResponse.statusCode).toBe(200);

        const updateBody = JSON.parse(updateResponse.payload);

        expect(updateBody.data.id).toBe(createdLockerId);
        expect(updateBody.data.number).toBe(testLockerNumber);
        expect(updateBody.data.location).toBe('Gimnasio');
        expect(updateBody.data.status).toBe('Maintenance');
        expect(updateBody.data.member_id).toBeNull();
        expect(updateBody.data.deleted_at).toBeNull();

        const dbLocker = await prisma.locker.findUnique({
            where: { id: createdLockerId },
        });

        expect(dbLocker).not.toBeNull();
        expect(dbLocker?.number).toBe(testLockerNumber);
        expect(dbLocker?.location).toBe('Gimnasio');
        expect(dbLocker?.status).toBe('Maintenance');
        expect(dbLocker?.member_id).toBeNull();
        expect(dbLocker?.deleted_at).toBeNull();
    });
});
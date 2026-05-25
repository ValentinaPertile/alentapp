import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Locker API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdLockerId: string;

    const randomSuffix = Math.floor(Math.random() * 100000);
    const testLockerNumber = 900000 + randomSuffix;

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

    it('debe crear un casillero en la base de datos real y mostrarlo en el listado', async () => {
        const payload = {
            number: testLockerNumber,
            location: 'Hall',
        };

        const createResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/lockers',
            payload,
        });

        expect(createResponse.statusCode).toBe(201);

        const createBody = JSON.parse(createResponse.payload);

        expect(createBody.data.id).toBeDefined();
        expect(createBody.data.number).toBe(testLockerNumber);
        expect(createBody.data.location).toBe('Hall');
        expect(createBody.data.status).toBe('Available');
        expect(createBody.data.member_id).toBeNull();
        expect(createBody.data.deleted_at).toBeNull();

        createdLockerId = createBody.data.id;

        const dbLocker = await prisma.locker.findUnique({
            where: { id: createdLockerId },
        });

        expect(dbLocker).not.toBeNull();
        expect(dbLocker?.number).toBe(testLockerNumber);
        expect(dbLocker?.location).toBe('Hall');
        expect(dbLocker?.status).toBe('Available');
        expect(dbLocker?.member_id).toBeNull();
        expect(dbLocker?.deleted_at).toBeNull();

        const getResponse = await app.inject({
            method: 'GET',
            url: '/api/v1/lockers',
        });

        expect(getResponse.statusCode).toBe(200);

        const getBody = JSON.parse(getResponse.payload);

        expect(Array.isArray(getBody.data)).toBe(true);

        const lockerInList = getBody.data.find(
            (locker: any) => locker.id === createdLockerId,
        );

        expect(lockerInList).toBeDefined();
        expect(lockerInList.number).toBe(testLockerNumber);
        expect(lockerInList.location).toBe('Hall');
        expect(lockerInList.status).toBe('Available');
    });
});
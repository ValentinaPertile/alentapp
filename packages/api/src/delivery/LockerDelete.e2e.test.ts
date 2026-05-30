import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Locker Delete API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdLockerId: string;

    const randomSuffix = Math.floor(Math.random() * 100000);
    const testLockerNumber = 700000 + randomSuffix;

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

    it('debe dar de baja un casillero sin eliminarlo físicamente de la base de datos', async () => {
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

        const deleteResponse = await app.inject({
            method: 'DELETE',
            url: `/api/v1/lockers/${createdLockerId}`,
        });

        expect(deleteResponse.statusCode).toBe(200);

        const deleteBody = JSON.parse(deleteResponse.payload);

        expect(deleteBody.data.id).toBe(createdLockerId);
        expect(deleteBody.data.status).toBe('Canceled');
        expect(deleteBody.data.member_id).toBeNull();
        expect(deleteBody.data.deleted_at).not.toBeNull();

        const dbLocker = await prisma.locker.findUnique({
            where: { id: createdLockerId },
        });

        expect(dbLocker).not.toBeNull();
        expect(dbLocker?.id).toBe(createdLockerId);
        expect(dbLocker?.number).toBe(testLockerNumber);
        expect(dbLocker?.status).toBe('Canceled');
        expect(dbLocker?.member_id).toBeNull();
        expect(dbLocker?.deleted_at).not.toBeNull();

        const getResponse = await app.inject({
            method: 'GET',
            url: '/api/v1/lockers',
        });

        expect(getResponse.statusCode).toBe(200);

        const getBody = JSON.parse(getResponse.payload);

        const lockerInList = getBody.data.find(
            (locker: any) => locker.id === createdLockerId,
        );

        expect(lockerInList).toBeDefined();
        expect(lockerInList.status).toBe('Canceled');
        expect(lockerInList.member_id).toBeNull();
        expect(lockerInList.deleted_at).not.toBeNull();
    });
});
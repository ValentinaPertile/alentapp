import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Payment API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdMemberId: string;
    let createdPaymentId: string;

    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testDni = `PE2E${randomSuffix}`;
    const testEmail = `paymente2e${randomSuffix}@test.com`;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();

        const member = await prisma.member.create({
            data: {
                dni: testDni,
                name: 'Socio Payment E2E',
                email: testEmail,
                category: 'Pleno',
                status: 'Activo',
            },
        });

        createdMemberId = member.id;
    });

    afterAll(async () => {
        if (createdMemberId) {
            await prisma.payment.deleteMany({
                where: { member_id: createdMemberId },
            });

            await prisma.member.deleteMany({
                where: { id: createdMemberId },
            });
        }

        await prisma.$disconnect();
        await app.close();
    });

    //test 9 - e2e POST: crea un pago en DB real y retorna 201 con estado Pending
    it('9. POST: Debe crear un pago en la base de datos real y retornar 201', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/payments',
            payload: {
                amount: 1500,
                month: 5,
                year: 2026,
                member_id: createdMemberId,
            },
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);

        expect(body.data.id).toBeDefined();
        expect(body.data.status).toBe('Pending');
        expect(body.data.member_id).toBe(createdMemberId);
        expect(body.data.cancelled_at).toBeNull();

        createdPaymentId = body.data.id;

        const dbPayment = await prisma.payment.findUnique({
            where: { id: createdPaymentId },
        });

        expect(dbPayment).not.toBeNull();
        expect(dbPayment?.status).toBe('Pending');
    });

    // test 21 - e2e DELETE: cancela el pago y lo marca como Canceled
    it('21. DELETE: Debe cancelar el pago lógicamente y retornar 200 con status Canceled', async () => {
        const createResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/payments',
            payload: {
                amount: 2000,
                month: 6,
                year: 2026,
                due_date: '2026-06-30',
                member_id: createdMemberId,
            },
        });

        const paymentId = JSON.parse(createResponse.payload).data.id;

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/payments/${paymentId}`,
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);

        expect(body.data.status).toBe('Canceled');
        expect(body.data.cancelled_at).not.toBeNull();

        const dbPayment = await prisma.payment.findUnique({
            where: { id: paymentId },
        });

        expect(dbPayment?.status).toBe('Canceled');
        expect(dbPayment?.cancelled_at).not.toBeNull();
    });

    // test 22 - e2e PATCH: actualiza el estado de un pago y persiste el cambio
    it('22. PATCH: Debe actualizar el estado de un pago y retornar 200', async () => {
        const createResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/payments',
            payload: {
                amount: 1800,
                month: 7,
                year: 2026,
                member_id: createdMemberId,
            },
        });

        const paymentId = JSON.parse(createResponse.payload).data.id;

        const response = await app.inject({
            method: 'PATCH',
            url: `/api/v1/payments/${paymentId}`,
            payload: {
                status: 'Paid',
            },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);

        expect(body.data.id).toBe(paymentId);
        expect(body.data.status).toBe('Paid');

        const dbPayment = await prisma.payment.findUnique({
            where: { id: paymentId },
        });

        expect(dbPayment).not.toBeNull();
        expect(dbPayment?.status).toBe('Paid');
    });
});
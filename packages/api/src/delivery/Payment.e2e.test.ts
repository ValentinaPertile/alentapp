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

        // Creamos un socio real para asociar los pagos
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
        // Limpiamos pagos y socio creados durante los tests
        if (createdPaymentId) {
            await prisma.payment.deleteMany({ where: { id: createdPaymentId } });
        }
        if (createdMemberId) {
            await prisma.member.deleteMany({ where: { id: createdMemberId } });
        }
        await prisma.$disconnect();
        await app.close();
    });

    //test e2e 9 - POST /api/v1/payments retorna 201
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

        // Verificación directa en PostgreSQL
        const dbPayment = await prisma.payment.findUnique({ where: { id: createdPaymentId } });
        expect(dbPayment).not.toBeNull();
        expect(dbPayment?.status).toBe('Pending');
    });

    //test e2e 21 - DELETE /api/v1/payments/:id retorna 200 Canceled
    it('21. DELETE: Debe cancelar el pago lógicamente y retornar 200 con status Canceled', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/payments/${createdPaymentId}`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.status).toBe('Canceled');
        expect(body.data.cancelled_at).not.toBeNull();

        // Verificación directa en PostgreSQL
        const dbPayment = await prisma.payment.findUnique({ where: { id: createdPaymentId } });
        expect(dbPayment?.status).toBe('Canceled');
        expect(dbPayment?.cancelled_at).not.toBeNull();
    })    
});
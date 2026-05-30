import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('EquipmentLoan API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdMemberId: string;
    let createdLoanId: string;

    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testDni = `EL2E${randomSuffix}`;
    const testEmail = `equiploane2e${randomSuffix}@test.com`;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();

        // Crear socio de prueba directamente en la BD
        const member = await prisma.member.create({
            data: {
                dni: testDni,
                name: 'Socio EquipmentLoan E2E',
                email: testEmail,
                category: 'Pleno',
                status: 'Activo',
            },
        });
        createdMemberId = member.id;
    });

    afterAll(async () => {
        if (createdMemberId) {
            await prisma.equipmentLoan.deleteMany({
                where: { member_id: createdMemberId },
            });
            await prisma.member.deleteMany({
                where: { id: createdMemberId },
            });
        }
        await prisma.$disconnect();
        await app.close();
    });

    // test e2e 1 - crear préstamo en BD real
    it('1. POST: Debe crear un préstamo en la base de datos real y retornar 201', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload: {
                item_name: 'Pelota E2E',
                loan_date: '2026-05-30T00:00:00.000Z',
                due_date: '2026-06-06T00:00:00.000Z',
                member_id: createdMemberId,
            },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.data.id).toBeDefined();
        expect(body.data.status).toBe('Loaned');
        expect(body.data.canceled_at).toBeNull();
        expect(body.data.member_id).toBe(createdMemberId);
        createdLoanId = body.data.id;

        // Verificar que existe en la BD real
        const dbLoan = await prisma.equipmentLoan.findUnique({
            where: { id: createdLoanId },
        });
        expect(dbLoan).not.toBeNull();
        expect(dbLoan?.status).toBe('Loaned');
    });

    // test e2e 2 - cancelar préstamo via DELETE (borrado lógico)
    it('2. DELETE: Debe cancelar el préstamo lógicamente y retornar 200 con status Canceled', async () => {
        // Crear un préstamo nuevo para cancelar
        const createResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload: {
                item_name: 'Raqueta E2E',
                loan_date: '2026-05-30T00:00:00.000Z',
                due_date: '2026-06-06T00:00:00.000Z',
                member_id: createdMemberId,
            },
        });
        const loanId = JSON.parse(createResponse.payload).data.id;

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/equipment-loans/${loanId}`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.status).toBe('Canceled');
        expect(body.data.canceled_at).not.toBeNull();

        // Verificar en la BD real
        const dbLoan = await prisma.equipmentLoan.findUnique({
            where: { id: loanId },
        });
        expect(dbLoan?.status).toBe('Canceled');
        expect(dbLoan?.canceled_at).not.toBeNull();
    });

    // test e2e 3 - cascade delete: al eliminar socio se eliminan sus préstamos
    it('3. CASCADE: Al eliminar un socio sus préstamos deben eliminarse automáticamente', async () => {
        // Crear socio temporal
        const tempMember = await prisma.member.create({
            data: {
                dni: `CASC${randomSuffix}`,
                name: 'Socio Cascade E2E',
                email: `cascade${randomSuffix}@test.com`,
                category: 'Pleno',
                status: 'Activo',
            },
        });

        // Crear préstamo para ese socio
        const createResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload: {
                item_name: 'Item Cascade',
                loan_date: '2026-05-30T00:00:00.000Z',
                due_date: '2026-06-06T00:00:00.000Z',
                member_id: tempMember.id,
            },
        });
        const loanId = JSON.parse(createResponse.payload).data.id;

        // Eliminar el socio
        await app.inject({
            method: 'DELETE',
            url: `/api/v1/socios/${tempMember.id}`,
        });

        // Verificar que el préstamo también se eliminó
        const dbLoan = await prisma.equipmentLoan.findUnique({
            where: { id: loanId },
        });
        expect(dbLoan).toBeNull();
    });
    // test e2e 4 - socio Cadete no puede pedir préstamo en BD real
    it('4. POST: Socio Cadete debe retornar 403 en BD real', async () => {
        const cadeteMember = await prisma.member.create({
            data: {
                dni: `CAD${randomSuffix}`,
                name: 'Socio Cadete E2E',
                email: `cadete${randomSuffix}@test.com`,
                category: 'Cadete',
                status: 'Activo',
            },
        });

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload: {
                item_name: 'Pelota',
                loan_date: '2026-05-30T00:00:00.000Z',
                due_date: '2026-06-06T00:00:00.000Z',
                member_id: cadeteMember.id,
            },
        });

        expect(response.statusCode).toBe(403);
        const body = JSON.parse(response.payload);
        expect(body.error).toContain('Cadet');

        // Limpiar
        await prisma.member.delete({ where: { id: cadeteMember.id } });
    });

    // test e2e 5 - PATCH actualiza correctamente en BD real
    it('5. PATCH: Debe actualizar el status a Returned en la BD real', async () => {
        const createResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload: {
                item_name: 'Casco E2E',
                loan_date: '2026-05-30T00:00:00.000Z',
                due_date: '2026-06-06T00:00:00.000Z',
                member_id: createdMemberId,
            },
        });
        const loanId = JSON.parse(createResponse.payload).data.id;

        const response = await app.inject({
            method: 'PATCH',
            url: `/api/v1/equipment-loans/${loanId}`,
            payload: { status: 'Returned' },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.status).toBe('Returned');

        // Verificar en la BD real
        const dbLoan = await prisma.equipmentLoan.findUnique({
            where: { id: loanId },
        });
        expect(dbLoan?.status).toBe('Returned');
    });
});
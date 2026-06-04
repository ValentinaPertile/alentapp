import './infrastructure/telemetry.js'; 
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PostgresMemberRepository } from './infrastructure/PostgresMemberRepository.js';
import { MemberValidator } from './domain/services/MemberValidator.js';
import { CreateMemberUseCase } from './application/NewMemberUseCase.js';
import { GetMembersUseCase } from './application/GetMembersUseCase.js';
import { UpdateMemberUseCase } from './application/UpdateMemberUseCase.js';
import { DeleteMemberUseCase } from './application/DeleteMemberUseCase.js';
import { MemberController } from './delivery/MemberController.js';
import { GetLockersUseCase } from './application/GetLockersUseCase.js';

import { PostgresPaymentRepository } from './infrastructure/PostgresPaymentRepository.js';
import { CreatePaymentUseCase } from './application/CreatePaymentUseCase.js';
import { UpdatePaymentUseCase } from './application/UpdatePaymentUseCase.js';
import { GetPaymentsUseCase } from './application/GetPaymentsUseCase.js';
import { PaymentController } from './delivery/PaymentController.js';
import { PostgresEquipmentLoanRepository } from './infrastructure/PostgresEquipmentLoanRepository.js';
import { CreateEquipmentLoanUseCase } from './application/CreateEquipmentLoanUseCase.js';
import { UpdateEquipmentLoanUseCase } from './application/UpdateEquipmentLoanUseCase.js';
import { EquipmentLoanController } from './delivery/EquipmentLoanController.js';
import { GetEquipmentLoansUseCase } from './application/GetEquipmentLoansUseCase.js';

import { PostgresLockerRepository } from './infrastructure/PostgresLockerRepository.js';
import { LockerValidator } from './domain/services/LockerValidator.js';
import { CreateLockerUseCase } from './application/CreateLockerUseCase.js';
import { UpdateLockerUseCase } from './application/UpdateLockerUseCase.js';
import { DeleteLockerUseCase } from './application/DeleteLockerUseCase.js';
import { LockerController } from './delivery/LockerController.js';

export function buildApp() {
    const server = Fastify({
        logger: {
            level: 'info',
            transport: process.env.NODE_ENV === 'development'
                ? {
                    target: 'pino-pretty',
                    options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
                }
                : undefined,
        },
    });

    server.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    // Member
    const memberRepo = new PostgresMemberRepository();
    const memberValidator = new MemberValidator(memberRepo);

    const createMemberUseCase = new CreateMemberUseCase(memberRepo, memberValidator);
    const getMembersUseCase = new GetMembersUseCase(memberRepo);
    const updateMemberUseCase = new UpdateMemberUseCase(memberRepo, memberValidator);
    const deleteMemberUseCase = new DeleteMemberUseCase(memberRepo);

    const memberController = new MemberController(
        createMemberUseCase,
        getMembersUseCase,
        updateMemberUseCase,
        deleteMemberUseCase
    );

    // Payment
    const paymentRepo = new PostgresPaymentRepository();

    const createPaymentUseCase = new CreatePaymentUseCase(paymentRepo, memberRepo);
    const updatePaymentUseCase = new UpdatePaymentUseCase(paymentRepo);
    const getPaymentsUseCase = new GetPaymentsUseCase(paymentRepo);

    const paymentController = new PaymentController(
        createPaymentUseCase,
        updatePaymentUseCase,
        getPaymentsUseCase,
    );

    // EquipmentLoan
    const equipmentLoanRepo = new PostgresEquipmentLoanRepository();

    const createEquipmentLoanUseCase = new CreateEquipmentLoanUseCase(equipmentLoanRepo, memberRepo);
    const updateEquipmentLoanUseCase = new UpdateEquipmentLoanUseCase(equipmentLoanRepo);
    const getEquipmentLoansUseCase = new GetEquipmentLoansUseCase(equipmentLoanRepo);

    const equipmentLoanController = new EquipmentLoanController(
        createEquipmentLoanUseCase,
        updateEquipmentLoanUseCase,
        getEquipmentLoansUseCase,
    );

    // Locker
    const lockerRepo = new PostgresLockerRepository();
    const lockerValidator = new LockerValidator(lockerRepo, memberRepo);

    const createLockerUseCase = new CreateLockerUseCase(lockerRepo, lockerValidator);
    const updateLockerUseCase = new UpdateLockerUseCase(lockerRepo, lockerValidator);
    const deleteLockerUseCase = new DeleteLockerUseCase(lockerRepo);
    const getLockersUseCase = new GetLockersUseCase(lockerRepo);

    const lockerController = new LockerController(
        createLockerUseCase,
        updateLockerUseCase,
        deleteLockerUseCase,
        getLockersUseCase
    );

    // Member routes
    server.get('/api/v1/socios', memberController.getAll.bind(memberController));
    server.post('/api/v1/socios', memberController.create.bind(memberController));
    server.put('/api/v1/socios/:id', memberController.update.bind(memberController));
    server.delete('/api/v1/socios/:id', memberController.delete.bind(memberController));

    // Payment routes
    server.get('/api/v1/payments', paymentController.getAll.bind(paymentController));
    server.post('/api/v1/payments', paymentController.create.bind(paymentController));
    server.patch('/api/v1/payments/:id', paymentController.update.bind(paymentController));
    server.delete('/api/v1/payments/:id', paymentController.delete.bind(paymentController));


    // EquipmentLoan routes
    server.get('/api/v1/equipment-loans', equipmentLoanController.getAll.bind(equipmentLoanController));
    server.post('/api/v1/equipment-loans', equipmentLoanController.create.bind(equipmentLoanController));
    server.patch('/api/v1/equipment-loans/:id', equipmentLoanController.update.bind(equipmentLoanController));
    server.delete('/api/v1/equipment-loans/:id', equipmentLoanController.delete.bind(equipmentLoanController));

    // Locker routes
    server.get('/api/v1/lockers', lockerController.getAll.bind(lockerController));
    server.post('/api/v1/lockers', lockerController.create.bind(lockerController));
    server.put('/api/v1/lockers/:id', lockerController.update.bind(lockerController));
    server.delete('/api/v1/lockers/:id', lockerController.delete.bind(lockerController));

    // Health check
    server.get('/', async (_req, rep) => {
        rep.status(200).send({ msg: 'asd' });
    });

    return server;
}

// Solo iniciar el servidor si el script se ejecuta directamente (no cuando es importado por vitest)
if (process.argv[1] && process.argv[1].endsWith('app.ts')) {
    const server = buildApp();
    const port = parseInt(process.env.PORT || '3000', 10);

    server.listen({ port, host: '0.0.0.0' }, () =>
        server.log.info(`API server running on http://localhost:${port}`)
    );

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, async () => {
            await server.close();
            process.exit(0);
        });
    });
}
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PostgresMemberRepository } from './infrastructure/PostgresMemberRepository.js';
import { MemberValidator } from './domain/services/MemberValidator.js';
import { CreateMemberUseCase } from './application/NewMemberUseCase.js';
import { GetMembersUseCase } from './application/GetMembersUseCase.js';
import { UpdateMemberUseCase } from './application/UpdateMemberUseCase.js';
import { DeleteMemberUseCase } from './application/DeleteMemberUseCase.js';
import { MemberController } from './delivery/MemberController.js';
import { PostgresPaymentRepository } from './infrastructure/PostgresPaymentRepository.js';
import { CreatePaymentUseCase } from './application/CreatePaymentUseCase.js';
import { UpdatePaymentUseCase } from './application/UpdatePaymentUseCase.js';
import { PaymentController } from './delivery/PaymentController.js';
import { PostgresEquipmentLoanRepository } from './infrastructure/PostgresEquipmentLoanRepository.js';
import { CreateEquipmentLoanUseCase } from './application/CreateEquipmentLoanUseCase.js';
import { UpdateEquipmentLoanUseCase } from './application/UpdateEquipmentLoanUseCase.js';
import { EquipmentLoanController } from './delivery/EquipmentLoanController.js';

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
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

    server.get('/api/v1/socios', memberController.getAll.bind(memberController));
    server.post('/api/v1/socios', memberController.create.bind(memberController));
    server.put('/api/v1/socios/:id', memberController.update.bind(memberController));
    server.delete('/api/v1/socios/:id', memberController.delete.bind(memberController));
 
    //Payment
    const paymentRepo = new PostgresPaymentRepository();
    
    const createPaymentUseCase = new CreatePaymentUseCase(paymentRepo, memberRepo);
    const updatePaymentUseCase = new UpdatePaymentUseCase(paymentRepo);

    const paymentController = new PaymentController(
        createPaymentUseCase,
        updatePaymentUseCase,
    );

    server.post('/api/v1/payments', paymentController.create.bind(paymentController));
    server.patch('/api/v1/payments/:id', paymentController.update.bind(paymentController));
    server.delete('/api/v1/payments/:id', paymentController.delete.bind(paymentController));
    //EquipmentLoan
    const equipmentLoanRepo = new PostgresEquipmentLoanRepository();

    const createEquipmentLoanUseCase = new CreateEquipmentLoanUseCase(equipmentLoanRepo, memberRepo);
    const updateEquipmentLoanUseCase = new UpdateEquipmentLoanUseCase(equipmentLoanRepo);
    const equipmentLoanController = new EquipmentLoanController(
        createEquipmentLoanUseCase,
        updateEquipmentLoanUseCase,
    );
    server.post('/api/v1/equipment-loans', equipmentLoanController.create.bind(equipmentLoanController));
    server.patch('/api/v1/equipment-loans/:id', equipmentLoanController.update.bind(equipmentLoanController));
    server.delete('/api/v1/equipment-loans/:id', equipmentLoanController.delete.bind(equipmentLoanController));

    //Health check
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
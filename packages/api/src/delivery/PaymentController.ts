import { FastifyRequest, FastifyReply } from 'fastify';
import { CreatePaymentUseCase } from '../application/CreatePaymentUseCase.js';
import { UpdatePaymentUseCase } from '../application/UpdatePaymentUseCase.js';
import { GetPaymentsUseCase } from '../application/GetPaymentsUseCase.js';
import { CreatePaymentRequest, UpdatePaymentRequest, PaymentStatus } from '@alentapp/shared';

//Aclara cuales son los estados posibles
const VALID_STATUSES: PaymentStatus[] = ['Pending', 'Paid', 'Canceled'];

export class PaymentController {
    constructor(
        private readonly createPaymentUseCase: CreatePaymentUseCase,
        private readonly updatePaymentUseCase: UpdatePaymentUseCase,
        private readonly getPaymentsUseCase: GetPaymentsUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const payments = await this.getPaymentsUseCase.execute();
            return reply.status(200).send({ data: payments });
        } catch (error: any) {
            console.error('PAYMENT_ERROR:', error.message, error.stack);
            return reply.status(500).send({ error: error.message });
        }
    }
    
    async create(
        request: FastifyRequest<{ Body: CreatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const payment = await this.createPaymentUseCase.execute(request.body);
            return reply.status(201).send({ data: payment });
        } catch (error: any) {
            if (error.message.includes('MEMBER_NOT_FOUND')) {
                return reply.status(404).send({ error: 'El socio no existe' });
            }
            if (error.message.includes('Ya existe un pago activo')) {
                return reply.status(409).send({ error: error.message });
            }
            if (
                error.message.includes('mayor a cero') ||
                error.message.includes('entre 2000 y 2100') ||
                error.message.includes('entre 1 y 12') ||
                error.message.includes('requerido') ||
                error.message.includes('número válido')
            ) {
                return reply.status(400).send({ error: error.message });
            }
            console.error('PAYMENT_ERROR:', error.message, error.stack); return reply.status(500).send({ error: error.message });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const { status } = request.body;

            // Validar que el status sea un valor permitido
            if (!status || !VALID_STATUSES.includes(status)) {
                return reply.status(400).send({
                    error: `El status debe ser uno de: ${VALID_STATUSES.join(', ')}`,
                });
            }

            const payment = await this.updatePaymentUseCase.execute(id, status);
            return reply.status(200).send({ data: payment });
        } catch (error: any) {
            console.log(error);
            if (error.message.includes('no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('inválida')) {
                return reply.status(400).send({ error: error.message });
            }
            console.error('PAYMENT_ERROR:', error.message, error.stack); return reply.status(500).send({ error: error.message });
        }
    }

    // DELETE /api/v1/payments/:id — borrado lógico: internamente transiciona a Canceled
    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const payment = await this.updatePaymentUseCase.execute(id, 'Canceled');
            return reply.status(200).send({ data: payment });
        } catch (error: any) {
            if (error.message.includes('no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            console.error('PAYMENT_ERROR:', error.message, error.stack); return reply.status(500).send({ error: error.message });
        }
    }
}
import { FastifyRequest, FastifyReply } from 'fastify';
import { CreatePaymentUseCase } from '../application/CreatePaymentUseCase.js';
import { UpdatePaymentUseCase } from '../application/UpdatePaymentUseCase.js';
import { CreatePaymentRequest, UpdatePaymentRequest } from '@alentapp/shared';

export class PaymentController {
    constructor(
        private readonly createPaymentUseCase: CreatePaymentUseCase,
        private readonly updatePaymentUseCase: UpdatePaymentUseCase,
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const payment = await this.createPaymentUseCase.execute(request.body);
            return reply.status(201).send({ data: payment });
        } catch (error: any) {
            if (error.message.includes('Ya existe un pago activo')) {
                return reply.status(409).send({ error: error.message });
            }
            if (
                error.message.includes('no existe') ||
                error.message.includes('mayor a cero') ||
                error.message.includes('entre 1 y 12')
            ) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const payment = await this.updatePaymentUseCase.execute(id, request.body.status);
            return reply.status(200).send({ data: payment });
        } catch (error: any) {
            if (error.message.includes('no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('inválida')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
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
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
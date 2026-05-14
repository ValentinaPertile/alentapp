import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateLockerRequest, UpdateLockerRequest } from '@alentapp/shared';
import { CreateLockerUseCase } from '../application/CreateLockerUseCase.js';
import { UpdateLockerUseCase } from '../application/UpdateLockerUseCase.js';
import { DeleteLockerUseCase } from '../application/DeleteLockerUseCase.js';

export class LockerController {
    constructor(
        private readonly createLockerUseCase: CreateLockerUseCase,
        private readonly updateLockerUseCase: UpdateLockerUseCase,
        private readonly deleteLockerUseCase: DeleteLockerUseCase,
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreateLockerRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const locker = await this.createLockerUseCase.execute(request.body);
            return reply.status(201).send({ data: locker });
        } catch (error: any) {
            if (error.message.includes('ya está en uso')) {
                return reply.status(409).send({ error: error.message });
            }

            if (
                error.message.includes('requerido') ||
                error.message.includes('mayor a cero') ||
                error.message.includes('no es válida')
            ) {
                return reply.status(400).send({ error: error.message });
            }

            return reply.status(500).send({ error: 'Error interno del servidor' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateLockerRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const locker = await this.updateLockerUseCase.execute(id, request.body);
            return reply.status(200).send({ data: locker });
        } catch (error: any) {
            if (error.message.includes('no fue encontrado')) {
                return reply.status(404).send({ error: error.message });
            }

            if (
                error.message.includes('dado de baja') ||
                error.message.includes('ya está en uso')
            ) {
                return reply.status(409).send({ error: error.message });
            }

            if (
                error.message.includes('requerido') ||
                error.message.includes('mayor a cero') ||
                error.message.includes('no es válida') ||
                error.message.includes('no es válido') ||
                error.message.includes('Debe indicarse') ||
                error.message.includes('mantenimiento') ||
                error.message.includes('disponible')
            ) {
                return reply.status(400).send({ error: error.message });
            }

            return reply.status(500).send({ error: 'Error interno del servidor' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const locker = await this.deleteLockerUseCase.execute(id);
            return reply.status(200).send({ data: locker });
        } catch (error: any) {
            if (error.message.includes('no fue encontrado')) {
                return reply.status(404).send({ error: error.message });
            }

            if (error.message.includes('ya fue dado de baja')) {
                return reply.status(409).send({ error: error.message });
            }

            return reply.status(500).send({ error: 'Error interno del servidor' });
        }
    }
}
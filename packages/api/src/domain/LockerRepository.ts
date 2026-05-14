import { LockerDTO, CreateLockerRequest, UpdateLockerRequest } from '@alentapp/shared';

// Esta interfaz es el puerto de salida del dominio.
// La capa de aplicación usa esta interfaz sin depender directamente de Prisma.

export interface LockerRepository {
    create(data: CreateLockerRequest): Promise<LockerDTO>;

    findById(id: string): Promise<LockerDTO | null>;

    findByNumber(number: number): Promise<LockerDTO | null>;

    findByNumberExcludingId(number: number, id: string): Promise<LockerDTO | null>;

    update(id: string, data: UpdateLockerRequest): Promise<LockerDTO>;

    softDelete(id: string, deletedAt: Date): Promise<LockerDTO>;
}
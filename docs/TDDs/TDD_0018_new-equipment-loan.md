---
autor: Macarena Romero Olmo
fecha: 2026-05-01
titulo: Registro de Nuevo Préstamo de Equipamiento
---

# TDD-0018: Registro de Nuevo Préstamo de Equipamiento

## Contexto de Negocio (PRD)

### Objetivo

Permitir que un administrativo registre el préstamo de equipamiento a un socio, aplicando la restricción de que solo los socios con categoría "Senior" o "Lifetime" pueden solicitar material. Los socios "Cadet" tienen prohibido solicitar préstamos.

### User Persona

- **Nombre**: administrativo
- **Necesidad**: Registrar préstamos de material deportivo rápidamente, con la seguridad de que el sistema le avise si el socio no tiene permitido solicitar equipamiento según su categoría.

### Criterios de Aceptación

- El sistema debe validar que el socio solicitante tenga categoría "Senior" o "Lifetime".
- El sistema debe rechazar la solicitud si el socio es "Cadet".
- El sistema debe asociar el préstamo a un socio existente mediante `member_id`.
- Al finalizar, el sistema debe retornar el registro creado con su `id` generado y estado "Loaned".
- Si el socio no existe, el sistema debe retornar un error claro.
- Al crear el préstamo, el status inicial debe ser "Loaned".

## Diseño Técnico (RFC)

### Modelo de Datos

Se define la entidad `EquipmentLoan` con las siguientes propiedades:

- `id`: String, UUID, clave primaria autogenerada.
- `item_name`: String, nombre del equipamiento prestado.
- `status`: String, estado del préstamo (`Loaned`, `Returned`, `Damaged`), por defecto `Loaned`.
- `loan_date`: DateTime, fecha y hora del préstamo.
- `due_date`: DateTime, fecha y hora límite de devolución.
- `member_id`: String, UUID, clave foránea hacia `Member`.
- `canceled_at`: DateTime | null, fecha en que se canceló el préstamo. Se inicializa en `null`.

```prisma
enum EquipmentLoanStatus {
    Loaned
    Returned
    Damaged
}

model EquipmentLoan {
    id        String              @id @default(uuid())
    item_name String
    status    EquipmentLoanStatus @default(Loaned)
    loan_date DateTime
    due_date  DateTime
    member_id String
    member    Member              @relation(fields: [member_id], references: [id])

    @@map("equipment_loans")
}
```

### Contrato de API (@alentapp/shared)

- **Endpoint**: `POST /api/v1/equipment-loans`
- **Request Body**:

```ts
export interface CreateEquipmentLoanRequest {
    item_name: string;
    loan_date: string; // ISO DateTime string
    due_date: string;  // ISO DateTime string
    member_id: string; // UUID del socio
}
```

- **Response Body** (`EquipmentLoanDTO`):

```ts
export type EquipmentLoanStatus = 'Loaned' | 'Returned' | 'Damaged';

export interface EquipmentLoanDTO {
    id: string;
    item_name: string;
    status: EquipmentLoanStatus;
    loan_date: string;
    due_date: string;
    canceled_at: string | null;
    member_id: string;
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**: Entidad `EquipmentLoan`, interfaz `EquipmentLoanRepository`, regla de negocio que valida que el socio sea "Senior" o "Lifetime" (no "Cadet").
- **Application**: Caso de uso `CreateEquipmentLoan` que verifica existencia del socio, valida su categoría y persiste a través del repositorio.
- **Infrastructure**: `EquipmentLoanRepositoryPrisma`, `EquipmentLoanController` con ruta HTTP POST.

## Casos de Borde y Errores

| Escenario | Resultado Esperado | Código HTTP |
| --- | --- | --- |
| Socio con categoría "Cadet" | Mensaje: "Los socios Cadet no pueden solicitar equipamiento" | 403 Forbidden |
| `member_id` inexistente | Mensaje: "El socio no existe" | 404 Not Found |
| Campos obligatorios faltantes | Mensaje: "Faltan campos requeridos" | 400 Bad Request |
| Error de conexión a DB | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Agregar enum `EquipmentLoanStatus` y modelo `EquipmentLoan` al `schema.prisma` y correr migración.
2. Definir `EquipmentLoanDTO` y `CreateEquipmentLoanRequest` en `@alentapp/shared`.
3. Crear interfaz `EquipmentLoanRepository` en la capa de dominio.
4. Implementar caso de uso `CreateEquipmentLoan` con validación de categoría de socio.
5. Implementar `EquipmentLoanRepositoryPrisma` en infraestructura.
6. Crear `EquipmentLoanController` con la ruta `POST /api/v1/equipment-loans`.
EOF
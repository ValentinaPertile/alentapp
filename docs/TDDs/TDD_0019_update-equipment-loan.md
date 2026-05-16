---
autor: Macarena Romero Olmo
fecha: 2026-05-01
titulo: Update and Delete EquipmentLoan
---

# TDD-0019: Actualizar (y eliminar) EquipmentLoan

## Contexto de Negocio (PRD)

### Objetivo

Permitir 2 operaciones sobre un préstamo existente:
- Actualizar el `status` de un préstamo (de `Loaned` a `Returned`, de `Loaned` a `Damaged`, por mencionar algunas).
- Eliminar LÓGICAMENTE un préstamo, lo que equivale a pasar `status` a `Canceled`.
- No existe un endpoint DELETE separado; la eliminación lógica se realiza a través del mismo endpoint PATCH.

### User Persona

- **Nombre**: Administrativo
- **Necesidad**: Modificar el estado de un préstamo ya sea para registrar una devolución, reportar un daño, o cancelarlo.

### Criterios de Aceptación

- El sistema debe permitir actualizar el campo `status`.
- Los valores permitidos son: `Loaned`, `Returned`, `Damaged`, `Canceled`.
- El préstamo debe existir para poder actualizarlo.
- No se permite cambiar desde `Canceled` a otro estado.
- Si el préstamo ya está en el estado solicitado, la operación es idempotente: no genera cambios y retorna el préstamo sin modificaciones.
- Para eliminar lógicamente un préstamo, se debe enviar `status: "Canceled"` a través del endpoint PATCH.
- Cuando el `status` transiciona a `Canceled` vía PATCH, el sistema setea automáticamente `canceled_at` con el timestamp actual; el usuario no puede modificarlo.

## Diseño Técnico (RFC)

### Modelo de Datos

Se extiende el enum `EquipmentLoanStatus` de la entidad `EquipmentLoan` definida en TDD-0018:

- `status`: String, estado del préstamo (`Loaned`, `Returned`, `Damaged`, `Canceled`).
- `canceled_at`: DateTime | null, fecha en que se canceló el préstamo. Se setea automáticamente cuando el status pasa a `Canceled`.

### Contrato de API (@alentapp/shared)

- **Endpoint**: `PATCH /api/v1/equipment-loans/:id`
- **Request Body**:

```ts
{
    status: "Loaned" | "Returned" | "Damaged" | "Canceled";
}
```

- **Response**: `200 OK`
- **Response Body**:

```ts
{
    id: string;
    item_name: string;
    status: "Loaned" | "Returned" | "Damaged" | "Canceled";
    loan_date: string;
    due_date: string;
    canceled_at: string | null;
    member_id: string;
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**: Entidad `EquipmentLoan`. Método `transitionTo(newStatus: EquipmentLoanStatus): void` que encapsula las validaciones de transición de estado.
- **Application**: Caso de uso `UpdateEquipmentLoan`. Puerto de salida `EquipmentLoanRepository`.
- **Infrastructure**: `EquipmentLoanController` (PATCH). `EquipmentLoanRepositoryPrisma`.

## Casos de Borde y Errores

| Escenario | Resultado Esperado | Código HTTP |
| --- | --- | --- |
| `id` de préstamo inexistente | Error: préstamo no encontrado | 404 Not Found |
| `status` con valor inválido | Error: valor de status no permitido | 400 Bad Request |
| Intento de cambiar desde `Canceled` | Error: no se puede cambiar desde un estado terminal | 400 Bad Request |
| Préstamo ya en el estado solicitado | Sin cambios, retorna el préstamo sin modificaciones | 200 OK |
| Error de conexión a DB | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Extender enum `EquipmentLoanStatus` agregando el valor `Canceled` en `schema.prisma`.
2. Actualizar `EquipmentLoanDTO` en `@alentapp/shared` con el nuevo valor del enum.
3. Implementar método `transitionTo(newStatus)` en la entidad `EquipmentLoan` con validaciones de transición.
4. Implementar caso de uso `UpdateEquipmentLoan`.
5. Implementar método `update` en `EquipmentLoanRepositoryPrisma`.
6. Agregar ruta `PATCH /api/v1/equipment-loans/:id` en `EquipmentLoanController`.
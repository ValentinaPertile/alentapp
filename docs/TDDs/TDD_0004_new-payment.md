---
autor: Valentina Pértile de la Vega
fecha: 2026-05-01
titulo: New Payment
---

# TDD-0004: Crear Payment

## Contexto de Negocio (PRD)

### Objetivo
Permite registrar un nuevo pago asociado a un socio que tenga como estado inicial `Pending`.

### User Persona
 
- **Nombre**: Administrativo del club
- **Necesidad**: Registrar el pago de un socio indicando monto, mes, año y fecha de vencimiento.

### Criterios de Aceptación
 
- El sistema debe permitir crear un pago con los campos `amount`, `month`, `year`, `due_date`, `payment_date` (nullable) y `member_id`.
- El campo `status` se establece automáticamente como `Pending` al momento de la creación.
- El `member_id` debe corresponder a un socio existente.
- El `amount` debe ser mayor a cero.
- El `month` debe estar entre 1 y 12.
- El `year` debe ser un año válido (por ejemplo, entre 2000 y 2100).
- No se permite crear un pago duplicado: no puede existir ya un pago con el mismo `member_id`, `month` y `year` que no esté en estado `Canceled`.



## Diseño Técnico (RFC)
 
### Modelo de Datos
 
Entidad existente `PAYMENT`:
 
- `id`: uuid (PK)
- `amount`: float
- `month`: int
- `year`: int
- `status`: string — (Pending, Paid y Canceled)
- `due_date`: date
- `payment_date`: datetime (nullable)
- `cancelled_at`: datetime (nullable)
- `member_id`: uuid (FK → MEMBER)

### Contrato de API (@alentapp/shared)
 
- **Endpoint**: `POST /api/v1/payments`
- **Request Body**:
```ts
{
  amount: number;
  month: number;
  year: number;
  payment_date?: string | null;
  member_id: string;
  due_date?: string;
}
```

- **Response:** `201 Created`
- **Response Body**:
```ts
{
  id: string;
  amount: number;
  month: number;
  year: number;
  status: "Pending" | "Paid" | "Canceled";
  due_date: string;
  payment_date: string | null;
  cancelled_at: string | null;
  member_id: string;
}
```

### Componentes de Arquitectura Hexagonal
 
- **Domain**: Entidad `Payment`. Regla: `status` inicial es `Pending` y `cancelled_at` inicia en `null`.
- **Application**: 
  - Caso de uso `CreatePayment`.
  - Puerto de salida `PaymentRepository` (métodos `create` y `findByMemberMonthYear`).
- **Infrastructure**: `PaymentController` (POST). `PrismaPaymentRepository`.

## Casos de Borde y Errores
 
| Escenario | Resultado Esperado | Código HTTP |
|---|---|---|
| `member_id` inexistente | Error: socio no encontrado | 404 Not Found |
| `amount` negativo o cero | Error: tipo de dato inválido | 400 Bad Request |
| `amount` no es número (ejemplo, `"abc"`) | Error de validación: tipo de dato inválido | 400 Bad Request |
| `month` fuera de rango (< 1 o > 12) | Error de validación: mes inválido | 400 Bad Request |
| `year` fuera de rango razonable | Error de validación: año inválido | 400 Bad Request |
| Campos obligatorios ausentes (`amount`, `month`, `year`) | Error de validación: campo requerido faltante | 400 Bad Request |
| Pago duplicado (mismo `member_id`, `month` y `year`, en estado no `Canceled`) | Error de negocio: ya existe un pago activo para ese socio en ese período | 409 Conflict |
 | Usuario no provee `due_date`| El sistema calcula automáticamente `due_date` como día 10 del mes siguiente. Ejemplo: `month`=5, `year`=2026 → `due_date`="2026-06-10" | 201 Created |
 | `month`=12, `year`=2025 sin `due_date`| El sistema calcula correctamente el año siguiente: `due_date`="2026-01-10" | 201 Created |
 
## Plan de Implementación
 
### 1. Shared (`@alentapp/shared`)
- Definir DTO `CreatePaymentDto` con las validaciones de tipo y formato para cada campo.
- Definir el tipo de respuesta `PaymentResponseDto` incluyendo el campo `cancelled_at`.

### 2. Domain
- Verificar que la entidad `Payment` incluya el campo `cancelled_at: datetime | null`.
- Asegurar que el constructor de `Payment` setee `status = "Pending"` y `cancelled_at = null` por defecto.

### 3. Application — Caso de uso `CreatePayment`
- Recibir el comando con los datos del DTO.
- Validar que el `member_id` corresponde a un socio existente usando el puerto `MemberRepository.findById`. Si no existe, lanzar `MemberNotFoundException`.
- Validar mediante `PaymentRepository.findByMemberMonthYear` que no exista ya un pago activo (no `Canceled`) para ese socio en el mismo `month`/`year`. Si existe, lanzar `DuplicatePaymentException`.
- Calcular `due_date`
- Construir la entidad `Payment` con los datos validados, `status = "Pending"` y `cancelled_at = null`.
- Persistir usando `PaymentRepository.create`.
- Retornar el `Payment` creado.

### 4. Infrastructure — `PrismaPaymentRepository`
- Implementar el método `create(payment: Payment): Promise<Payment>` usando `prisma.payment.create`.
- Mapear correctamente el resultado de Prisma a la entidad de dominio.

### 5. Infrastructure — `PaymentController`
- Implementar el endpoint `POST /api/v1/payments`.
- Invocar el caso de uso `CreatePayment` con los datos del body.
- Retornar `201 Created` con el `PaymentResponseDto`.

 

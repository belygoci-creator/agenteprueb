# Modelo de datos

---

## Entidades principales

### auth.users (gestionada por Supabase Auth)
Tabla nativa de Supabase. Un único registro por ahora: el asesor. No se modifica directamente.

### asesores
Extensión de `auth.users` con datos propios de la app. Un solo registro en esta fase, pero
existe como tabla separada para no cerrar la puerta a soportar más de un asesor más adelante
(ver `architecture.md` → Estrategia de autenticación).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (FK → auth.users) | Identificador del asesor |
| nombre | text | Nombre del asesor |
| created_at | timestamptz | Fecha de alta |

### clientes
Un cliente final del asesor.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (PK) | Identificador del cliente |
| asesor_id | uuid (FK → asesores) | Asesor dueño de este cliente |
| nombre | text | Nombre del cliente |
| email | text (nullable) | Contacto opcional, no se usa para login |
| estado | text | `pendiente` \| `entrevista_completa` |
| created_at | timestamptz | Fecha de alta |

### entrevista_tokens
Enlace único de acceso a la entrevista, sin necesidad de cuenta (ver `architecture.md` →
Estrategia de autenticación).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (PK) | Identificador del token |
| cliente_id | uuid (FK → clientes) | Cliente al que pertenece el enlace |
| token | text (único) | Valor incluido en la URL `/entrevista/[token]` |
| expires_at | timestamptz | Vencimiento del enlace |
| used_at | timestamptz (nullable) | Momento en que se completó la entrevista; null mientras está pendiente |

### fichas
Las 6 variables recolectadas en la entrevista (ver `plantilla-entrevista.md` /
`instrucciones-sistema.md` §2). Una ficha por cliente; si se reentrevista, se versiona con
`created_at` en vez de sobreescribir (ver `prd.md` → SHOULD: historial).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (PK) | Identificador de la ficha |
| cliente_id | uuid (FK → clientes) | Cliente al que pertenece |
| edad | int | Perfil |
| dependientes | text | Perfil |
| situacion_laboral | text | Perfil |
| estabilidad_laboral | text | Perfil — determina el mínimo de fondo de emergencia (3 vs. 6 meses) |
| objetivo_descripcion | text | Objetivo |
| objetivo_monto | numeric | Objetivo |
| objetivo_moneda | text | `ARS` \| `USD` (u otra) — dispara conversión si difiere del flujo |
| objetivo_plazo_meses | int | Objetivo |
| objetivo_prioridad | text (nullable) | Objetivo, si hay más de una meta |
| ingresos_netos_mensuales | numeric | Ingresos y gastos |
| ingresos_estimado | boolean | Marca `(estimado)` |
| gastos_fijos_mensuales | numeric | Ingresos y gastos |
| gastos_estimado | boolean | Marca `(estimado)` |
| deuda_saldo | numeric (nullable) | Deudas |
| deuda_cuota_mensual | numeric (nullable) | Deudas |
| deuda_tasa_interes | numeric (nullable) | Deudas |
| deuda_estimado | boolean | Marca `(estimado)` |
| ahorro_actual_monto | numeric | Ahorro e inversión |
| ahorro_actual_liquidez | text (nullable) | Ahorro e inversión |
| ahorro_estimado | boolean | Marca `(estimado)` |
| fondo_emergencia_meses | numeric | Ahorro e inversión |
| perfil_riesgo_declarado | text | `conservador` \| `moderado` \| `dinamico` — nunca estimado ni texto libre (regla fija) |
| notas_cualitativas | text (nullable) | Motivación y contexto que no entra en el cálculo |
| created_at | timestamptz | Fecha de la entrevista |

### diagnosticos
Salida del bloque de diagnóstico (`instrucciones-sistema.md` §3) — solo descriptivo, nunca
recomienda nada.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (PK) | Identificador del diagnóstico |
| ficha_id | uuid (FK → fichas) | Ficha sobre la que se calculó |
| tasa_ahorro | numeric | (ingresos − gastos − cuota deuda) / ingresos |
| porcentaje_camino_recorrido | numeric | ahorro actual / monto objetivo |
| proyeccion_acumulada | numeric | Acumulado proyectado al plazo, sosteniendo la tasa actual |
| gap | numeric (nullable) | Proyección vs. objetivo; null si falta un dato bloqueante (ej. tipo de cambio no confirmado) |
| gap_pendiente_motivo | text (nullable) | Por qué el gap no se pudo calcular, si aplica |
| created_at | timestamptz | Fecha del cálculo |

### recomendaciones
Salida completa del motor de cálculo (`motor_calculo.py` según `reglas-recomendacion.md`) — el
registro técnico que audita el asesor.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid (PK) | Identificador de la recomendación |
| diagnostico_id | uuid (FK → diagnosticos) | Diagnóstico sobre el que se calculó |
| etapa_prioridad | text | `fondo_emergencia` \| `deuda_cara` \| `invertir` |
| fondo_emergencia_requerido_meses | numeric | Según estabilidad laboral (§1 de `reglas-recomendacion.md`) |
| tipo_cambio_usado | numeric (nullable) | Si el objetivo está en otra moneda |
| tipo_cambio_fecha | timestamptz (nullable) | Fecha de la búsqueda en vivo |
| tipo_cambio_fuente | text (nullable) | Fuente citada |
| aporte_necesario | numeric | gap / plazo restante |
| aporte_maximo_sostenible | numeric | Excedente − colchón − aporte pendiente a fondo de emergencia |
| diferencia | numeric | aporte_necesario − aporte_maximo_sostenible |
| viable | boolean | Si el aporte necesario ≤ el sostenible |
| distribucion_renta_fija | numeric | % recomendado |
| distribucion_liquidez | numeric | % recomendado |
| distribucion_renta_variable | numeric | % recomendado |
| alternativas | jsonb | Las 3 alternativas cuantificadas + la 4ª señalada sin cuantificar (§4) |
| supuestos | jsonb | Supuestos usados (ej. rendimiento asumido si se pidió el escenario opcional) |
| created_at | timestamptz | Fecha del cálculo |

---

## Relaciones entre entidades

```mermaid
erDiagram
  asesores ||--o{ clientes : "tiene"
  clientes ||--o{ entrevista_tokens : "tiene enlaces"
  clientes ||--o{ fichas : "completa"
  fichas ||--o{ diagnosticos : "genera"
  diagnosticos ||--o{ recomendaciones : "genera"
```

---

## Políticas de acceso (RLS)

### asesores
- SELECT / UPDATE: solo el propio asesor (`id = auth.uid()`).

### clientes
- SELECT / INSERT / UPDATE / DELETE: solo el asesor dueño (`asesor_id = auth.uid()`).

### entrevista_tokens
- Sin acceso directo desde el cliente autenticado con Supabase Auth (el cliente final no tiene
  cuenta). Las operaciones de lectura/validación de token y de escritura al completar la
  entrevista se hacen exclusivamente desde route handlers de servidor usando la
  `service_role key`, nunca expuesta al navegador.
- El asesor puede SELECT sobre los tokens de sus propios clientes (join contra `clientes.
  asesor_id`).

### fichas / diagnosticos / recomendaciones
- SELECT: el asesor dueño del cliente asociado (join hasta `clientes.asesor_id`).
- INSERT: exclusivamente desde route handlers de servidor (durante la entrevista o el cálculo),
  nunca directo desde el cliente.
- UPDATE / DELETE: deshabilitado salvo la edición manual de `fichas` por el asesor (ver
  `prd.md` → SHOULD), que se implementa como INSERT de una nueva versión, no como UPDATE
  destructivo — para no perder el registro auditable.

---

## Migraciones

| Fecha | Archivo | Descripción |
|-------|---------|-------------|
| 2026-08-15 | `supabase/migrations/0001_initial_schema.sql` | Creación de `asesores`, `clientes`, `entrevista_tokens`, `fichas`, `diagnosticos`, `recomendaciones` + políticas RLS + trigger de alta automática de asesor al crear usuario |
| 2026-08-18 | `supabase/migrations/0002_fix_crear_cliente_con_token_security.sql` | Fix: `crear_cliente_con_token` a `security definer` (RLS bloqueaba el insert en `entrevista_tokens`) |
| 2026-08-24 | `supabase/migrations/0003_generar_enlace_entrevista.sql` | Función `generar_enlace_entrevista` (`security definer`) para reentrevistar a un cliente existente |

---

## Datos seed

No se necesitan datos iniciales de catálogo (sin categorías ni roles configurables en esta
fase). El único seed manual es el registro del asesor en `asesores`, creado al primer login.

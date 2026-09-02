# Capa de vigilancia de mercado (alertas)

**Fecha:** 2026-08-26 18:00
**Tipo:** Migración

## Qué se hizo
Se añadió una migración con el esquema para una capa de vigilancia de mercado por encima de lo
existente, sin modificar ninguna tabla de `asesores`/`clientes`/`entrevista_tokens`/`fichas`/
`diagnosticos`/`recomendaciones`:

- `observaciones_mercado` — valor observado de una clase de activo en una fecha, `UNIQUE(clase, fecha)`.
- `reglas_alerta` — umbral de disparo en tanto por uno (`0.03` = 3 %), por clase y perfil de riesgo.
- `eventos_mercado` — disparo efectivo de una regla en una ventana `[desde, hasta]`, `UNIQUE(regla_id, hasta)`.
- `alertas` — instancia de un evento aplicada a un cliente, `UNIQUE(evento_id, cliente_id)`.
- `posiciones` — cartera del cliente valorada en euros.

RLS habilitado en las cinco tablas, con policy de `SELECT` únicamente (sin `INSERT`/`UPDATE`/
`DELETE`: la escritura queda para `service_role` desde servidor, mismo patrón que
`entrevista_tokens`). `observaciones_mercado`/`reglas_alerta`/`eventos_mercado` son datos globales,
legibles por cualquier registro en `asesores`; `alertas`/`posiciones` se filtran por
`clientes.asesor_id` como el resto de tablas de cliente.

Se sembraron 3 reglas de caída de renta variable a 5 días: conservador 3 %, moderado 4 %,
dinámico 6 %.

## Qué se modificó
- `supabase/migrations/0004_alertas_de_mercado.sql` (nuevo). Se usó `0004` y no `0002` porque
  `0002` y `0003` ya estaban ocupados por migraciones previas — mantener el orden numérico evita
  romper la secuencia de aplicación.
- `docs/data-model.md` — nueva fila en la tabla de "Migraciones".

**Migración escrita pero no aplicada.** Falta correrla contra un proyecto Supabase real
(`supabase db push` o equivalente) y decidir de dónde vienen los datos de
`observaciones_mercado` y quién dispara `eventos_mercado`/`alertas` — eso no estaba en el alcance
pedido.

## Por qué
Pedido explícito del usuario: una capa de vigilancia de mercado añadida encima del esquema
existente, sin tocar nada de lo ya construido.

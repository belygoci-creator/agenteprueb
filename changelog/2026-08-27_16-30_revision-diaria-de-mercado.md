# Script de revisión diaria de mercado

**Fecha:** 2026-08-27 16:30
**Tipo:** Feature

## Qué se hizo
Se creó `scripts/revision.ts`, la pieza que orquesta la capa de vigilancia de mercado end to
end:

1. Baja los cierres diarios del S&P 500 (`^GSPC`) de la API pública de Yahoo Finance (sin
   clave), últimos 3 meses.
2. Los guarda en `observaciones_mercado` (upsert por `clase, fecha` — corre varias veces el
   mismo día sin duplicar).
3. Lee `reglas_alerta`, `posiciones` y arma los `ClienteCandidato` (perfil de riesgo de la
   ficha más reciente de cada cliente, si tiene al menos un diagnóstico, y `clientes.suspendido`).
4. Por cada regla de clase `renta_variable`, usa `detectarEventos` y `clientesAfectados` de
   `src/lib/alertas` — sin reimplementar esa lógica.
5. Registra `eventos_mercado` (upsert por `regla_id, hasta`) y `alertas` (upsert por
   `evento_id, cliente_id`, ignorando duplicados — así una alerta ya revisada por el asesor no
   se resetea a "pendiente" en corridas siguientes, y no se reenvía el correo).
6. A los clientes con `avisar_cliente = true` y `alerta` nueva les manda un correo (Gmail SMTP
   vía `nodemailer`), construido con la nueva función pura `construirCorreoAlerta` — porcentaje
   de caída destacado visualmente y descargo legal siempre presente, nunca recomienda comprar
   ni vender.
7. Imprime un resumen en JSON por stdout (observaciones cargadas, reglas evaluadas/sin datos,
   eventos, alertas nuevas, correos enviados/fallidos, errores).

Se agregó `construirCorreoAlerta` (y el helper `formatearPorcentajeCaida`, reutilizado también
por `mensajeInterno`) a `src/lib/alertas/` como función pura — arma el HTML del correo, no
manda nada — con 3 tests nuevos. `pnpm test` sigue en verde (20/20). `tsc --noEmit` y `pnpm
lint` limpios.

**El script está escrito pero no se ejecutó contra Supabase/Yahoo Finance/Gmail reales** — falta
confirmar credenciales de Gmail y probar la corrida completa.

## Qué se modificó
- `scripts/revision.ts` (nuevo).
- `src/lib/alertas/correo-alerta.ts`, `correo-alerta.test.ts` (nuevos).
- `src/lib/alertas/mensaje-interno.ts` — nuevo helper `formatearPorcentajeCaida`, reutilizado.
- `src/lib/alertas/tipos.ts` — comentario de `ClienteCandidato` actualizado (`suspendido` ya
  tiene columna real).
- `src/lib/alertas/index.ts` — exporta `construirCorreoAlerta` y `formatearPorcentajeCaida`.
- `supabase/migrations/0005_alertas_avisar_cliente_y_suspendido.sql` (nuevo) — `clientes.
  avisar_cliente` y `clientes.suspendido`, ambos boolean default `false`, ALTER TABLE aditivo.
- `src/types/database.ts` — `clientes` incluye las 2 columnas nuevas.
- `package.json` / `pnpm-lock.yaml` — nuevas dependencias `nodemailer`, `dotenv`,
  `@types/nodemailer`, `tsx`; script `revision`.
- `.env.example` — `GMAIL_USER`, `GMAIL_APP_PASSWORD`.
- `docs/data-model.md` — columnas nuevas de `clientes`, fila de migración `0005`.
- `docs/architecture.md` — Yahoo Finance y Gmail SMTP en "Integraciones externas",
  `scripts/revision.ts` y `src/lib/alertas/` en "Estructura de carpetas".
- `README.md` — sección "Revisión diaria de mercado" con el comando `pnpm revision`.
- `mejoras/backlog.md` — 3 entradas nuevas: programar el script (cron), extender la vigilancia
  a otras clases de activo, UI en el dashboard para `avisar_cliente`/`suspendido`.

## Por qué
Pedido explícito del usuario: la pieza que une la capa de vigilancia de mercado (esquema +
lógica pura ya existentes) con datos reales y el aviso al cliente, sin montar infraestructura de
Next.js — solo el script.

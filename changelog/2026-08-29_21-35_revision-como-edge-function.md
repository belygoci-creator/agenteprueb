# Revisión diaria como Supabase Edge Function

**Fecha:** 2026-08-29 21:35
**Tipo:** Refactor

## Qué se hizo
`scripts/revision.ts` (script Node local) se convirtió en
`supabase/functions/revision-diaria/index.ts`, una Supabase Edge Function (Deno). Motivo: pg_cron
solo puede disparar una URL real, y no había ninguna app desplegada que expusiera esta lógica.

La función reutiliza `detectarEventos`, `clientesAfectados`, `construirCorreoAlerta` y
`construirCorreoInterno` de `src/lib/alertas` **por import relativo, sin reimplementar nada** —
Deno puede importar TypeScript directo por ruta relativa, sin bundler. Para que esos imports
funcionen en ambos runtimes (Next.js/Node y Deno) hubo que:
- Cambiar el único import con alias (`@/types/database` en `tipos.ts`) a uno relativo.
- Agregar la extensión `.ts` explícita a todos los imports relativos internos de
  `src/lib/alertas/*.ts` (Deno la exige, TypeScript/Next no la exigía pero ahora la acepta con
  `allowImportingTsExtensions: true` en `tsconfig.json`).

Se protege el endpoint con un secreto propio (`CRON_SECRET`) verificado a mano en la cabecera
`Authorization: Bearer <CRON_SECRET>` — no con JWT de Supabase Auth, porque quien la llama es
pg_cron, no un usuario logueado (`verify_jwt = false` para esta función en
`supabase/config.toml`).

**`scripts/revision.ts` se eliminó** (no se mantienen dos orquestaciones en paralelo) junto con
las dependencias que solo usaba (`dotenv`, `tsx`, `nodemailer` ya se había sacado antes).

`supabase/functions/**` se excluyó de `tsc`/`eslint` del proyecto principal (usa APIs de Deno —
`Deno.serve`, `Deno.env`, imports `npm:` — que ese tooling no entiende). No hay `deno` instalado
localmente para chequearla con su propio linter/typechecker; la primera verificación real va a
ser el propio `supabase functions deploy`.

**No se desplegó todavía** — esta sesión no tiene el MCP de Supabase conectado (ni Supabase CLI
instalado localmente); el despliegue se hace desde la sesión interactiva que sí lo tiene.

## Qué se modificó
- `supabase/functions/revision-diaria/index.ts` (nuevo).
- `supabase/config.toml` (nuevo) — `verify_jwt = false` para `revision-diaria`.
- `scripts/revision.ts` (eliminado), carpeta `scripts/` eliminada.
- `src/lib/alertas/tipos.ts` — import de `@/types/database` a relativo con extensión `.ts`.
- `src/lib/alertas/index.ts`, `detectar-eventos.ts`, `clientes-afectados.ts`, `mensaje-interno.ts`,
  `correo-alerta.ts`, `correo-interno.ts` — extensión `.ts` explícita en imports relativos internos.
- `tsconfig.json` — `allowImportingTsExtensions: true`; excluye `supabase/functions`.
- `eslint.config.mjs` — ignora `supabase/functions/**`.
- `package.json` / `pnpm-lock.yaml` — se removieron `dotenv` y `tsx`; se sacó el script `revision`.
- `.env.example` / `.env.local` — sección de la revisión diaria reescrita: aclara que son
  secrets de Supabase (`supabase secrets set`), no variables de `.env.local`; agrega
  `CRON_SECRET`.
- `docs/architecture.md` — Yahoo Finance/Composio actualizados para referenciar la Edge
  Function; nueva entrada "pg_cron / Supabase Edge Functions"; estructura de carpetas.
- `README.md` — reemplazada la sección `pnpm revision` por la de la Edge Function (con ejemplo
  de invocación vía `curl`).
- `mejoras/backlog.md` — MEJORA-02 reescrita: ya no es "programar el script", es "crear el
  `pg_cron` que dispare la función ya desplegada".

`pnpm test` 22/22, `tsc --noEmit` y `pnpm lint` limpios (ambos ahora excluyen
`supabase/functions/`, que no chequean).

## Por qué
Pedido explícito del usuario: pg_cron necesita una URL real para disparar la revisión diaria, y
convertir el script en una Edge Function de Supabase (en vez de desplegar toda la app Next.js
solo para exponer un endpoint) es la forma más directa de conseguir esa URL sin duplicar la
lógica de decisión ya escrita y probada en `src/lib/alertas`.

# MVP Fase 1 implementado

**Fecha:** 2026-08-15 16:30
**Tipo:** Feature

## Qué se hizo
Se implementó el flujo completo de la Fase 1 del roadmap: scaffold de Next.js, login del
asesor, alta de cliente con enlace de entrevista, entrevista conversacional vía API de Claude,
motor de cálculo migrado a Python (función serverless), integración de ambos, y vista de
detalle de cliente en el dashboard.

## Qué se modificó
- Scaffold completo de Next.js 14 (App Router, TypeScript, Tailwind) en la raíz del repo.
- `src/app/globals.css`, `src/app/layout.tsx` — paleta y tipografía de `docs/design-system.md`.
- `src/components/ui/` — Button, Input, Label, Card (estilo shadcn/ui, armados a mano por un
  problema de resolución de módulos del CLI de shadcn en este entorno).
- `src/lib/supabase/` (client, server, admin) + `src/middleware.ts` — sesión del asesor,
  protección de rutas.
- `src/types/database.ts` + `supabase/migrations/0001_initial_schema.sql` — esquema completo
  (asesores, clientes, entrevista_tokens, fichas, diagnosticos, recomendaciones) con RLS y la
  función `crear_cliente_con_token` (transacción atómica).
- `api/_motor_calculo.py` + `api/motor-calculo.py` — motor de cálculo migrado tal cual desde
  `motor_calculo.py`, envuelto como función serverless Python. `api/test_motor_calculo.py`
  valida paridad exacta con el caso real de Maribel (6/6 tests).
- `src/lib/claude/` (client, system-prompt, tools) — motor conversacional de la entrevista con
  tool use (`guardar_ficha`), condensando `instrucciones-sistema.md` y `plantilla-entrevista.md`.
- `src/lib/tipo-cambio.ts` — búsqueda en vivo del dólar blue (Bluelytics), nunca se estima.
- `src/lib/resumen-simple.ts` — traducción determinística a lenguaje simple (tabla de
  `instrucciones-sistema.md` §4), en vez de pedírselo a Claude en una segunda llamada.
- `src/lib/entrevista/procesar-cierre.ts` + `src/app/api/entrevista/route.ts` — orquesta
  Claude → motor de cálculo → persistencia de diagnóstico/recomendación.
- `src/app/login/`, `src/app/auth/callback/`, `src/app/(dashboard)/`, `src/app/entrevista/[token]/`
  — todas las pantallas de los flujos FLOW-01, FLOW-02 y FLOW-03 de `docs/user-flows.md`.
- `.claude/launch.json` (en el directorio padre) para levantar `pnpm dev` con el Browser tool.

## Por qué
Es la implementación de la Fase 1 (MVP) de `docs/roadmap.md`, migrando el flujo manual
existente (entrevista en chat + archivos Markdown) a la web app con dashboard definida en
`docs/architecture.md`.

## Pendiente para que funcione end-to-end
- Crear el proyecto real en Supabase, correr `supabase/migrations/0001_initial_schema.sql`, y
  completar `.env.local` con las credenciales reales (ver `.env.example`).
- Conseguir una `ANTHROPIC_API_KEY` y completarla en `.env.local`.
- Autenticar el MCP de Supabase (`/mcp` en una sesión interactiva) para poder operar el
  proyecto desde el editor.
- El endpoint `api/motor-calculo.py` (función serverless Python) solo se sirve en Vercel o con
  `vercel dev` — con `next dev` puro, esa ruta no responde todavía.

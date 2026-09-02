# Envío de correo vía Composio (reemplaza Gmail SMTP)

**Fecha:** 2026-08-28 12:40
**Tipo:** Refactor

## Qué se hizo
Se reemplazó el envío de correo de `scripts/revision.ts` (Gmail SMTP vía `nodemailer`, trabado
por la verificación en 2 pasos pendiente del usuario) por Composio: la cuenta de Gmail ya
conectada en Composio (`belygoci@gmail.com`, cuenta `gmail_second-hued`) ejecuta
`GMAIL_SEND_EMAIL` a través de `POST https://backend.composio.dev/api/v3.1/tools/execute/{tool_slug}`
(header `x-api-key`). El endpoint y el schema de argumentos (`recipient_email`, `subject`,
`body`, `is_html`) se confirmaron contra la documentación oficial de Composio y, de forma más
confiable, contra la metadata real de la conexión activa en esta sesión (`COMPOSIO_GET_TOOL_SCHEMAS`,
`COMPOSIO_MANAGE_CONNECTIONS`).

Yahoo Finance sigue siendo de solo lectura (API pública, no pasa por Composio) — el criterio del
usuario fue explícito: "Yahoo Finance informa; Supabase almacena; Composio actúa". Composio se
usa únicamente para la acción externa (mandar el correo), no para la consulta de mercado.

Se agregó que el asesor reciba aviso por cada alerta nueva (antes solo avisaba al cliente), vía
un correo interno de texto plano (nueva función pura `construirCorreoInterno`, reutiliza
`mensajeInterno`). Al cliente le sigue llegando el correo visual con descargo legal
(`construirCorreoAlerta`), condicionado a `avisar_cliente = true`.

**El `COMPOSIO_API_KEY` real no lo escribió el agente** — el usuario lo pegó una vez en el chat
por error; se le indicó que lo regenere en el panel de Composio y que lo agregue él mismo a
`.env.local` (mismo criterio aplicado antes con `GMAIL_APP_PASSWORD`). `COMPOSIO_GMAIL_ACCOUNT_ID`
sí se completó (no es secreto, es un identificador de conexión).

## Qué se modificó
- `scripts/revision.ts` — reemplazado el transporte de correo (nodemailer → Composio REST);
  agregado aviso al asesor (`ASESOR_EMAIL_PERMITIDO`) en cada alerta nueva.
- `src/lib/alertas/correo-interno.ts`, `correo-interno.test.ts` (nuevos).
- `src/lib/alertas/index.ts` — exporta `construirCorreoInterno`.
- `package.json` / `pnpm-lock.yaml` — se removieron `nodemailer` y `@types/nodemailer`.
- `.env.example` — `GMAIL_USER`/`GMAIL_APP_PASSWORD` reemplazadas por `COMPOSIO_API_KEY`/
  `COMPOSIO_GMAIL_ACCOUNT_ID`.
- `docs/architecture.md` — integración de Composio en "Integraciones externas" y en la
  estructura de `src/lib/alertas/`.
- `README.md` — sección "Revisión diaria de mercado" actualizada.

`pnpm test` 22/22, `tsc --noEmit` y `pnpm lint` limpios. **No se probó el envío real todavía**
(falta que el usuario agregue su `COMPOSIO_API_KEY` a `.env.local`).

## Por qué
El usuario definió el criterio de arquitectura explícitamente: Yahoo Finance informa (lectura
pública), Supabase almacena (base de datos), Composio actúa (única vía para la acción externa de
mandar el correo). Reemplaza el enfoque anterior (SMTP directo) que estaba bloqueado por un
requisito de la cuenta de Gmail del usuario (verificación en 2 pasos).

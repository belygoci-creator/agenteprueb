# Despliegue de revision-diaria y configuración de secrets

**Fecha:** 2026-08-31 18:46
**Tipo:** Configuración

## Qué se hizo
Se desplegó `supabase/functions/revision-diaria` al proyecto `asesor-financiero`
(`cjwnjnrlwcuvmizyhaoh`) vía el MCP de Supabase (`deploy_edge_function`), con
`verify_jwt = false` según `supabase/config.toml`. Es la primera versión publicada — hasta ahora
solo existía el código local (ver changelog 2026-08-29_21-35).

El bundler de la herramienta de deploy resuelve los imports relativos del código fuente
(`../../../src/lib/alertas/index.ts`, etc.) contra la ruta que se le da a cada archivo en el
payload, no contra la estructura real del repo — hubo que subir todos los archivos (entrypoint,
`src/lib/alertas/*.ts` y `src/types/database.ts`) preservando la misma profundidad de carpetas
que tienen en el repo (`supabase/functions/revision-diaria/index.ts`, `src/lib/alertas/...`,
`src/types/database.ts`) para que las rutas `../../../` y `../../` resolvieran igual.

Después se configuraron los cinco secrets que la función necesita: `CRON_SECRET`,
`COMPOSIO_API_KEY`, `COMPOSIO_GMAIL_ACCOUNT_ID`, `COMPOSIO_GMAIL_ENTITY_ID`,
`ASESOR_EMAIL_PERMITIDO`. `supabase login` (flujo por navegador) no persiste sesión en este
entorno — ni en el proceso del agente ni corrido a mano por el usuario con `!` — así que
`supabase secrets set` fallaba en silencio con `LegacyPlatformAuthRequiredError` sin que el
primer intento del usuario lo notara. Se resolvió generando un access token personal
(`supabase.com/dashboard/account/tokens`) y pasándolo como `SUPABASE_ACCESS_TOKEN` solo para el
comando puntual (nunca escrito a disco ni al repo). Verificado con `supabase secrets list` (los 5
nombres presentes) y con una invocación real de la función (`200 OK`, bajó cierres de Yahoo,
evaluó las 3 reglas, sin eventos ni correos disparados).

## Qué se modificó
- Ningún archivo del repo — el código desplegado es el mismo que ya estaba commiteado en
  `supabase/functions/revision-diaria/index.ts` y `src/lib/alertas/`.
- Secrets del proyecto de Supabase (fuera del repo, no versionados).

## Por qué
Pedido explícito del usuario: publicar la función para poder invocarla (a mano por ahora, luego
vía `pg_cron` — MEJORA-02 en `mejoras/backlog.md`, todavía pendiente) en vez de quedar solo como
código local sin desplegar.

## Actualización — redeploy 2026-08-31 (v3)
El usuario pidió redesplegar la misma función. El primer deploy había armado
`src/types/database.ts` a mano de forma resumida para el payload (el archivo lo consume `tipos.ts`
solo como `import type`, así que el bundler de Deno lo descarta igual — sin impacto en el bundle
final, mismo `ezbr_sha256`). En este redeploy se subió el archivo completo tal cual está en el
repo. Nueva versión activa: `3`.

## Actualización — redeploy 2026-08-31 (v4)
Segundo pedido de redeploy del usuario, con aviso explícito de que `src/lib/alertas/` había
cambiado después del deploy anterior (v3 quedó con código viejo). Se releyeron desde disco, en el
momento del pedido, los siete archivos de `src/lib/alertas/` antes de armar el payload —
`index.ts`, `detectar-eventos.ts`, `mensaje-interno.ts` y `correo-alerta.ts` habían cambiado de
verdad: la detección y los correos ahora manejan variación bidireccional (subida/caída, no solo
caída), con `direccionDe` y `formatearPorcentajeVariacion` reemplazando a
`formatearPorcentajeCaida`. `correo-interno.ts`, `clientes-afectados.ts`, `tipos.ts`, el
entrypoint y `database.ts` seguían iguales al deploy anterior. Confirmado por el `ezbr_sha256` del
bundle, distinto al de v3. Nueva versión activa: `4`.

**Aprendizaje para deploys futuros de esta función:** siempre releer los archivos de
`src/lib/alertas/` y el entrypoint desde disco justo antes de armar el payload — el MCP de deploy
no lee del repo, hay que pasarle el contenido explícitamente, y quedarse con contenido de una
lectura anterior en la conversación puede desplegar código desactualizado sin ningún error visible
(el deploy igual "funciona", solo que con el código viejo).

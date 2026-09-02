# Composio + Gmail funcionando de punta a punta

**Fecha:** 2026-08-29 21:05
**Tipo:** Fix

## Qué se hizo
Se terminó de configurar y **se probó con un envío real** el correo vía Composio que se había
dejado armado (pero sin probar) el día anterior. Se encontraron y resolvieron tres problemas,
en orden:

1. **La API key generada no tenía permiso `tool_execution`** (error 403
   `APIKey_InsufficientPermissions`). El panel de Composio no permite editar permisos de una
   clave existente, solo borrarla — hubo que generar una nueva eligiendo "Full access".
2. **La clave y la cuenta de Gmail estaban en proyectos distintos de Composio.** La cuenta
   `gmail_second-hued` que se veía en la sesión de Claude Code pertenece a una integración
   separada, no accesible por ninguna API key generada desde el dashboard — confirmado
   consultando `GET /api/v3/connected_accounts` con la key real (`items: []` en ambos proyectos
   probados, `finanza` y `belygoci_workspace_first_project`). Se resolvió conectando Gmail de
   cero, vía Auth Configs, dentro del mismo proyecto que la API key.
3. **Faltaba `entity_id` en el body del request** (error 400
   `ActionExecute_ConnectedAccountEntityIdRequired`, y luego 404
   `ActionExecute_ConnectedAccountNotFound` al probar con `entity_id: "default"` — no era el
   valor correcto). Se obtuvo el `id` (`ca_...`) y el `user_id` reales de la conexión activa
   consultando `GET /api/v3/connected_accounts` directamente, en vez de asumir un valor.

Con los tres resueltos, un envío de prueba directo a `GMAIL_SEND_EMAIL` devolvió `200 OK` y el
correo llegó de verdad a la bandeja de entrada (confirmado con el `display_url` de Gmail que
devolvió la respuesta).

**Nota de seguridad:** en un punto de esta sesión el usuario pegó su `COMPOSIO_API_KEY` real en
el chat. El agente no la usó ni la escribió en ningún archivo — se le pidió al usuario que la
regenere y que pegue la nueva él mismo en `.env.local`. Los identificadores no secretos
(`COMPOSIO_GMAIL_ACCOUNT_ID`, `COMPOSIO_GMAIL_ENTITY_ID`) sí los completó el agente, obtenidos de
una respuesta de la API, no de texto pegado por el usuario.

## Qué se modificó
- `scripts/revision.ts` — se agregó `entity_id` (env var `COMPOSIO_GMAIL_ENTITY_ID`) al body del
  request a Composio; `tieneConfigComposio()` ahora exige las tres variables.
- `.env.example` — documentado el requisito de permisos de la API key, la restricción de
  "mismo proyecto", y la nueva variable `COMPOSIO_GMAIL_ENTITY_ID` con cómo obtenerla.
- `docs/architecture.md` — ampliada la sección de Composio con estos gotchas.

`pnpm test` 22/22, `tsc --noEmit` y `pnpm lint` limpios (sin cambios en la lógica pura, solo en
el script y la config).

## Por qué
La integración con Composio se había dejado escrita el día anterior pero sin verificar
end-to-end; al intentar probarla aparecieron tres errores reales de configuración de Composio
que no eran evidentes desde la documentación pública y requirieron inspeccionar la API
directamente para resolverlos.

# Fix: dotenv ensuciaba el JSON de scripts/revision.ts

**Fecha:** 2026-08-28 11:50
**Tipo:** Fix

## Qué se hizo
Al correr `pnpm revision` por primera vez contra el proyecto real de Supabase, `dotenv`
imprimió un "tip" promocional propio por stdout antes del JSON del resumen (función legítima
del paquete oficial, no una dependencia comprometida — se verificó en
`node_modules/.pnpm/dotenv@17.4.2/node_modules/dotenv/lib/main.js`, array `TIPS`). Rompía el
contrato del script (paso 6: "imprima un resumen en JSON" por stdout, para poder parsearlo). Se
agregó `quiet: true` a la config de dotenv.

Se corrió el script contra el proyecto real (`asesor-financiero`): 65 observaciones del S&P 500
cargadas, 3 reglas evaluadas, 0 eventos (el mercado no cayó los umbrales configurados en los
últimos 3 meses), 0 alertas (tampoco hay clientes/posiciones cargados todavía).

## Qué se modificó
- `scripts/revision.ts` — `cargarEnv({ path: ".env.local", quiet: true })`.

## Por qué
El JSON de salida es el contrato del script con quien lo invoque (cron, otro proceso); una línea
de texto ajena antes del JSON lo rompe para cualquier consumidor que haga `JSON.parse(stdout)`.

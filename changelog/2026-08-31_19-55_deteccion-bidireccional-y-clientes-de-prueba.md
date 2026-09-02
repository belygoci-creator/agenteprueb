# Detección de subida además de caída + clientes de prueba + correo rediseñado

**Fecha:** 2026-08-31 19:55
**Tipo:** Feature

## Qué se hizo

1. **`detectarEventos` ahora dispara en subida o en caída**, no solo en caída. `regla.umbral`
   pasó a interpretarse como una magnitud de variación (`|variación| ≥ umbral`), no como un
   límite exclusivo hacia abajo. Las 3 reglas sembradas (conservador 3 %, moderado 4 %, dinámico
   6 %) no cambiaron de valor, pero ahora aplican en ambos sentidos.
2. Se agregó `direccionDe(evento)` y se renombró `formatearPorcentajeCaida` →
   `formatearPorcentajeVariacion` en `src/lib/alertas/mensaje-interno.ts`, ya que "caída" dejó de
   ser válido como nombre una vez que también cubre subidas. `mensajeInterno` ahora dice "subió"
   o "cayó" según corresponda.
3. **`construirCorreoAlerta` se rediseñó visualmente**: layout con tabla (más robusto entre
   clientes de correo que un `<div>` suelto), encabezado con marca, tarjeta de porcentaje
   destacado con color dinámico (verde si subió, rojo si cayó, con signo `+`/`−`), una sección de
   detalles (clase, perfil de riesgo, período observado) y el descargo legal, siempre presente,
   en el pie.
4. Se sembraron **9 clientes de prueba** en el proyecto real (3 por perfil de riesgo:
   conservador, moderado, dinámico), cada uno con ficha, diagnóstico y una posición en
   `renta_variable`, todos con `avisar_cliente = true` y `email = belygoci@gmail.com` (pedido
   explícito del usuario: usar siempre esa cuenta para las pruebas, no inventar destinatarios).
   El asesor dueño es el registro real `belygoci@gmail.com` en `asesores` (ya existía). El
   script de siembra fue un archivo temporal (`scripts/_tmp-seed-clientes-prueba.ts`), borrado
   después de correrlo — no queda como parte del repo.

Se actualizaron los tests de `detectar-eventos`, `mensaje-interno` y `correo-alerta` para cubrir
ambas direcciones. `pnpm test` 27/27 (antes 22), `tsc --noEmit` y `pnpm lint` limpios.

**Pendiente:** falta volver a desplegar `supabase/functions/revision-diaria` con este código
actualizado (el despliegue anterior tiene la versión solo-caída) y probar el envío real con los
9 clientes de prueba — se hace desde la sesión con el MCP de Supabase conectado.

## Qué se modificó
- `src/lib/alertas/detectar-eventos.ts` — condición de disparo bidireccional.
- `src/lib/alertas/mensaje-interno.ts` — `direccionDe`, `formatearPorcentajeVariacion`
  (renombrado), `mensajeInterno` con verbo dinámico.
- `src/lib/alertas/correo-alerta.ts` — rediseño completo del HTML.
- `src/lib/alertas/index.ts` — exports actualizados.
- `src/lib/alertas/detectar-eventos.test.ts`, `mensaje-interno.test.ts`, `correo-alerta.test.ts`
  — casos de subida agregados/actualizados.
- `docs/data-model.md` — `reglas_alerta.umbral` y `eventos_mercado.variacion` documentados como
  bidireccionales.
- 9 filas nuevas en `clientes` (+ `fichas`, `diagnosticos`, `posiciones`) en el proyecto real.

## Por qué
Pedido explícito del usuario: controlar tanto la subida como la bajada de la renta variable, y
tener clientes de prueba reales para validar el envío de correo con datos realistas antes de
programar el `pg_cron`.

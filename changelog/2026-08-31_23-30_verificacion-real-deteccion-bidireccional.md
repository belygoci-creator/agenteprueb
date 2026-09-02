# Verificación real: detección bidireccional + 18 correos vía Composio

**Fecha:** 2026-08-31 23:30
**Tipo:** Fix

## Qué se hizo
Cierra el pendiente del changelog anterior (`2026-08-31_19-55`). El primer redeploy de
`revision-diaria` con la lógica bidireccional (subida/caída) no tomó los cambios: al provocar una
suba del 7% en `observaciones_mercado` (vía SQL Editor) e invocar la función real, devolvía
`eventos_detectados: 0`. Se aisló la causa corriendo `detectarEventos` en local contra los mismos
datos reales de la base — ahí sí detectaba el evento en las 3 reglas — confirmando que el
problema era el despliegue (código desactualizado), no la lógica ni los datos.

Se pidió un redeploy explícito, indicando releer `src/lib/alertas/*.ts` desde disco antes de
armar el paquete. Con eso, la invocación real dio:

- `eventos_detectados: 3` (las 3 reglas sembradas, con la suba del 7%)
- `alertas_nuevas: 9` (los 3 clientes de prueba por perfil, correctamente matcheados)
- `correos_enviados: 18` (9 al cliente con el correo visual nuevo, 9 al asesor), `0` fallidos

Confirmado por el usuario: los 18 correos llegaron a `belygoci@gmail.com`.

## Qué se modificó
Ningún archivo del repo — el código ya estaba correcto desde el changelog anterior; esto fue
resolver un desfasaje entre el código local y lo desplegado.

## Por qué
Verificar de punta a punta antes de dar por cerrada la funcionalidad de detección bidireccional y
el correo rediseñado.

# Historial de recomendaciones y edición manual de fichas

**Fecha:** 2026-08-24 18:30
**Tipo:** Feature

## Qué se hizo
Últimos dos ítems de la Fase 2 del roadmap (Fase 2 queda completa):

1. **Reentrevistar / historial**: el asesor puede generar un nuevo enlace de entrevista para un
   cliente que ya completó una, sin perder lo anterior. Cada entrevista queda como una versión
   nueva (ficha + diagnóstico + recomendación); el dashboard muestra la más reciente arriba y el
   resto en una sección "Historial" expandible, con fecha y si esa corrida fue viable o no.
2. **Edición manual de fichas**: el asesor puede corregir un dato mal capturado sin reentrevistar
   desde cero. Guarda una ficha nueva (nunca sobreescribe la anterior) y recalcula diagnóstico y
   recomendación con el mismo motor que usa la entrevista.

## Qué se modificó
- `supabase/migrations/0003_generar_enlace_entrevista.sql` (nueva, aplicada) — función
  `security definer` para que el asesor pueda generar un token de entrevista sobre un cliente
  existente (RLS no permite INSERT directo en `entrevista_tokens`, a propósito).
- `src/types/database.ts` — tipo de la nueva función RPC.
- `src/lib/entrevista/procesar-cierre.ts` — se separó `calcularYGuardarDiagnostico` (ficha ya
  guardada → motor de cálculo → diagnóstico/recomendación) de `procesarCierreEntrevista`, para
  que la edición manual reuse exactamente la misma lógica de cálculo que la entrevista.
- `src/lib/clientes/editar-ficha.ts` (nuevo) — inserta la ficha corregida (verificando antes que
  el cliente sea del asesor logueado) y llama al cálculo compartido.
- `src/lib/clientes/obtener-cliente-completo.ts` — ahora trae el historial completo de fichas
  (antes solo la última), cada una con su diagnóstico y recomendación.
- `src/lib/clientes/reporte.ts` — adaptado a la nueva forma de datos (usa la entrada más
  reciente del historial para exportar a PDF/Word).
- `src/app/(dashboard)/dashboard/clientes/actions.ts` — `generarNuevoEnlace` y
  `guardarEdicionFicha`.
- `src/app/(dashboard)/dashboard/clientes/[id]/page.tsx` — muestra la situación actual + el
  historial expandible; botones "Reentrevistar" y "Editar ficha".
- `src/app/(dashboard)/dashboard/clientes/[id]/boton-reentrevistar.tsx` (nuevo) — genera el
  enlace y lo muestra inline, sin recargar la página.
- `src/app/(dashboard)/dashboard/clientes/[id]/editar/page.tsx` (nuevo) — formulario completo de
  edición, prellenado con la última ficha.

Probado con datos reales: reentrevistar generó un enlace nuevo sin romper la vista existente;
editar la ficha de TEST-Ana (ingresos $900.000 → $1.500.000) recalculó correctamente (tasa de
ahorro 38.9% → 63.3%, aporte máximo sostenible $297.500 → $807.500) y la versión anterior quedó
visible en el historial.

## Por qué
Eran los dos ítems restantes de la Fase 2 (`docs/roadmap.md`), ya definidos como SHOULD en
`docs/prd.md`. Con esto la Fase 2 queda completa.

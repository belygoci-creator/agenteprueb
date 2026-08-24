# Confirmación del resumen antes de cerrar la entrevista

**Fecha:** 2026-08-24 19:15
**Tipo:** Feature

## Qué se hizo
Antes de guardar la ficha, Claude ahora arma un resumen en lenguaje simple de todo lo
recolectado (objetivo, datos personales, ingresos, gastos, deuda, ahorro, fondo de emergencia,
perfil de riesgo) y le pregunta al cliente si está todo bien o quiere corregir algo. Solo llama
a `guardar_ficha` después de esa confirmación.

## Qué se modificó
- `src/lib/claude/system-prompt.ts` — nueva sección "Confirmación (antes de cerrar)" entre el
  bloque 5 de la entrevista y el cierre. Si el cliente pide corregir algo, Claude actualiza el
  dato y vuelve a confirmar antes de guardar.

Probado con una entrevista simulada completa: el resumen apareció correctamente antes del cierre,
con los 8 puntos clave, y la pregunta explícita de confirmación.

## Por qué
Cerraba la Fase 6 del checklist de construcción del usuario ("Confirmación y cierre — el cliente
revisa y confirma su ficha"), que hasta ahora solo mostraba el resultado al final sin un paso
explícito de revisión previo al guardado.

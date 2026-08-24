# Exportar ficha/diagnóstico/recomendación a PDF y Word

**Fecha:** 2026-08-24 18:00
**Tipo:** Feature

## Qué se hizo
Primer ítem de la Fase 2 del roadmap: el asesor puede exportar la ficha, diagnóstico y
recomendación técnica de un cliente (misma información que ve en el dashboard) como archivo
PDF o Word, para compartir o archivar fuera de la app.

## Qué se modificó
- `src/lib/clientes/obtener-cliente-completo.ts` (nuevo) — helper compartido que trae
  cliente + última ficha/diagnóstico/recomendación (antes vivía duplicado dentro de la página).
- `src/lib/clientes/reporte.ts` (nuevo) — arma las secciones del reporte a partir de esos datos,
  una sola fuente de verdad para pantalla, PDF y Word.
- `src/app/(dashboard)/dashboard/clientes/[id]/export/pdf/route.ts` (nuevo) — genera el PDF con
  `pdf-lib` (paginado y ajuste de línea manual).
- `src/app/(dashboard)/dashboard/clientes/[id]/export/docx/route.ts` (nuevo) — genera el Word
  con la librería `docx`.
- `src/app/(dashboard)/dashboard/clientes/[id]/page.tsx` — usa el helper compartido y agrega los
  botones "Exportar a PDF" / "Exportar a Word".
- `package.json` — dependencias `pdf-lib` y `docx`.

Probado con datos reales de un cliente de prueba (TEST-Ana): ambos endpoints responden 200 sin
errores, con caracteres especiales del español (tildes, ñ) y formato de moneda incluidos.

## Por qué
Era el primer punto elegido de la Fase 2 (`docs/roadmap.md`), ya definido como SHOULD en
`docs/prd.md`: el asesor necesita poder compartir o archivar la recomendación fuera de la app.

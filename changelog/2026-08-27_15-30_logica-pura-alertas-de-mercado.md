# Lógica pura de la capa de alertas de mercado

**Fecha:** 2026-08-27 15:30
**Tipo:** Feature

## Qué se hizo
Se implementó la lógica de negocio de la capa de vigilancia de mercado (esquema de
`0004_alertas_de_mercado.sql`) como funciones puras, sin red ni acceso a base de datos:

- `detectarEventos` — compara el último nivel observado de una clase contra el nivel al inicio
  de la ventana de la regla (`ventana_dias` observaciones más recientes) y devuelve un evento si
  la caída llega o supera el umbral.
- `clientesAfectados` — de los clientes con posición en la clase de la regla, excluye tres
  casos: cliente suspendido, cliente sin análisis (ficha) todavía, y cliente con perfil de
  riesgo distinto al de la regla.
- `mensajeInterno` — redacta la descripción del evento (clase, fechas, % de caída, umbral) sin
  mencionar compra ni venta, en línea con la regla de `reglas-recomendacion.md` §7 de no
  recomendar productos ni operaciones concretas.

Se agregó vitest al proyecto (`pnpm add -D vitest`) con 17 tests cubriendo las tres funciones,
incluidas las tres exclusiones de `clientesAfectados` por separado y el caso borde de
`detectarEventos` con menos observaciones que `ventana_dias`. `pnpm test` corre en verde.

## Qué se modificó
- `src/lib/alertas/tipos.ts` (nuevo) — tipos de las 5 tablas nuevas + `ClienteCandidato`.
- `src/lib/alertas/detectar-eventos.ts`, `clientes-afectados.ts`, `mensaje-interno.ts`,
  `index.ts` (nuevos).
- `src/lib/alertas/*.test.ts` (nuevos, 3 archivos).
- `src/types/database.ts` — se agregaron `observaciones_mercado`, `reglas_alerta`,
  `eventos_mercado`, `alertas`, `posiciones` al tipo `Database`, a partir de
  `0004_alertas_de_mercado.sql`.
- `vitest.config.mts` (nuevo) — alias `@` → `src` para que los tests resuelvan los imports igual
  que la app.
- `package.json` — scripts `test`, `test:watch`, `test:coverage` (los que ya documentaba
  `docs/testing.md`).
- `docs/data-model.md` — entidades `observaciones_mercado`, `reglas_alerta`, `eventos_mercado`,
  `alertas`, `posiciones`; relaciones en el diagrama; políticas RLS de las 5 tablas; seed de
  `reglas_alerta` en la sección "Datos seed".

## Por qué
`ClienteCandidato` (el tipo que usa `clientesAfectados` para decidir las exclusiones) no
corresponde a ninguna tabla real: `clientes` no tiene columna `suspendido`, y `perfil_riesgo`
vive en `fichas.perfil_riesgo_declarado`, no en `clientes`. Se documentó explícitamente en
`tipos.ts` en vez de inventar esas columnas en el esquema — falta decidir, si se adopta esta
función en un route handler, de dónde sale `suspendido` (columna nueva en `clientes`, o estado
derivado de otra parte) y cómo se arma el join con `fichas` para el perfil.

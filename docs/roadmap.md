# Roadmap

---

## Fase 1 — MVP

- [x] Modelo de datos en Supabase (`asesores`, `clientes`, `entrevista_tokens`, `fichas`,
      `diagnosticos`, `recomendaciones`) + políticas RLS, según `data-model.md`.
- [x] Login del asesor con Supabase Auth y dashboard base (listado de clientes con estado:
      pendiente / entrevista completa).
- [x] Alta de cliente desde el dashboard + generación de enlace único de entrevista
      (`entrevista_tokens`).
- [x] Entrevista conversacional al cliente final vía API de Claude, siguiendo el guion y las
      reglas de ambigüedad de `instrucciones-sistema.md` (una pregunta por turno, orden fijo,
      marcado `(estimado)`).
- [x] Guardado de la ficha del cliente al cerrar la entrevista (6 variables).
- [x] Motor de cálculo (`motor_calculo.py` migrado a función serverless) generando diagnóstico
      y recomendación 1:1 según `reglas-recomendacion.md`, incluida la conversión de moneda en
      vivo (USD/ARS blue) y el bloqueo de cálculo si falta un dato o falla la búsqueda del tipo
      de cambio.
- [x] Resumen en lenguaje simple mostrado al cliente al cierre de la entrevista (diagnóstico +
      recomendación + aclaración de que es una orientación automática revisada por el asesor).
- [x] Vista de detalle de cliente en el dashboard: ficha, diagnóstico y recomendación técnica
      completa (paridad con lo que hoy vive en `recomendacion-[nombre].md`).

**Estado:** código implementado y compilando (`pnpm build` limpio, tests del motor 6/6 en
paridad con el caso de Maribel). Falta conectar servicios reales para validar end-to-end: crear
el proyecto de Supabase, correr la migración, y cargar `ANTHROPIC_API_KEY` (ver changelog
2026-08-15_16-30).

**Objetivo de validación:** que el asesor pueda mandarle un enlace a un cliente real, que la
entrevista y el cálculo produzcan exactamente el mismo resultado que el flujo manual actual
(paridad funcional con `motor_calculo.py`, ver casos de Maribel/Anali como referencia), y que el
asesor pueda revisar todo desde el dashboard sin abrir un solo archivo suelto.

---

## Fase 2 — Mejora sobre validación

<!-- No planificar en detalle hasta terminar la Fase 1. Candidatos ya identificados en prd.md
     (SHOULD), a confirmar según el feedback real de usar el MVP. -->

- [x] Exportar ficha/diagnóstico/recomendación de un cliente a PDF o Word.
- [x] Historial de recomendaciones por cliente (versionar reentrevistas, no solo la última
      corrida).
- [x] Edición manual del asesor sobre la ficha de un cliente, sin tener que reentrevistar desde
      cero (como nueva versión, no como sobreescritura — ver `data-model.md`).

**Fase 2 completa.**

---

## Fase 3 — Escalado

<!-- Solo relevante si el producto valida su uso interno y se evalúa abrirlo más allá de un
     asesor. No planificar en detalle todavía. -->

- [ ] Notificación al asesor cuando un cliente completa la entrevista.
- [ ] Panel comparativo entre clientes (ej. cuántos tienen meta viable vs. no viable).
- [ ] Soporte multi-tenant (varios asesores, cada uno con su propio set de reglas) — solo si se
      decide en algún momento ofrecer el producto a otros asesores (ver Descartado).

---

## Descartado (con motivo)

| Funcionalidad | Motivo del descarte |
|---------------|---------------------|
| Multi-tenant / producto para varios asesores | Uso interno por ahora, un solo asesor con sus propias reglas (`business.md` → Restricciones). Podría revisitarse en Fase 3 si cambia el objetivo del proyecto. |
| Recomendación de productos o instrumentos concretos (fondos, brokers, tickers) | Regla fija de `reglas-recomendacion.md` §7: el motor recomienda clases de activo y niveles de riesgo, nunca productos específicos — no es una decisión de producto reversible, es una restricción del negocio. |
| Ejecución de operaciones financieras reales | Fuera del alcance del producto: es una herramienta de diagnóstico y orientación, no una plataforma de inversión. |
| Migrar el motor de cálculo de Python a TypeScript | Se evaluó y se descartó por ahora — reescribir `motor_calculo.py` desde cero introduce riesgo de divergencia respecto a la lógica ya validada, sin un beneficio claro en esta fase (ver `architecture.md` → Decisiones técnicas). |

# Modelo de negocio

---

## Propuesta de valor

Le da a un asesor financiero independiente una forma de entregar, sin intervenir en cada caso,
una primera orientación de ahorro e inversión consistente y auditable a sus clientes — aplicando
siempre las mismas reglas que el asesor definió, en vez de recalcular cada caso a mano.

---

## Modelo de monetización

Gratis / uso interno por ahora. Es una herramienta para la propia práctica del asesor, no un
producto que se vende ni se licencia a terceros en esta fase. No hay tiers, precio ni pasarela de
pago definidos — se revisita si en el futuro se decide ofrecerlo a otros asesores (ver
`roadmap.md` → Descartado, donde el escenario multi-tenant queda explícitamente fuera por ahora).

---

## Competidores y diferenciación

No aplica en esta fase: es una herramienta interna, no un producto que compite en un mercado.
Si más adelante se evalúa abrirlo a otros asesores, esta sección se completa con alternativas
como planillas manuales, software de planificación financiera genérico, o asesores que resuelven
esto sin herramienta (a mano).

---

## Métricas de éxito

<!-- Uso interno: no hay objetivo de usuarios/facturación. La validación es cualitativa —
     ajustar cuando el asesor tenga experiencia real usando el dashboard con clientes. -->

- El asesor puede revisar la recomendación de un cliente desde el dashboard sin tener que abrir
  archivos sueltos ni recalcular nada a mano.
- Las recomendaciones generadas por la web app coinciden exactamente con las que produce hoy
  `motor_calculo.py` sobre los mismos datos de entrada (paridad funcional con el flujo actual).

---

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Dependencia de la búsqueda en vivo del tipo de cambio USD/ARS blue (fuente externa sin SLA) | Media | Medio | Si la búsqueda falla, el cálculo que depende de la conversión se bloquea y se marca como pendiente — nunca se estima ni se reutiliza un valor viejo (regla ya definida en `reglas-recomendacion.md` §6). |
| Datos financieros sensibles de clientes expuestos por control de acceso débil | Baja | Alto | Acceso restringido: cada cliente ve solo su propia información, el asesor ve la de todos sus clientes. Ver `data-model.md` → Políticas de acceso. |
| El motor de la web app diverge del cálculo de `motor_calculo.py` durante la migración | Media | Alto | Reutilizar la lógica del script actual como fuente de verdad del cálculo en vez de reescribirla desde cero; testear paridad contra los casos ya generados (ej. Maribel, Anali). |

---

## Restricciones

- Sin presupuesto de terceros por ahora: se prioriza stack con capa gratuita o de bajo costo,
  dado que es uso interno sin monetización (ver `architecture.md` para la decisión de stack).
- Un solo asesor como usuario del dashboard en esta fase — no diseñar para multi-tenant todavía
  (evitar sobre-ingeniería prematura).

# Estrategia de testing

---

## Filosofía

Priorizamos tests sobre el motor de cálculo por encima de todo lo demás: es la parte del sistema
donde un bug es más caro (una recomendación financiera mal calculada), y la que ya tiene casos
reales de referencia (Maribel, Anali) contra los que validar. El resto de la app (dashboard,
formularios) se prioriza con tests de integración solo en los flujos críticos — no perseguimos
cobertura por cobertura en UI puramente visual.

---

## Stack de testing

| Tipo | Herramienta |
|------|-------------|
| Unitario (motor de cálculo, Python) | pytest |
| Unitario (lógica TypeScript) | Vitest |
| Integración | Vitest + Testing Library |
| E2E | Playwright |

---

## Qué testear

### Sí testear
- El motor de cálculo (`motor_calculo.py`): cada regla de `reglas-recomendacion.md` (prioridad
  fondo de emergencia/deuda, aportación, distribución por perfil y plazo, política de
  inviabilidad, conversión de moneda) con casos borde — incluidos los casos reales ya generados
  (Maribel: fondo de emergencia incompleto bloquea inversión; Anali: revisar su caso como
  segundo fixture de referencia).
- Validación de token de entrevista (válido, vencido, ya usado).
- RLS de Supabase: que un asesor no pueda ver clientes de otro (test de integración contra la
  base, no solo unitario).
- El flujo completo de entrevista → ficha → diagnóstico → recomendación (E2E), al menos un
  camino feliz y un caso de meta no viable.

### No testear (o mockear)
- Estilos puramente visuales del design system (paleta, tipografía) — se verifican a ojo, no
  con tests automatizados.
- La respuesta conversacional de la API de Claude palabra por palabra — mockear la API en tests
  de integración/E2E; testear solo que el sistema guarda correctamente lo que el modelo extrae,
  no la redacción exacta de cada pregunta.
- La API pública de cotización (tipo de cambio) — mockear en tests, nunca depender de la
  cotización real del día para que un test pase o falle.

---

## Convenciones

- Archivos: `nombre.test.ts` (o `test_nombre.py` para el motor) junto al archivo que testea.
- Describe en presente: "calcula el aporte necesario sin rendimiento asumido".
- Los fixtures del motor de cálculo usan datos anonimizados equivalentes a los casos reales
  (Maribel, Anali) para no perder esos casos de referencia como regresión.

---

## Cobertura objetivo

- ≥ 90% en `motor_calculo.py` — es la lógica de negocio central, cada regla de
  `reglas-recomendacion.md` debe tener al menos un test.
- Sin objetivo numérico estricto en el resto del código (dashboard, componentes) — se prioriza
  cubrir los flujos críticos de `user-flows.md`, no un porcentaje.

---

## Cómo correr los tests

```bash
# Motor de cálculo (Python)
pytest

# Todos los tests de la app (TypeScript)
pnpm test

# Modo watch
pnpm test:watch

# Con cobertura
pnpm test:coverage

# E2E
pnpm test:e2e
```

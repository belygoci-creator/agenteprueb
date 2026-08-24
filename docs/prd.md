# Product Requirements Document (PRD)

---

## Resumen ejecutivo

Agente de diagnóstico y recomendación financiera para un asesor financiero independiente.
El asesor define de antemano las reglas de negocio (prioridades, umbrales, distribución por
perfil de riesgo, política de inviabilidad) en un archivo de reglas fijo. Con esas reglas
cargadas, el cliente final conversa directamente con el agente: responde una entrevista guiada,
y en la misma conversación recibe un diagnóstico de su situación actual y una recomendación de
cuánto ahorrar y cómo distribuirlo, explicada en lenguaje simple. El asesor no necesita estar
presente en la conversación — la revisa después desde un panel, con el detalle técnico completo
de cada cálculo.

Hoy el flujo funciona como una conversación de texto que produce archivos Markdown/Word/Excel
por cliente. El objetivo de este proyecto es llevar ese mismo flujo a una web app con dashboard:
el cliente completa la entrevista en una interfaz propia, y el asesor tiene un panel donde ve
fichas, diagnósticos y recomendaciones de todos sus clientes en un solo lugar.

Uso previsto: interno, para la práctica de un asesor financiero independiente (no un producto
multi-tenant para otros asesores, al menos en esta fase).

---

## Problema que resuelve

Un asesor financiero independiente no puede sentarse con cada cliente a hacer manualmente el
mismo cálculo (fondo de emergencia, priorización de deuda, aporte necesario vs. sostenible,
distribución por perfil de riesgo, escenarios de inviabilidad) cada vez que alguien quiere una
orientación inicial. Hacerlo a mano es lento, propenso a inconsistencia entre clientes (mismas
reglas aplicadas de forma distinta según el día), y no deja un registro estructurado y auditable
de cómo se llegó a cada recomendación.

El cliente final, por su parte, quiere una respuesta clara y rápida ("¿cuánto tengo que ahorrar
por mes para llegar a esto?") sin necesariamente agendar una reunión, y en lenguaje que no
requiera conocimiento financiero previo.

---

## Usuario objetivo

**Perfil 1 — El asesor (usuario primario del dashboard)**
- Asesor financiero independiente, dueño de las reglas de negocio.
- Motivación principal: dar una primera orientación consistente y rápida a sus clientes sin
  tener que calcular cada caso a mano, y mantener un registro técnico auditable de cada
  recomendación entregada.
- Frustración que resuelve el producto: repetir el mismo cálculo manual, con riesgo de
  inconsistencia entre clientes, y no tener visibilidad centralizada de en qué situación está
  cada cliente.

**Perfil 2 — El cliente final (usuario de la entrevista conversacional)**
- Persona sin conocimientos técnicos de finanzas, con un objetivo concreto en mente (viajar,
  comprar algo, armar un fondo, etc.) y dudas sobre cuánto y cómo ahorrar para lograrlo.
- Motivación principal: entender en lenguaje simple dónde está parado/a hoy respecto a su meta
  y qué tendría que hacer para alcanzarla.
- Frustración que resuelve el producto: jerga financiera que no entiende, y no saber si su meta
  es realista con lo que gana y gasta hoy.

---

## Funcionalidades core (MoSCoW)

### MUST
- Entrevista conversacional guiada al cliente final (una pregunta por turno, orden fijo,
  manejo de respuestas ambiguas con reintentos y marcado `(estimado)`), migrada del guion
  actual en `plantilla-entrevista.md`.
- Generación de ficha del cliente con las 6 variables definidas (perfil, objetivo,
  ingresos/gastos, deudas, ahorro e inversión, perfil de riesgo declarado).
- Generación de diagnóstico (situación actual, % del camino recorrido, proyección a ritmo
  actual, gap vs. objetivo) — sin recomendar nada, solo describir.
- Motor de cálculo de recomendación que aplica 1:1 las reglas de `reglas-recomendacion.md`
  (prioridad fondo de emergencia/deuda cara, aporte necesario vs. sostenible, distribución por
  perfil y plazo, política de inviabilidad con 3 alternativas cuantificadas), reutilizando la
  lógica de `motor_calculo.py`.
- Traducción de la recomendación técnica a lenguaje simple, mostrada al cliente al cierre de la
  conversación.
- Conversión de moneda en vivo (USD/ARS blue) cuando el objetivo está en una moneda distinta al
  flujo del cliente, citando fecha y fuente; si falla, el cálculo queda bloqueado (nunca se
  estima).
- Dashboard del asesor: listado de clientes, y por cada uno acceso a ficha, diagnóstico y
  recomendación técnica completa (el registro que hoy generan los `.md`).
- Persistencia de fichas/diagnósticos/recomendaciones por cliente (hoy son archivos sueltos;
  pasan a vivir en una base de datos accesible desde el dashboard).

### SHOULD
- Exportar ficha/diagnóstico/recomendación de un cliente a PDF o Word para compartir o archivar
  fuera de la app.
- Historial de recomendaciones por cliente (si se reentrevista o se actualiza la situación, ver
  la evolución en el tiempo, no solo la última corrida).
- Edición manual del asesor sobre la ficha de un cliente (corregir un dato mal capturado sin
  tener que reentrevistar desde cero).

### COULD
- Notificación al asesor cuando un cliente completa la entrevista (email o dentro del panel).
- Panel comparativo simple entre clientes (ej. cuántos tienen meta viable vs. no viable).

### WON'T (esta versión)
- Multi-tenant / soporte para varios asesores con sus propios sets de reglas — queda descartado
  explícitamente por ahora (ver `roadmap.md` → Descartado).
- Recomendación de productos o instrumentos concretos (fondos, brokers, tickers) — el motor solo
  recomienda clases de activo y niveles de riesgo, nunca productos específicos (regla fija de
  `reglas-recomendacion.md`, no cambia con la migración a web app).
- Ejecución de operaciones financieras reales (no es una plataforma de inversión, solo de
  diagnóstico y orientación).
- Autenticación multi-rol compleja (por ahora: un asesor, sus clientes con acceso a su propia
  entrevista/resultado).

---

## Flujos de usuario principales

**Flujo de entrevista y diagnóstico (cliente final):**
El cliente recibe un enlace de su asesor, entra a la web app y arranca la entrevista guiada
(rompehielos + objetivo → situación vital → objetivo con cifras → ingresos/gastos/deudas/ahorro
→ tolerancia al riesgo). Al cerrar, ve en pantalla un resumen en lenguaje simple: dónde está
parado/a hoy, cuánto necesitaría ahorrar por mes, cómo distribuirlo, si la meta es viable con lo
que puede aportar hoy y, si no lo es, las alternativas concretas para pensar. Se le aclara que es
una orientación automática que su asesor puede revisar y ajustar.

**Flujo de revisión (asesor):**
El asesor entra al dashboard, ve el listado de sus clientes y el estado de cada uno (entrevista
pendiente / completada, meta viable / no viable). Entra al detalle de un cliente y ve la ficha
completa, el diagnóstico y la recomendación técnica (con el desglose que hoy vive en
`recomendacion-[nombre].md`: prioridad aplicada, conversión de moneda si corresponde, aportación,
distribución, alternativas de viabilidad, supuestos usados).

(El detalle paso a paso y los diagramas de estos flujos se documentan en `user-flows.md`.)

---

## Requisitos no funcionales

- **Consistencia de reglas:** el motor de cálculo debe aplicar siempre las mismas reglas de
  `reglas-recomendacion.md` sin desviaciones caso a caso — es el requisito no funcional más
  importante del producto, ya la lógica actual en `motor_calculo.py` lo garantiza y no debe
  perderse en la migración.
- **Trazabilidad:** toda recomendación debe quedar registrada con las fuentes usadas (fecha y
  fuente del tipo de cambio cuando aplica, supuestos marcados explícitamente) para que el asesor
  la pueda auditar.
- **Privacidad de datos financieros:** ingresos, gastos, deudas y ahorro de cada cliente son
  datos sensibles — acceso restringido al cliente dueño del dato y a su asesor únicamente.
- **Idioma:** español rioplatense, tono cercano y sin tecnicismos de cara al cliente final (la
  jerga técnica solo aparece en el panel del asesor).

---

## Fuera de alcance (explícito)

- Asesoramiento financiero personalizado que reemplace el criterio profesional del asesor: el
  agente siempre aclara que es una orientación automática basada en reglas fijas, revisada
  después por el asesor.
- Ejecución de inversiones o movimientos de dinero reales.
- Soporte para múltiples asesores con reglas propias (multi-tenant) — descartado por ahora.

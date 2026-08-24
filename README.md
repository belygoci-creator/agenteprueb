# asesor-financiero

Agente de diagnóstico y recomendación financiera para un asesor financiero independiente.

---

## ¿Qué es esto?

El asesor define de antemano sus reglas de negocio (prioridades, umbrales, distribución por
perfil de riesgo, política de inviabilidad). Con esas reglas cargadas, el cliente final conversa
directamente con el agente: responde una entrevista guiada y recibe, en la misma conversación,
un diagnóstico de su situación actual y una recomendación de cuánto ahorrar y cómo distribuirlo,
explicada en lenguaje simple, sin jerga financiera.

El asesor no necesita estar presente en la conversación. La revisa después desde un dashboard,
con el detalle técnico completo de cada cálculo (prioridad aplicada, aportación, distribución,
alternativas de viabilidad, supuestos usados).

Uso interno: es una herramienta para la práctica de un asesor, no un producto multi-tenant.

---

## Qué problema resuelve

Calcular a mano, cliente por cliente, el fondo de emergencia necesario, la priorización de
deuda, el aporte necesario vs. sostenible, la distribución por perfil de riesgo y los escenarios
de inviabilidad es lento y propenso a inconsistencia. Este agente aplica siempre las mismas
reglas, deja un registro auditable de cada recomendación, y le da al cliente una respuesta clara
sin necesidad de agendar una reunión.

Más contexto en [`docs/prd.md`](docs/prd.md).

---

## Requisitos previos

- Node.js y [pnpm](https://pnpm.io/) v11
- Cuenta de [Supabase](https://supabase.com/) (base de datos + autenticación)
- API key de [Anthropic](https://console.anthropic.com/) (motor conversacional de la entrevista)

---

## Variables de entorno

Copiá `.env.example` como `.env.local` y completá los valores reales. Nunca comitees
`.env.local`. Detalle de cada variable en [`.env.example`](.env.example).

---

## Instalación y desarrollo

```bash
pnpm install
pnpm dev
```

---

## Estructura de carpetas

```
src/
├── app/
│   ├── (dashboard)/        → Rutas del asesor, protegidas por Supabase Auth
│   ├── entrevista/[token]/ → Ruta pública de la entrevista, acceso por enlace único
│   └── api/                → Route handlers (entrevista con Claude, motor de cálculo)
├── components/             → Componentes de UI, entrevista y dashboard
├── lib/                    → Supabase, cliente de Claude, utilidades
├── hooks/                  → Custom hooks de React
└── types/                  → Tipos TypeScript compartidos

api/
└── motor-calculo.py        → Función serverless Python con la lógica de recomendación

docs/                       → Documentación viva del proyecto
changelog/                  → Registro de cambios
mejoras/                    → Backlog de ideas futuras
```

Detalle completo en [`docs/architecture.md`](docs/architecture.md).

---

## Cómo contribuir

Este repo sigue el protocolo definido en [`CLAUDE.md`](CLAUDE.md): antes de tocar código, leer
`docs/`; cada cambio importante deja registro en `changelog/`; si afecta algo documentado, se
actualiza el doc correspondiente en la misma sesión.

---

## Estado del proyecto

En desarrollo. Ver [`docs/roadmap.md`](docs/roadmap.md) para el detalle de fases.

---

## Licencia

MIT. Ver [`LICENSE`](./LICENSE).

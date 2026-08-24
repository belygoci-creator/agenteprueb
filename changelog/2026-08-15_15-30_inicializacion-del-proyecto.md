# Inicialización del proyecto

**Fecha:** 2026-08-15 15:30
**Tipo:** Configuración

## Qué se hizo
Se convirtió la plantilla `project-template` en el repositorio de este proyecto: agente de
diagnóstico y recomendación financiera para un asesor independiente, con dashboard web y motor
conversacional vía API de Claude.

## Qué se modificó
- `docs/prd.md`, `docs/business.md`, `docs/design-system.md`, `docs/architecture.md`,
  `docs/data-model.md`, `docs/roadmap.md`, `docs/user-flows.md`, `docs/testing.md` — completados
  a partir del flujo ya existente (`instrucciones-sistema.md`, `reglas-recomendacion.md`,
  `plantilla-entrevista.md`, `motor_calculo.py`) y de las decisiones tomadas con el usuario.
- `CLAUDE.md` — rellenados nombre, descripción, stack, estructura de carpetas, convenciones y
  "Qué NO hacer"; quitada la sección de inicialización y las referencias a `.template/`.
- `README.md` — reescrito para el producto.
- `LICENSE` — autor y año.
- `.env.example` — variables reales del stack (Supabase, Anthropic).
- `.mcp.json` — servidor MCP de Supabase, alcance de proyecto (pendiente de autenticar con
  `/mcp` en una sesión interactiva).
- `.template/` — eliminada.

## Por qué
El repo partió como plantilla sin inicializar (documentación vacía, solo comentarios). Se
completó la documentación en el orden que exige `CLAUDE.md`, con el usuario confirmando cada
documento, y se ejecutó el checklist de inicialización para que el repo hable del producto y no
de la plantilla.

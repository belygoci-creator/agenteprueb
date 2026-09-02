# Backlog de mejoras

<!-- Ideas de mejora que no entran en el sprint actual pero que no queremos perder.
     No es un compromiso, es un repositorio de ideas.
     Añadir una entrada cada vez que surja una idea durante el desarrollo. -->

---

## Formato de entrada

```
### [MEJORA-XX] Título de la idea
**Área:** Frontend / Backend / UX / Infraestructura / Negocio
**Prioridad estimada:** Alta / Media / Baja
**Origen:** De dónde salió la idea (conversación, feedback de usuario, etc.)

Descripción breve de la mejora y por qué aportaría valor.
```

---

### [MEJORA-01] Proveedor de email propio para Supabase Auth
**Área:** Infraestructura
**Prioridad estimada:** Media
**Origen:** Al probar el login del asesor (magic link), el servicio de email gratuito de
Supabase demoró/no entregó el correo de forma confiable.

El servicio de email compartido de Supabase (plan Free) tiene límites bajos y entregas poco
confiables. Configurar un proveedor propio (ej. Resend) en Supabase Auth → Settings → SMTP
daría entregas más rápidas y confiables del magic link. No es bloqueante para uso interno con
un solo asesor, pero conviene resolverlo antes de depender del login en el día a día.

---

### [MEJORA-02] Crear el pg_cron que dispare revision-diaria
**Área:** Infraestructura
**Prioridad estimada:** Alta
**Origen:** Al convertir la revisión diaria en Supabase Edge Function
(`supabase/functions/revision-diaria`), pedido explícito era la función + su despliegue, sin
crear todavía el disparador automático.

La función ya existe, está desplegada y protegida con `CRON_SECRET`. Falta el `pg_cron` en sí:
un `cron.schedule(...)` en Supabase que llame `net.http_post` contra la URL de la función una
vez al día, con la cabecera `Authorization: Bearer <CRON_SECRET>`. Requiere las extensiones
`pg_cron` y `pg_net` habilitadas en el proyecto (Database → Extensions) y decidir el horario.

---

### [MEJORA-03] Vigilancia de mercado para otras clases de activo
**Área:** Backend
**Prioridad estimada:** Media
**Origen:** Al crear `scripts/revision.ts` — hoy solo hay una fuente de datos (Yahoo Finance,
S&P 500) para la clase `renta_variable`.

`reglas_alerta` admite cualquier `clase`, pero el script solo evalúa las reglas cuya `clase` sea
`renta_variable` (las demás quedan en `reglas_sin_datos` en el resumen JSON). Si se agregan
reglas para otras clases (renta fija, liquidez), hace falta elegir una fuente de datos para cada
una antes de que ese script las pueda evaluar.

---

### [MEJORA-04] UI en el dashboard para avisar_cliente y suspendido
**Área:** Frontend
**Prioridad estimada:** Media
**Origen:** Al agregar las columnas `clientes.avisar_cliente` y `clientes.suspendido`
(`0005_alertas_avisar_cliente_y_suspendido.sql`).

Ambas columnas hoy solo se pueden editar directo en Supabase (o vía función admin) — no hay
ningún control en el dashboard del asesor para activarlas por cliente. Si se adopta la
vigilancia de mercado como parte del flujo normal, conviene exponerlas ahí.

---

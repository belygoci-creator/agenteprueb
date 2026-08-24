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

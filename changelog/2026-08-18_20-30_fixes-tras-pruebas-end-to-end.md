# Fixes tras pruebas end-to-end del flujo completo

**Fecha:** 2026-08-18 20:30
**Tipo:** Fix

## Qué se hizo
Se conectó el proyecto a Supabase y Anthropic reales, y se probó el flujo completo (alta de
cliente → entrevista → motor de cálculo → diagnóstico/recomendación) con 4 personas de prueba
simuladas, cubriendo los escenarios clave de `reglas-recomendacion.md`: meta viable con perfil
moderado, fondo de emergencia incompleto con meta en USD, deuda cara bloqueando inversión, y
meta viable con perfil dinámico a largo plazo. Los 4 casos cerraron correctamente y quedaron
persistidos en `fichas`, `diagnosticos` y `recomendaciones`.

Se encontraron y corrigieron 3 bugs reales:

1. **RLS bloqueaba la creación de clientes.** `crear_cliente_con_token` corría `security
   invoker`, sujeta a RLS del rol `authenticated`, que no tiene policy de INSERT sobre
   `entrevista_tokens` (a propósito). Se cambió a `security definer` — la comprobación de
   propiedad sigue intacta porque el cliente se inserta con `asesor_id = auth.uid()`.
2. **El middleware bloqueaba `/api/entrevista`.** Como esa ruta no estaba en `PUBLIC_PATHS`,
   cualquier pedido sin sesión de asesor rebotaba a `/login` — esto iba a impedir que un
   **cliente real** (que nunca tiene sesión de asesor) completara su propia entrevista. Se
   agregó `/api/entrevista` a las rutas públicas.
3. **El motor de cálculo devolvía `Infinity` en JSON**, inválido según RFC 8259, cuando el
   aporte máximo sostenible es $0 (fondo de emergencia incompleto o deuda cara) — un escenario
   común, no un caso borde. `json.dumps` de Python permite `Infinity` por defecto pero
   `JSON.parse` de Node lo rechaza, rompiendo toda la respuesta. Se sanea recursivamente antes
   de serializar, convirtiendo `inf`/`-inf`/`nan` a `null`.

Además, se agregó validación server-side de la ficha antes de insertar: si Claude cierra la
entrevista sin haber capturado un dato obligatorio, en vez de que el insert falle con un error
crudo de Postgres (`null value ... violates not-null constraint`), el servidor le devuelve el
error a Claude como resultado de la tool y le pide retomar la pregunta (hasta 3 reintentos).

## Qué se modificó
- `supabase/migrations/0002_fix_crear_cliente_con_token_security.sql` (nueva) — fix de RLS,
  aplicada a la base real.
- `supabase/migrations/0001_initial_schema.sql` — actualizada para reflejar el fix desde el
  origen.
- `src/middleware.ts` — `/api/entrevista` agregada a `PUBLIC_PATHS`.
- `api/motor-calculo.py` — sanea valores no finitos antes de serializar la respuesta.
- `src/lib/resumen-simple.ts` — tipo `plazo_necesario_total_meses: number | null`, con mensaje
  explícito cuando no es calculable.
- `src/lib/claude/validar-ficha.ts` (nuevo) — valida campos requeridos de `guardar_ficha`.
- `src/app/api/entrevista/route.ts` — loop de reintento: si faltan datos, se lo comunica a
  Claude como error de la tool en vez de romper.
- `src/lib/entrevista/procesar-cierre.ts` — `MOTOR_CALCULO_URL` opcional para apuntar a un
  motor corriendo aparte en desarrollo local (`next dev` sin `vercel dev`).
- `api/_run_local_server.py` (nuevo) — sirve `motor-calculo.py` como servidor HTTP local para
  desarrollo, sin necesitar `vercel dev`.
- `.env.local` — credenciales reales de Supabase y Anthropic cargadas (no versionado).

## Por qué
El proyecto de Supabase (`asesor-financiero`) se creó y conectó en esta sesión. Antes de darlo
por terminado, se probó el flujo real de punta a punta en vez de confiar solo en que el build
compilara — eso fue lo que expuso estos tres bugs, ninguno de los cuales aparece en un `pnpm
build` limpio porque son de comportamiento en tiempo de ejecución (RLS, middleware, formato de
JSON), no de tipos.

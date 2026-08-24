import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Cliente con service_role, bypassa RLS. Uso exclusivo en route handlers de
 * servidor para las operaciones sobre `entrevista_tokens` y la escritura de
 * ficha/diagnóstico/recomendación durante la entrevista — el cliente final
 * no tiene sesión de Supabase Auth (ver docs/architecture.md).
 *
 * Nunca importar este módulo desde código que corre en el navegador.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

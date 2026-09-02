"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Uso interno con un solo asesor autorizado (ver docs/business.md ->
 * Restricciones). Se corta acá, antes de llamar a Supabase, para que nadie
 * más pueda ni siquiera crearse una cuenta -- signInWithOtp autoprovisiona
 * un usuario nuevo por defecto si el email no existe.
 */
export async function enviarEnlaceAcceso(
  email: string,
  origin: string
): Promise<{ error: string | null }> {
  const permitido = process.env.ASESOR_EMAIL_PERMITIDO?.trim().toLowerCase();

  if (!permitido || email.trim().toLowerCase() !== permitido) {
    return { error: "Este email no tiene acceso a la app." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  return { error: error?.message ?? null };
}

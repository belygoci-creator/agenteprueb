import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { calcularYGuardarDiagnostico, type ResultadoCierre } from "@/lib/entrevista/procesar-cierre";
import type { FichaTool } from "@/lib/claude/tools";

/**
 * Edición manual del asesor sobre la ficha de un cliente (docs/prd.md ->
 * SHOULD). Nunca actualiza la fila existente: inserta una nueva versión,
 * igual que una reentrevista, para no perder el registro auditable (ver
 * docs/data-model.md -> fichas). Recalcula con el mismo motor que usa la
 * entrevista, para que ambos caminos apliquen exactamente las mismas
 * reglas.
 */
export async function guardarFichaManual(clienteId: string, ficha: FichaTool): Promise<ResultadoCierre> {
  // Ownership check con el cliente de sesión (RLS): si el cliente no es del
  // asesor logueado, esto devuelve null y cortamos antes de escribir nada.
  const supabaseSesion = await createClient();
  const { data: cliente } = await supabaseSesion.from("clientes").select("id").eq("id", clienteId).single();

  if (!cliente) {
    throw new Error("Cliente no encontrado o no pertenece a este asesor.");
  }

  const admin = createAdminClient();
  const { data: fichaRow, error } = await admin
    .from("fichas")
    .insert({ cliente_id: clienteId, ...ficha })
    .select("id")
    .single();

  if (error || !fichaRow) {
    throw new Error(error?.message ?? "No se pudo guardar la ficha corregida.");
  }

  return calcularYGuardarDiagnostico(clienteId, fichaRow.id, ficha);
}

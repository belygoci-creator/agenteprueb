import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type FichaRow = Database["public"]["Tables"]["fichas"]["Row"];
type DiagnosticoRow = Database["public"]["Tables"]["diagnosticos"]["Row"];
type RecomendacionRow = Database["public"]["Tables"]["recomendaciones"]["Row"];

export const ETAPA_LABEL: Record<string, string> = {
  fondo_emergencia: "Fondo de emergencia incompleto",
  deuda_cara: "Deuda cara sin resolver",
  invertir: "Puede invertir",
};

export function formatMoneda(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}

export interface EntradaHistorial {
  ficha: FichaRow;
  diagnostico: DiagnosticoRow | null;
  recomendacion: RecomendacionRow | null;
}

async function obtenerFichaConDetalle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fichaId: string,
  fichaRow: FichaRow
): Promise<EntradaHistorial> {
  const diagnostico = (
    await supabase
      .from("diagnosticos")
      .select("*")
      .eq("ficha_id", fichaId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ).data;

  const recomendacion = diagnostico
    ? (
        await supabase
          .from("recomendaciones")
          .select("*")
          .eq("diagnostico_id", diagnostico.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data
    : null;

  return { ficha: fichaRow, diagnostico, recomendacion };
}

/**
 * Trae el cliente y el historial completo de fichas (más reciente primero),
 * cada una con su diagnóstico y recomendación. RLS limita todo al asesor
 * dueño del cliente.
 */
export async function obtenerClienteCompleto(id: string) {
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nombre, email, estado, created_at")
    .eq("id", id)
    .single();

  if (!cliente) {
    return { cliente: null, historial: [] as EntradaHistorial[] };
  }

  const { data: fichas } = await supabase
    .from("fichas")
    .select("*")
    .eq("cliente_id", id)
    .order("created_at", { ascending: false });

  const historial: EntradaHistorial[] = [];
  for (const fichaRow of fichas ?? []) {
    historial.push(await obtenerFichaConDetalle(supabase, fichaRow.id, fichaRow));
  }

  return { cliente, historial };
}

export type ClienteCompleto = Awaited<ReturnType<typeof obtenerClienteCompleto>>;

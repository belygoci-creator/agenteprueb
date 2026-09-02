/**
 * Tipos de la capa de vigilancia de mercado. Los cinco primeros corresponden
 * columna a columna a las tablas de supabase/migrations/0004_alertas_de_mercado.sql
 * (vía src/types/database.ts, que las refleja a mano).
 */
// Import relativo (no "@/...") a propósito: este módulo lo consume también
// supabase/functions/revision-diaria (Deno), que no resuelve el alias de
// tsconfig.
import type { Database, PerfilRiesgo } from "../../types/database.ts";

export type ObservacionMercado = Database["public"]["Tables"]["observaciones_mercado"]["Row"];
export type ReglaAlerta = Database["public"]["Tables"]["reglas_alerta"]["Row"];
export type EventoMercado = Database["public"]["Tables"]["eventos_mercado"]["Row"];
export type Alerta = Database["public"]["Tables"]["alertas"]["Row"];
export type Posicion = Database["public"]["Tables"]["posiciones"]["Row"];

/** Evento detectado en memoria, antes de insertarse (sin id ni created_at, que asigna la base). */
export type EventoDetectado = Omit<EventoMercado, "id" | "created_at">;

/**
 * Datos de un cliente necesarios para decidir si una alerta lo afecta. No es
 * una tabla real: `clientesAfectados` la recibe como entrada pura, armada por
 * quien la llame combinando `clientes.suspendido` (0005_alertas_avisar_cliente_y_suspendido.sql)
 * con la ficha más reciente del cliente (`tiene_analisis`: si existe al menos
 * un `diagnosticos` asociado; `perfil_riesgo`: `fichas.perfil_riesgo_declarado`
 * de la ficha más reciente — ver supabase/functions/revision-diaria para el armado real).
 */
export interface ClienteCandidato {
  cliente_id: string;
  suspendido: boolean;
  tiene_analisis: boolean;
  perfil_riesgo: PerfilRiesgo | null;
}

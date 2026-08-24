/**
 * Tipos de la base de datos, escritos a mano a partir de docs/data-model.md
 * y supabase/migrations/0001_initial_schema.sql.
 *
 * TODO: una vez que el proyecto de Supabase esté creado y el MCP autenticado,
 * regenerar con `supabase gen types typescript` y reemplazar este archivo.
 */

export type PerfilRiesgo = "conservador" | "moderado" | "dinamico";
export type EstadoCliente = "pendiente" | "entrevista_completa";
export type EtapaPrioridad = "fondo_emergencia" | "deuda_cara" | "invertir";

export interface Database {
  public: {
    Tables: {
      asesores: {
        Row: {
          id: string;
          nombre: string;
          created_at: string;
        };
        Insert: {
          id: string;
          nombre: string;
          created_at?: string;
        };
        Update: Partial<{
          nombre: string;
        }>;
        Relationships: [];
      };
      clientes: {
        Row: {
          id: string;
          asesor_id: string;
          nombre: string;
          email: string | null;
          estado: EstadoCliente;
          created_at: string;
        };
        Insert: {
          id?: string;
          asesor_id: string;
          nombre: string;
          email?: string | null;
          estado?: EstadoCliente;
          created_at?: string;
        };
        Update: Partial<{
          nombre: string;
          email: string | null;
          estado: EstadoCliente;
        }>;
        Relationships: [];
      };
      entrevista_tokens: {
        Row: {
          id: string;
          cliente_id: string;
          token: string;
          expires_at: string;
          used_at: string | null;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          token: string;
          expires_at: string;
          used_at?: string | null;
        };
        Update: Partial<{
          used_at: string | null;
        }>;
        Relationships: [];
      };
      fichas: {
        Row: {
          id: string;
          cliente_id: string;
          edad: number;
          dependientes: string;
          situacion_laboral: string;
          estabilidad_laboral: string;
          objetivo_descripcion: string;
          objetivo_monto: number;
          objetivo_moneda: string;
          objetivo_plazo_meses: number;
          objetivo_prioridad: string | null;
          ingresos_netos_mensuales: number;
          ingresos_estimado: boolean;
          gastos_fijos_mensuales: number;
          gastos_estimado: boolean;
          deuda_saldo: number | null;
          deuda_cuota_mensual: number | null;
          deuda_tasa_interes: number | null;
          deuda_estimado: boolean;
          ahorro_actual_monto: number;
          ahorro_actual_liquidez: string | null;
          ahorro_estimado: boolean;
          fondo_emergencia_meses: number;
          perfil_riesgo_declarado: PerfilRiesgo;
          notas_cualitativas: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["fichas"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["fichas"]["Insert"]>;
        Relationships: [];
      };
      diagnosticos: {
        Row: {
          id: string;
          ficha_id: string;
          tasa_ahorro: number;
          porcentaje_camino_recorrido: number;
          proyeccion_acumulada: number;
          gap: number | null;
          gap_pendiente_motivo: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["diagnosticos"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      recomendaciones: {
        Row: {
          id: string;
          diagnostico_id: string;
          etapa_prioridad: EtapaPrioridad;
          fondo_emergencia_requerido_meses: number;
          tipo_cambio_usado: number | null;
          tipo_cambio_fecha: string | null;
          tipo_cambio_fuente: string | null;
          aporte_necesario: number;
          aporte_maximo_sostenible: number;
          diferencia: number;
          viable: boolean;
          distribucion_renta_fija: number;
          distribucion_liquidez: number;
          distribucion_renta_variable: number;
          alternativas: Record<string, unknown> | null;
          supuestos: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["recomendaciones"]["Row"],
          "id" | "created_at"
        > & {
          id?: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      crear_cliente_con_token: {
        Args: {
          p_nombre: string;
          p_email: string | null;
          p_token: string;
          p_expires_at: string;
        };
        Returns: Database["public"]["Tables"]["clientes"]["Row"];
      };
      generar_enlace_entrevista: {
        Args: {
          p_cliente_id: string;
          p_token: string;
          p_expires_at: string;
        };
        Returns: Database["public"]["Tables"]["entrevista_tokens"]["Row"];
      };
    };
  };
}

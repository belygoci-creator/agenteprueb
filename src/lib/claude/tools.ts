import type Anthropic from "@anthropic-ai/sdk";

/**
 * Tool que Claude llama una única vez, al cerrar la entrevista, con los
 * datos de la ficha (ver docs/data-model.md -> fichas). El route handler
 * captura esta llamada en vez de parsear texto libre.
 */
export const GUARDAR_FICHA_TOOL: Anthropic.Tool = {
  name: "guardar_ficha",
  description:
    "Guarda la ficha del cliente al cerrar la entrevista, con las 14 respuestas recolectadas.",
  input_schema: {
    type: "object",
    properties: {
      edad: { type: "integer" },
      dependientes: { type: "string" },
      situacion_laboral: { type: "string" },
      estabilidad_laboral: {
        type: "string",
        enum: ["estable", "inestable"],
        description: "estable si es relación de dependencia estable; inestable si es independiente, mixto o inestable",
      },
      objetivo_descripcion: { type: "string" },
      objetivo_monto: { type: "number" },
      objetivo_moneda: { type: "string", description: "ej. ARS, USD" },
      objetivo_plazo_meses: { type: "integer" },
      objetivo_prioridad: { type: ["string", "null"] },
      ingresos_netos_mensuales: { type: "number" },
      ingresos_estimado: { type: "boolean" },
      gastos_fijos_mensuales: { type: "number" },
      gastos_estimado: { type: "boolean" },
      deuda_saldo: { type: ["number", "null"] },
      deuda_cuota_mensual: { type: ["number", "null"] },
      deuda_tasa_interes: { type: ["number", "null"], description: "% anual" },
      deuda_estimado: { type: "boolean" },
      ahorro_actual_monto: { type: "number" },
      ahorro_actual_liquidez: { type: ["string", "null"] },
      ahorro_estimado: { type: "boolean" },
      fondo_emergencia_meses: { type: "number" },
      perfil_riesgo_declarado: {
        type: "string",
        enum: ["conservador", "moderado", "dinamico"],
      },
      notas_cualitativas: { type: ["string", "null"] },
    },
    required: [
      "edad",
      "dependientes",
      "situacion_laboral",
      "estabilidad_laboral",
      "objetivo_descripcion",
      "objetivo_monto",
      "objetivo_moneda",
      "objetivo_plazo_meses",
      "ingresos_netos_mensuales",
      "ingresos_estimado",
      "gastos_fijos_mensuales",
      "gastos_estimado",
      "deuda_estimado",
      "ahorro_actual_monto",
      "ahorro_estimado",
      "fondo_emergencia_meses",
      "perfil_riesgo_declarado",
    ],
  },
};

export interface FichaTool {
  edad: number;
  dependientes: string;
  situacion_laboral: string;
  estabilidad_laboral: "estable" | "inestable";
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
  perfil_riesgo_declarado: "conservador" | "moderado" | "dinamico";
  notas_cualitativas: string | null;
}

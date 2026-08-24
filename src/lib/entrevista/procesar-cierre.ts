import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerDolarBlue } from "@/lib/tipo-cambio";
import { construirResumenSimple } from "@/lib/resumen-simple";
import type { FichaTool } from "@/lib/claude/tools";

const FLUJO_MONEDA_DEFAULT = "ARS";

interface ResultadoMotor {
  bloqueado?: boolean;
  motivo?: string;
  conversion_moneda: {
    objetivo_monto_moneda_flujo: number;
    conversion_aplicada: boolean;
    tipo_cambio_usado?: { valor: number; fecha: string; fuente: string };
  };
  gap: number;
  etapa: {
    etapa: "fondo_emergencia" | "deuda_cara" | "inversion";
    fondo_emergencia_minimo_meses: number;
  };
  aportacion: {
    aporte_necesario: number;
    aporte_maximo_sostenible: number;
    diferencia: number;
    viable: boolean;
  };
  distribucion: {
    distribucion_recomendada: { renta_fija: number; liquidez: number; renta_variable: number };
  };
  escenarios_inviabilidad: unknown;
}

const ETAPA_MOTOR_A_DB: Record<string, "fondo_emergencia" | "deuda_cara" | "invertir"> = {
  fondo_emergencia: "fondo_emergencia",
  deuda_cara: "deuda_cara",
  inversion: "invertir",
};

export type ResultadoCierre =
  | { type: "cierre"; resumen: string }
  | { type: "bloqueado"; motivo: string };

/**
 * Se llama cuando Claude cierra la entrevista (llamada a la tool
 * guardar_ficha). Persiste la ficha y delega el cálculo a
 * calcularYGuardarDiagnostico -- la misma función que usa la edición manual
 * de fichas, para que ambos caminos apliquen exactamente las mismas reglas.
 */
export async function procesarCierreEntrevista(
  token: string,
  ficha: FichaTool
): Promise<ResultadoCierre> {
  const supabase = createAdminClient();

  const { data: tokenRow, error: tokenError } = await supabase
    .from("entrevista_tokens")
    .select("cliente_id")
    .eq("token", token)
    .single();

  if (tokenError || !tokenRow) {
    throw new Error("Token de entrevista inválido.");
  }

  const { data: fichaRow, error: fichaError } = await supabase
    .from("fichas")
    .insert({ cliente_id: tokenRow.cliente_id, ...ficha })
    .select("id")
    .single();

  if (fichaError || !fichaRow) {
    throw new Error(fichaError?.message ?? "No se pudo guardar la ficha.");
  }

  const resultado = await calcularYGuardarDiagnostico(tokenRow.cliente_id, fichaRow.id, ficha);

  await marcarTokenUsado(token);

  return resultado;
}

/**
 * Corre el motor de cálculo para una ficha ya guardada (con id), persiste
 * diagnóstico + recomendación, y marca al cliente como entrevista_completa.
 * La usan tanto el cierre de entrevista como la edición manual de fichas
 * (ver src/lib/clientes/editar-ficha.ts) -- una sola fuente de verdad para
 * el cálculo, sin importar de dónde vino la ficha.
 */
export async function calcularYGuardarDiagnostico(
  clienteId: string,
  fichaId: string,
  ficha: FichaTool
): Promise<ResultadoCierre> {
  const supabase = createAdminClient();

  let tipoCambio = undefined as { valor: number; fecha: string; fuente: string } | undefined;
  if (ficha.objetivo_moneda !== FLUJO_MONEDA_DEFAULT) {
    const dolarBlue = await obtenerDolarBlue();
    if (!dolarBlue) {
      await supabase.from("diagnosticos").insert({
        ficha_id: fichaId,
        tasa_ahorro: 0,
        porcentaje_camino_recorrido: 0,
        proyeccion_acumulada: 0,
        gap: null,
        gap_pendiente_motivo:
          "No se pudo obtener el tipo de cambio en vivo para convertir el objetivo. Nunca se estima: hay que reintentar más tarde.",
      });
      await marcarClienteCompletado(clienteId);
      return {
        type: "bloqueado",
        motivo:
          "No pudimos obtener el tipo de cambio del dólar en este momento, así que no podemos calcular tu meta todavía. Tu asesor lo va a revisar.",
      };
    }
    tipoCambio = dolarBlue;
  }

  const resultado = await llamarMotorCalculo({
    ingresos_mensuales: ficha.ingresos_netos_mensuales,
    gastos_fijos_mensuales: ficha.gastos_fijos_mensuales,
    deuda_cuota_mensual: ficha.deuda_cuota_mensual ?? 0,
    deuda_tasa_interes: ficha.deuda_tasa_interes,
    estabilidad_laboral: ficha.estabilidad_laboral,
    fondo_emergencia_meses_actual: ficha.fondo_emergencia_meses,
    ahorro_actual: ficha.ahorro_actual_monto,
    objetivo_monto: ficha.objetivo_monto,
    objetivo_moneda: ficha.objetivo_moneda,
    flujo_moneda: FLUJO_MONEDA_DEFAULT,
    objetivo_plazo_meses: ficha.objetivo_plazo_meses,
    perfil_riesgo: ficha.perfil_riesgo_declarado,
    tipo_cambio: tipoCambio,
  });

  if (resultado.bloqueado) {
    await supabase.from("diagnosticos").insert({
      ficha_id: fichaId,
      tasa_ahorro: 0,
      porcentaje_camino_recorrido: 0,
      proyeccion_acumulada: 0,
      gap: null,
      gap_pendiente_motivo: resultado.motivo ?? "Cálculo bloqueado: falta un dato.",
    });
    await marcarClienteCompletado(clienteId);
    return {
      type: "bloqueado",
      motivo: `Me falta un dato para poder calcular esto bien: ${resultado.motivo}`,
    };
  }

  const excedente = ficha.ingresos_netos_mensuales - ficha.gastos_fijos_mensuales - (ficha.deuda_cuota_mensual ?? 0);
  const tasaAhorro = (excedente / ficha.ingresos_netos_mensuales) * 100;
  const objetivoEnFlujo = resultado.conversion_moneda.objetivo_monto_moneda_flujo;
  const porcentajeCamino = objetivoEnFlujo > 0 ? (ficha.ahorro_actual_monto / objetivoEnFlujo) * 100 : 0;
  const proyeccionAcumulada = ficha.ahorro_actual_monto + excedente * ficha.objetivo_plazo_meses;

  const { data: diagnosticoRow, error: diagnosticoError } = await supabase
    .from("diagnosticos")
    .insert({
      ficha_id: fichaId,
      tasa_ahorro: tasaAhorro,
      porcentaje_camino_recorrido: porcentajeCamino,
      proyeccion_acumulada: proyeccionAcumulada,
      gap: resultado.gap,
      gap_pendiente_motivo: null,
    })
    .select("id")
    .single();

  if (diagnosticoError || !diagnosticoRow) {
    throw new Error(diagnosticoError?.message ?? "No se pudo guardar el diagnóstico.");
  }

  await supabase.from("recomendaciones").insert({
    diagnostico_id: diagnosticoRow.id,
    etapa_prioridad: ETAPA_MOTOR_A_DB[resultado.etapa.etapa],
    fondo_emergencia_requerido_meses: resultado.etapa.fondo_emergencia_minimo_meses,
    tipo_cambio_usado: resultado.conversion_moneda.tipo_cambio_usado?.valor ?? null,
    tipo_cambio_fecha: resultado.conversion_moneda.tipo_cambio_usado?.fecha ?? null,
    tipo_cambio_fuente: resultado.conversion_moneda.tipo_cambio_usado?.fuente ?? null,
    aporte_necesario: resultado.aportacion.aporte_necesario,
    aporte_maximo_sostenible: resultado.aportacion.aporte_maximo_sostenible,
    diferencia: resultado.aportacion.diferencia,
    viable: resultado.aportacion.viable,
    distribucion_renta_fija: resultado.distribucion.distribucion_recomendada.renta_fija,
    distribucion_liquidez: resultado.distribucion.distribucion_recomendada.liquidez,
    distribucion_renta_variable: resultado.distribucion.distribucion_recomendada.renta_variable,
    alternativas: resultado.escenarios_inviabilidad as Record<string, unknown> | null,
    supuestos: { colchon_pct: 0.15, rendimiento_asumido: false },
  });

  await marcarClienteCompletado(clienteId);

  const resumen = construirResumenSimple({
    moneda: FLUJO_MONEDA_DEFAULT,
    aporteNecesario: resultado.aportacion.aporte_necesario,
    aporteMaximoSostenible: resultado.aportacion.aporte_maximo_sostenible,
    diferencia: resultado.aportacion.diferencia,
    viable: resultado.aportacion.viable,
    etapa: ETAPA_MOTOR_A_DB[resultado.etapa.etapa],
    fondoEmergenciaMinimoMeses: resultado.etapa.fondo_emergencia_minimo_meses,
    fondoEmergenciaActualMeses: ficha.fondo_emergencia_meses,
    distribucion: resultado.distribucion.distribucion_recomendada,
    alternativas: resultado.escenarios_inviabilidad as never,
  });

  return { type: "cierre", resumen };
}

async function marcarClienteCompletado(clienteId: string) {
  const supabase = createAdminClient();
  await supabase.from("clientes").update({ estado: "entrevista_completa" }).eq("id", clienteId);
}

async function marcarTokenUsado(token: string) {
  const supabase = createAdminClient();
  await supabase.from("entrevista_tokens").update({ used_at: new Date().toISOString() }).eq("token", token);
}

async function llamarMotorCalculo(datos: Record<string, unknown>): Promise<ResultadoMotor> {
  // En Vercel, api/motor-calculo.py se sirve junto con la app en el mismo
  // dominio. En desarrollo local con `next dev` (sin `vercel dev`), esa
  // función Python no está disponible; MOTOR_CALCULO_URL permite apuntar a
  // una instancia corriendo aparte solo para desarrollo/pruebas locales.
  const url =
    process.env.MOTOR_CALCULO_URL ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/motor-calculo`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });

  if (!response.ok) {
    throw new Error(`El motor de cálculo respondió con error (${response.status}).`);
  }

  return response.json();
}

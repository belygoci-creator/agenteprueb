/**
 * Traduce el resultado técnico del motor de cálculo a lenguaje simple para
 * el cliente final, siguiendo 1:1 la tabla de instrucciones-sistema.md §4.
 * Es determinístico a propósito (no se le pide a Claude que lo redacte):
 * mismo resultado técnico, mismo texto, siempre auditable.
 */

interface ResumenInput {
  moneda: string;
  aporteNecesario: number;
  aporteMaximoSostenible: number;
  diferencia: number;
  viable: boolean;
  etapa: "fondo_emergencia" | "deuda_cara" | "invertir";
  fondoEmergenciaMinimoMeses: number;
  fondoEmergenciaActualMeses: number;
  distribucion: { renta_fija: number; liquidez: number; renta_variable: number };
  alternativas?: {
    opcion_1_mantener_objetivo: { plazo_necesario_total_meses: number | null };
    opcion_2_mantener_plazo: { aporte_necesario: number };
    opcion_3_mantener_aporte: { objetivo_alcanzable: number };
  } | null;
}

function formatMoneda(valor: number, moneda: string) {
  if (!Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(valor);
}

export function construirResumenSimple(input: ResumenInput): string {
  const partes: string[] = [];

  if (input.etapa !== "invertir") {
    const motivo =
      input.etapa === "fondo_emergencia"
        ? `todavía no tenés completo el colchón para imprevistos (te alcanza para ${input.fondoEmergenciaActualMeses} meses, y conviene tener ${input.fondoEmergenciaMinimoMeses})`
        : "tenés una deuda cara que conviene resolver primero";
    partes.push(`Antes de meter plata en tu meta, conviene resolver esto: ${motivo}.`);
  }

  partes.push(
    `Para llegar en el plazo que me dijiste necesitarías guardar ${formatMoneda(
      input.aporteNecesario,
      input.moneda
    )} por mes. Con lo que me contaste de tus ingresos y gastos, hoy podés destinar hasta ${formatMoneda(
      input.aporteMaximoSostenible,
      input.moneda
    )} por mes sin ajustarte de más.`
  );

  if (input.viable) {
    partes.push("Con ese aporte, tu meta es alcanzable en el plazo que pensaste.");
  } else {
    partes.push(
      `Hay una diferencia de ${formatMoneda(
        input.diferencia,
        input.moneda
      )} por mes, así que con lo que podés aportar hoy no llegarías en ese plazo. Estas son las opciones para pensar:`
    );
    if (input.alternativas) {
      const op1 = input.alternativas.opcion_1_mantener_objetivo.plazo_necesario_total_meses;
      const op2 = input.alternativas.opcion_2_mantener_plazo.aporte_necesario;
      const op3 = input.alternativas.opcion_3_mantener_aporte.objetivo_alcanzable;
      if (op1 !== null && Number.isFinite(op1)) {
        partes.push(`- Con lo que podés aportar hoy, llegarías en ${Math.ceil(op1)} meses en vez del plazo original.`);
      } else {
        partes.push("- Con lo que podés aportar hoy ($0, porque primero hay que resolver lo anterior), no se puede estimar un plazo.");
      }
      partes.push(`- Para llegar en el plazo original, necesitarías aumentar el aporte a ${formatMoneda(op2, input.moneda)} por mes.`);
      partes.push(`- Manteniendo tu aporte de hoy y el plazo original, llegarías a ${formatMoneda(op3, input.moneda)}.`);
    }
    partes.push("Sin decirte cuál conviene: son opciones para charlar con tu asesor si hace falta ajustar algo.");
  }

  if (input.etapa === "invertir") {
    partes.push(
      `Te recomendamos distribuirlo así: ${input.distribucion.renta_fija}% en una parte más tranquila y previsible, ${input.distribucion.liquidez}% bien líquido para tener a mano, y ${input.distribucion.renta_variable}% en una parte que puede moverse más pero que a largo plazo suele rendir más.`
    );
  }

  partes.push(
    "Esto es una orientación automática en base a lo que me contaste. Tu asesor la va a revisar y puede ajustarla si hace falta."
  );

  return partes.join("\n\n");
}

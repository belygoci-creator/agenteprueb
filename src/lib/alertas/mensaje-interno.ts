import type { EventoDetectado, ReglaAlerta } from "./tipos.ts";

export type DireccionVariacion = "subida" | "caida";

/** Si el evento fue una subida o una caída, según el signo de la variación. */
export function direccionDe(evento: EventoDetectado): DireccionVariacion {
  return evento.variacion >= 0 ? "subida" : "caida";
}

/** Magnitud de la variación de un evento, formateada como "4.5%" (siempre positiva). */
export function formatearPorcentajeVariacion(evento: EventoDetectado): string {
  return `${(Math.abs(evento.variacion) * 100).toFixed(1)}%`;
}

/**
 * Redacta el mensaje interno (para el asesor) que describe un evento de
 * mercado. Solo describe el hecho observado — fecha, clase, dirección y
 * magnitud de la variación — nunca recomienda comprar ni vender ningún
 * activo o producto (regla fija de reglas-recomendacion.md §7, que también
 * aplica acá).
 *
 * Función pura: no consulta nada, arma el texto a partir de los datos que
 * recibe.
 */
export function mensajeInterno(regla: ReglaAlerta, evento: EventoDetectado): string {
  const porcentaje = formatearPorcentajeVariacion(evento);
  const umbralPorcentaje = (regla.umbral * 100).toFixed(0);
  const verbo = direccionDe(evento) === "subida" ? "subió" : "cayó";

  return (
    `La clase "${regla.clase}" ${verbo} ${porcentaje} entre ${evento.desde} y ` +
    `${evento.hasta} (ventana de ${regla.ventana_dias} días), superando el umbral de ` +
    `${umbralPorcentaje}% configurado para el perfil ${regla.perfil_riesgo}.`
  );
}

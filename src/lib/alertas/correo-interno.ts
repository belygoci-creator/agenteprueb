import { mensajeInterno } from "./mensaje-interno.ts";
import type { EventoDetectado, ReglaAlerta } from "./tipos.ts";

export interface CorreoInterno {
  asunto: string;
  texto: string;
}

/**
 * Arma el correo interno al asesor: qué cliente quedó afectado por qué
 * evento, reutilizando mensajeInterno (nunca recomienda comprar ni vender).
 * A diferencia de construirCorreoAlerta (para el cliente), es texto plano,
 * sin descargo legal -- es una notificación operativa, no una comunicación
 * al cliente final.
 *
 * Función pura: solo arma texto, no envía nada.
 */
export function construirCorreoInterno(
  regla: ReglaAlerta,
  evento: EventoDetectado,
  nombreCliente: string,
): CorreoInterno {
  const asunto = `Alerta: ${nombreCliente} — ${regla.clase} superó el umbral`;
  const texto = `Cliente afectado: ${nombreCliente}\n\n${mensajeInterno(regla, evento)}`;

  return { asunto, texto };
}

import { direccionDe, formatearPorcentajeVariacion, mensajeInterno } from "./mensaje-interno.ts";
import type { EventoDetectado, ReglaAlerta } from "./tipos.ts";

export interface CorreoAlerta {
  asunto: string;
  html: string;
}

const NOMBRE_PERFIL: Record<ReglaAlerta["perfil_riesgo"], string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  dinamico: "Dinámico",
};

/**
 * Arma el correo de aviso al cliente para un evento de mercado: porcentaje de
 * variación destacado visualmente (verde si subió, rojo si cayó), la
 * descripción del hecho (reutilizando `mensajeInterno`, nunca recomienda
 * comprar ni vender) y el descargo legal siempre presente.
 *
 * Función pura: solo arma texto/HTML a partir de los datos que recibe, no
 * envía nada (el envío vive en supabase/functions/revision-diaria).
 */
export function construirCorreoAlerta(
  regla: ReglaAlerta,
  evento: EventoDetectado,
  nombreCliente: string,
): CorreoAlerta {
  const porcentaje = formatearPorcentajeVariacion(evento);
  const descripcion = mensajeInterno(regla, evento);
  const esSubida = direccionDe(evento) === "subida";

  const verbo = esSubida ? "subió" : "cayó";
  const signo = esSubida ? "+" : "−";
  const colorFuerte = esSubida ? "#15803d" : "#b91c1c";
  const colorSuave = esSubida ? "#f0fdf4" : "#fef2f2";
  const colorBorde = esSubida ? "#bbf7d0" : "#fecaca";
  const colorTexto = esSubida ? "#166534" : "#7f1d1d";

  const asunto = `Aviso de mercado: ${regla.clase} ${verbo} ${porcentaje}`;

  const html = `
    <div style="background-color: #f3f4f6; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <tr>
          <td style="background-color: #0f172a; padding: 20px 28px;">
            <span style="color: #ffffff; font-size: 15px; font-weight: 600; letter-spacing: 0.02em;">
              Asesor Financiero
            </span>
            <div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">
              Aviso automático de mercado
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px;">
            <p style="font-size: 15px; color: #1f2933; margin: 0 0 4px;">
              Hola <strong>${escapeHtml(nombreCliente)}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 20px;">
              Tu asesor configuró un aviso automático de mercado y se activó hoy.
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${colorSuave}; border: 1px solid ${colorBorde}; border-radius: 10px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 20px; text-align: center;">
                  <div style="font-size: 38px; font-weight: 700; color: ${colorFuerte}; line-height: 1;">
                    ${signo}${porcentaje}
                  </div>
                  <div style="font-size: 13px; color: ${colorTexto}; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                    ${verbo} en ${escapeHtml(regla.clase)}
                  </div>
                </td>
              </tr>
            </table>

            <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 20px;">
              ${escapeHtml(descripcion)}
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px;">
              <tr>
                <td style="padding: 10px 0; font-size: 12px; color: #6b7280;">Clase de activo</td>
                <td style="padding: 10px 0; font-size: 12px; color: #111827; text-align: right; font-weight: 600;">${escapeHtml(regla.clase)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-size: 12px; color: #6b7280; border-top: 1px solid #f3f4f6;">Tu perfil de riesgo</td>
                <td style="padding: 10px 0; font-size: 12px; color: #111827; text-align: right; font-weight: 600; border-top: 1px solid #f3f4f6;">${NOMBRE_PERFIL[regla.perfil_riesgo]}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-size: 12px; color: #6b7280; border-top: 1px solid #f3f4f6;">Período observado</td>
                <td style="padding: 10px 0; font-size: 12px; color: #111827; text-align: right; font-weight: 600; border-top: 1px solid #f3f4f6;">${evento.desde} — ${evento.hasta}</td>
              </tr>
            </table>

            <p style="font-size: 11px; line-height: 1.6; color: #9ca3af; margin: 0;">
              Este correo es una notificación automática de mercado, generada a partir de reglas
              configuradas por tu asesor. No constituye asesoramiento financiero ni una
              recomendación de compra, venta o cualquier otra operación sobre ningún activo o
              producto concreto. Tu asesor revisa cada aviso y se pondrá en contacto si
              corresponde ajustar algo.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `.trim();

  return { asunto, html };
}

function escapeHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

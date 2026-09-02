// Revisión diaria de mercado, como Supabase Edge Function (Deno).
//
// La dispara pg_cron con un POST HTTP -- no un usuario logueado -- así que se
// protege con un secreto propio (CRON_SECRET) en la cabecera Authorization,
// no con verificación de JWT de Supabase Auth (ver supabase/config.toml,
// `verify_jwt = false` para esta función).
//
// 1. Baja los cierres del S&P 500 de Yahoo Finance (API abierta, sin clave) y los agrega al
//    historial en observaciones_mercado (sin pisar fechas ya guardadas). La detección usa ese
//    historial persistido, no el fetch crudo del día.
// 2. Lee reglas_alerta, clientes y posiciones de Supabase.
// 3. Decide eventos/clientes afectados con la lógica pura de src/lib/alertas
//    (detectarEventos, clientesAfectados) -- import relativo, mismo código que usa el resto
//    de la app, no se reimplementa nada acá.
// 4. Registra eventos_mercado y alertas apoyándose en sus columnas UNIQUE, así
//    disparar el cron más de una vez el mismo día no duplica nada.
// 5. Por cada alerta nueva, avisa por correo vía Composio (Gmail ya conectado):
//    siempre al asesor, y al cliente si tiene avisar_cliente = true.
// 6. Devuelve (y loguea) un resumen en JSON.
//
// Variables de entorno (`supabase secrets set NOMBRE=valor`; SUPABASE_URL y
// SUPABASE_SERVICE_ROLE_KEY ya vienen inyectadas por la plataforma):
//   CRON_SECRET, COMPOSIO_API_KEY, COMPOSIO_GMAIL_ACCOUNT_ID,
//   COMPOSIO_GMAIL_ENTITY_ID, ASESOR_EMAIL_PERMITIDO

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  clientesAfectados,
  construirCorreoAlerta,
  construirCorreoInterno,
  detectarEventos,
} from "../../../src/lib/alertas/index.ts";
import type {
  ClienteCandidato,
  EventoDetectado,
  Posicion,
  ReglaAlerta,
} from "../../../src/lib/alertas/index.ts";

const YAHOO_SP500_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=3mo";

const COMPOSIO_EXECUTE_URL = "https://backend.composio.dev/api/v3.1/tools/execute/GMAIL_SEND_EMAIL";

const CLASE_SP500 = "renta_variable";

interface ResumenCorrida {
  fecha: string;
  observaciones_bajadas_yahoo: number;
  observaciones_nuevas_guardadas: number;
  observaciones_en_historial: number;
  reglas_evaluadas: number;
  reglas_sin_datos: string[];
  eventos_detectados: number;
  alertas_nuevas: number;
  correos_enviados: number;
  correos_fallidos: number;
  errores: string[];
}

function crearAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

Deno.serve(async (req) => {
  // Protección con secreto propio -- pg_cron manda un POST con este header,
  // no un JWT de Supabase Auth (no hay usuario logueado disparando esto).
  const secretoEsperado = Deno.env.get("CRON_SECRET");
  const autorizacion = req.headers.get("Authorization");
  if (!secretoEsperado || autorizacion !== `Bearer ${secretoEsperado}`) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resumen = await ejecutarRevision();
  return new Response(JSON.stringify(resumen, null, 2), {
    status: resumen.errores.some((e) => e.startsWith("BLOQUEANTE:")) ? 500 : 200,
    headers: { "Content-Type": "application/json" },
  });
});

async function ejecutarRevision(): Promise<ResumenCorrida> {
  const resumen: ResumenCorrida = {
    fecha: new Date().toISOString(),
    observaciones_bajadas_yahoo: 0,
    observaciones_nuevas_guardadas: 0,
    observaciones_en_historial: 0,
    reglas_evaluadas: 0,
    reglas_sin_datos: [],
    eventos_detectados: 0,
    alertas_nuevas: 0,
    correos_enviados: 0,
    correos_fallidos: 0,
    errores: [],
  };

  const supabase = crearAdminClient();
  const composioListo = tieneConfigComposio();
  if (!composioListo) {
    resumen.errores.push(
      "COMPOSIO_API_KEY / COMPOSIO_GMAIL_ACCOUNT_ID / COMPOSIO_GMAIL_ENTITY_ID no configurados: no se enviará ningún correo, solo se registrarán las alertas.",
    );
  }

  // 1. Cierres del S&P 500.
  const cierres = await obtenerCierresSP500();
  if (!cierres) {
    resumen.errores.push("BLOQUEANTE: no se pudo obtener los cierres del S&P 500 desde Yahoo Finance.");
    return resumen;
  }
  resumen.observaciones_bajadas_yahoo = cierres.length;

  // ignoreDuplicates: true -- un cierre de bolsa ya registrado no cambia
  // retroactivamente, así que solo se agregan fechas nuevas.
  const { data: observacionesInsertadas, error: errorObservaciones } = await supabase
    .from("observaciones_mercado")
    .upsert(
      cierres.map(({ fecha, valor }) => ({ clase: CLASE_SP500, fecha, valor })),
      { onConflict: "clase,fecha", ignoreDuplicates: true },
    )
    .select("id");
  if (errorObservaciones) {
    resumen.errores.push(`No se pudieron guardar las observaciones: ${errorObservaciones.message}`);
  }
  resumen.observaciones_nuevas_guardadas = observacionesInsertadas?.length ?? 0;

  // La detección usa el historial persistido (no el fetch crudo de Yahoo).
  const { data: observacionesSP500, error: errorLecturaObservaciones } = await supabase
    .from("observaciones_mercado")
    .select("*")
    .eq("clase", CLASE_SP500)
    .order("fecha", { ascending: true });
  if (errorLecturaObservaciones || !observacionesSP500) {
    resumen.errores.push(
      `BLOQUEANTE: no se pudo leer el historial de observaciones: ${errorLecturaObservaciones?.message ?? "sin datos"}`,
    );
    return resumen;
  }
  resumen.observaciones_en_historial = observacionesSP500.length;

  // 2. Reglas, clientes y posiciones.
  const { data: reglas, error: errorReglas } = await supabase.from("reglas_alerta").select("*");
  if (errorReglas || !reglas) {
    resumen.errores.push(`BLOQUEANTE: no se pudieron leer las reglas: ${errorReglas?.message ?? "sin datos"}`);
    return resumen;
  }
  resumen.reglas_evaluadas = reglas.length;

  const { data: posiciones, error: errorPosiciones } = await supabase
    .from("posiciones")
    .select("*");
  if (errorPosiciones) {
    resumen.errores.push(`No se pudieron leer las posiciones: ${errorPosiciones.message}`);
  }

  const candidatos = await construirClientesCandidatos(supabase);
  if (candidatos.error) {
    resumen.errores.push(candidatos.error);
  }

  const { data: clientesEmail, error: errorClientesEmail } = await supabase
    .from("clientes")
    .select("id, nombre, email, avisar_cliente");
  if (errorClientesEmail) {
    resumen.errores.push(`No se pudieron leer los clientes: ${errorClientesEmail.message}`);
  }
  const clientesPorId = new Map((clientesEmail ?? []).map((c) => [c.id, c]));

  const emailAsesor = Deno.env.get("ASESOR_EMAIL_PERMITIDO");
  if (!emailAsesor) {
    resumen.errores.push("ASESOR_EMAIL_PERMITIDO no configurado: no se avisará al asesor.");
  }

  // 3-5. Por cada regla: detectar, registrar y avisar.
  for (const regla of reglas as ReglaAlerta[]) {
    if (regla.clase !== CLASE_SP500) {
      resumen.reglas_sin_datos.push(regla.id);
      continue;
    }

    const eventosDetectados = detectarEventos(regla, observacionesSP500);

    for (const eventoDetectado of eventosDetectados) {
      resumen.eventos_detectados += 1;

      const eventoRegistrado = await registrarEvento(supabase, eventoDetectado);
      if (!eventoRegistrado) {
        resumen.errores.push(
          `No se pudo registrar el evento de la regla ${regla.id} (hasta ${eventoDetectado.hasta}).`,
        );
        continue;
      }

      const afectados = clientesAfectados(regla, (posiciones as Posicion[]) ?? [], candidatos.data);
      if (afectados.length === 0) continue;

      const alertasNuevas = await registrarAlertas(supabase, eventoRegistrado.id, afectados);
      resumen.alertas_nuevas += alertasNuevas.length;

      for (const alerta of alertasNuevas) {
        const cliente = clientesPorId.get(alerta.cliente_id);
        const nombreCliente = cliente?.nombre ?? alerta.cliente_id;

        if (emailAsesor) {
          const { asunto, texto } = construirCorreoInterno(regla, eventoDetectado, nombreCliente);
          await contabilizarEnvio(
            resumen,
            composioListo,
            enviarCorreoViaComposio(emailAsesor, asunto, texto, false),
          );
        }

        if (!cliente?.avisar_cliente) continue;
        if (!cliente.email) {
          resumen.errores.push(`Cliente ${cliente.id} tiene avisar_cliente=true pero sin email.`);
          continue;
        }

        const { asunto, html } = construirCorreoAlerta(regla, eventoDetectado, nombreCliente);
        await contabilizarEnvio(
          resumen,
          composioListo,
          enviarCorreoViaComposio(cliente.email, asunto, html, true),
        );
      }
    }
  }

  return resumen;
}

async function contabilizarEnvio(
  resumen: ResumenCorrida,
  composioListo: boolean,
  envio: Promise<boolean>,
): Promise<void> {
  const enviado = await envio;
  if (enviado) {
    resumen.correos_enviados += 1;
  } else if (composioListo) {
    resumen.correos_fallidos += 1;
  }
}

async function obtenerCierresSP500(): Promise<{ fecha: string; valor: number }[] | null> {
  try {
    const response = await fetch(YAHOO_SP500_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; asesor-financiero/1.0)" },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const resultado = data?.chart?.result?.[0];
    const timestamps: number[] | undefined = resultado?.timestamp;
    const cierres: Array<number | null> | undefined = resultado?.indicators?.quote?.[0]?.close;

    if (!timestamps || !cierres) return null;

    const observaciones = timestamps
      .map((ts, i) => ({
        fecha: new Date(ts * 1000).toISOString().slice(0, 10),
        valor: cierres[i],
      }))
      .filter((o): o is { fecha: string; valor: number } => typeof o.valor === "number");

    return observaciones.length > 0 ? observaciones : null;
  } catch {
    return null;
  }
}

async function construirClientesCandidatos(
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<{ data: ClienteCandidato[]; error: string | null }> {
  const [{ data: clientes, error: errorClientes }, { data: fichas, error: errorFichas }, { data: diagnosticos, error: errorDiagnosticos }] =
    await Promise.all([
      supabase.from("clientes").select("id, suspendido"),
      supabase
        .from("fichas")
        .select("id, cliente_id, perfil_riesgo_declarado, created_at")
        .order("created_at", { ascending: true }),
      supabase.from("diagnosticos").select("id, ficha_id"),
    ]);

  const error =
    errorClientes?.message ?? errorFichas?.message ?? errorDiagnosticos?.message ?? null;
  if (error || !clientes) {
    return { data: [], error: error ? `No se pudieron armar los candidatos: ${error}` : null };
  }

  const perfilRiesgoPorCliente = new Map<string, string>();
  const fichaIdsPorCliente = new Map<string, Set<string>>();
  // deno-lint-ignore no-explicit-any
  for (const ficha of (fichas ?? []) as any[]) {
    perfilRiesgoPorCliente.set(ficha.cliente_id, ficha.perfil_riesgo_declarado);
    if (!fichaIdsPorCliente.has(ficha.cliente_id)) {
      fichaIdsPorCliente.set(ficha.cliente_id, new Set());
    }
    fichaIdsPorCliente.get(ficha.cliente_id)!.add(ficha.id);
  }

  // deno-lint-ignore no-explicit-any
  const fichaIdsConDiagnostico = new Set((diagnosticos ?? []).map((d: any) => d.ficha_id));
  const clientesConAnalisis = new Set<string>();
  for (const [clienteId, fichaIds] of fichaIdsPorCliente) {
    for (const fichaId of fichaIds) {
      if (fichaIdsConDiagnostico.has(fichaId)) {
        clientesConAnalisis.add(clienteId);
        break;
      }
    }
  }

  // deno-lint-ignore no-explicit-any
  const data: ClienteCandidato[] = (clientes as any[]).map((cliente) => ({
    cliente_id: cliente.id,
    suspendido: cliente.suspendido,
    tiene_analisis: clientesConAnalisis.has(cliente.id),
    perfil_riesgo: (perfilRiesgoPorCliente.get(cliente.id) as ClienteCandidato["perfil_riesgo"]) ?? null,
  }));

  return { data, error: null };
}

async function registrarEvento(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  evento: EventoDetectado,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("eventos_mercado")
    .upsert(evento, { onConflict: "regla_id,hasta" })
    .select("id")
    .single();

  if (error || !data) return null;
  return data;
}

async function registrarAlertas(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  eventoId: string,
  afectados: ClienteCandidato[],
): Promise<{ id: string; cliente_id: string }[]> {
  if (afectados.length === 0) return [];

  const filas = afectados.map((c) => ({
    evento_id: eventoId,
    cliente_id: c.cliente_id,
    estado: "pendiente" as const,
  }));
  const { data, error } = await supabase
    .from("alertas")
    .upsert(filas, { onConflict: "evento_id,cliente_id", ignoreDuplicates: true })
    .select("id, cliente_id");

  if (error || !data) return [];
  return data;
}

function tieneConfigComposio(): boolean {
  return Boolean(
    Deno.env.get("COMPOSIO_API_KEY") &&
      Deno.env.get("COMPOSIO_GMAIL_ACCOUNT_ID") &&
      Deno.env.get("COMPOSIO_GMAIL_ENTITY_ID"),
  );
}

async function enviarCorreoViaComposio(
  destinatario: string,
  asunto: string,
  cuerpo: string,
  esHtml: boolean,
): Promise<boolean> {
  const apiKey = Deno.env.get("COMPOSIO_API_KEY");
  const connectedAccountId = Deno.env.get("COMPOSIO_GMAIL_ACCOUNT_ID");
  const entityId = Deno.env.get("COMPOSIO_GMAIL_ENTITY_ID");
  if (!apiKey || !connectedAccountId || !entityId) return false;

  try {
    const response = await fetch(COMPOSIO_EXECUTE_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        connectedAccountId,
        entity_id: entityId,
        version: "latest",
        arguments: {
          recipient_email: destinatario,
          subject: asunto,
          body: cuerpo,
          is_html: esHtml,
        },
      }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data?.successful !== false && data?.error == null;
  } catch {
    return false;
  }
}

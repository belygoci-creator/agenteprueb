import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";

import { anthropic, CLAUDE_MODEL } from "@/lib/claude/client";
import { ENTREVISTA_SYSTEM_PROMPT } from "@/lib/claude/system-prompt";
import { GUARDAR_FICHA_TOOL, type FichaTool } from "@/lib/claude/tools";
import { camposFaltantes } from "@/lib/claude/validar-ficha";
import { createAdminClient } from "@/lib/supabase/admin";
import { procesarCierreEntrevista } from "@/lib/entrevista/procesar-cierre";

interface EntrevistaMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_INTENTOS_CIERRE = 3;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token: string | undefined = body?.token;
  const messages: EntrevistaMessage[] = Array.isArray(body?.messages) ? body.messages : [];

  if (!token) {
    return NextResponse.json({ type: "error", motivo: "Falta el token." }, { status: 400 });
  }

  const validacion = await validarToken(token);
  if (!validacion.valido) {
    return NextResponse.json({ type: "error", motivo: validacion.motivo }, { status: 400 });
  }

  let historial: Anthropic.MessageParam[] =
    messages.length > 0
      ? messages.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: "Hola, estoy listo/a para empezar." }];

  for (let intento = 0; intento < MAX_INTENTOS_CIERRE; intento++) {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: ENTREVISTA_SYSTEM_PROMPT,
      tools: [GUARDAR_FICHA_TOOL],
      messages: historial,
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "guardar_ficha"
    );

    if (!toolUse) {
      const texto = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      const nuevoHistorial: EntrevistaMessage[] = [
        ...messages,
        ...(messages.length === 0 ? [{ role: "user" as const, content: "Hola, estoy listo/a para empezar." }] : []),
        { role: "assistant", content: texto },
      ];

      return NextResponse.json({ type: "pregunta", texto, messages: nuevoHistorial });
    }

    // Nunca confiamos en que Claude mandó todos los campos requeridos: la
    // API no valida el schema de la tool por nosotros. Si falta algo, se lo
    // devolvemos como error de la tool para que retome la pregunta, en vez
    // de dejar que el insert falle con un error crudo de Postgres.
    const faltantes = camposFaltantes(toolUse.input as Record<string, unknown>);

    if (faltantes.length === 0) {
      try {
        const resultado = await procesarCierreEntrevista(token, toolUse.input as FichaTool);
        return NextResponse.json(resultado);
      } catch (error) {
        return NextResponse.json(
          { type: "error", motivo: error instanceof Error ? error.message : "Error al procesar el cierre." },
          { status: 500 }
        );
      }
    }

    historial = [
      ...historial,
      { role: "assistant", content: response.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: `Todavía faltan estos datos, no se guardó la ficha: ${faltantes.join(", ")}. Seguí la entrevista preguntando por lo que falta, una pregunta por vez.`,
          },
        ],
      },
    ];
  }

  return NextResponse.json(
    { type: "error", motivo: "No se pudo completar la entrevista después de varios intentos." },
    { status: 500 }
  );
}

async function validarToken(token: string): Promise<{ valido: true } | { valido: false; motivo: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("entrevista_tokens")
    .select("expires_at, used_at")
    .eq("token", token)
    .single();

  if (error || !data) {
    return { valido: false, motivo: "Enlace inválido." };
  }
  if (data.used_at) {
    return { valido: false, motivo: "Este enlace ya fue usado." };
  }
  if (new Date(data.expires_at) < new Date()) {
    return { valido: false, motivo: "Este enlace venció." };
  }
  return { valido: true };
}

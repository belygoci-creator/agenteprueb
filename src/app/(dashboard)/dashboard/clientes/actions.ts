"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { guardarFichaManual } from "@/lib/clientes/editar-ficha";
import type { FichaTool } from "@/lib/claude/tools";

const TOKEN_VIGENCIA_DIAS = 7;

export async function crearCliente(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!nombre) {
    throw new Error("El nombre del cliente es obligatorio.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_VIGENCIA_DIAS);

  // Cliente + token de entrevista en una sola transacción (ver
  // supabase/migrations/0001_initial_schema.sql -> crear_cliente_con_token),
  // para no dejar un cliente sin enlace si algo falla a mitad de camino.
  const { data: cliente, error } = await supabase
    .rpc("crear_cliente_con_token", {
      p_nombre: nombre,
      p_email: email || null,
      p_token: token,
      p_expires_at: expiresAt.toISOString(),
    })
    .single();

  if (error || !cliente) {
    throw new Error(error?.message ?? "No se pudo crear el cliente.");
  }

  redirect(`/dashboard/clientes/${(cliente as { id: string }).id}`);
}

/** Genera un nuevo enlace de entrevista para un cliente ya existente (reentrevista, FLOW-01 extendido). */
export async function generarNuevoEnlace(clienteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_VIGENCIA_DIAS);

  const { error } = await supabase.rpc("generar_enlace_entrevista", {
    p_cliente_id: clienteId,
    p_token: token,
    p_expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/clientes/${clienteId}`);
  return { token, expiresAt: expiresAt.toISOString() };
}

/** Guarda una corrección manual de la ficha del cliente (nueva versión, ver docs/data-model.md). */
export async function guardarEdicionFicha(clienteId: string, formData: FormData) {
  const num = (campo: string) => {
    const valor = formData.get(campo);
    if (valor === null || valor === "") return null;
    return Number(valor);
  };
  const texto = (campo: string) => {
    const valor = String(formData.get(campo) ?? "").trim();
    return valor || null;
  };

  const ficha: FichaTool = {
    edad: num("edad") ?? 0,
    dependientes: texto("dependientes") ?? "",
    situacion_laboral: texto("situacion_laboral") ?? "",
    estabilidad_laboral: (formData.get("estabilidad_laboral") as "estable" | "inestable") ?? "inestable",
    objetivo_descripcion: texto("objetivo_descripcion") ?? "",
    objetivo_monto: num("objetivo_monto") ?? 0,
    objetivo_moneda: texto("objetivo_moneda") ?? "ARS",
    objetivo_plazo_meses: num("objetivo_plazo_meses") ?? 0,
    objetivo_prioridad: texto("objetivo_prioridad"),
    ingresos_netos_mensuales: num("ingresos_netos_mensuales") ?? 0,
    ingresos_estimado: formData.get("ingresos_estimado") === "on",
    gastos_fijos_mensuales: num("gastos_fijos_mensuales") ?? 0,
    gastos_estimado: formData.get("gastos_estimado") === "on",
    deuda_saldo: num("deuda_saldo"),
    deuda_cuota_mensual: num("deuda_cuota_mensual"),
    deuda_tasa_interes: num("deuda_tasa_interes"),
    deuda_estimado: formData.get("deuda_estimado") === "on",
    ahorro_actual_monto: num("ahorro_actual_monto") ?? 0,
    ahorro_actual_liquidez: texto("ahorro_actual_liquidez"),
    ahorro_estimado: formData.get("ahorro_estimado") === "on",
    fondo_emergencia_meses: num("fondo_emergencia_meses") ?? 0,
    perfil_riesgo_declarado:
      (formData.get("perfil_riesgo_declarado") as "conservador" | "moderado" | "dinamico") ?? "moderado",
    notas_cualitativas: texto("notas_cualitativas"),
  };

  await guardarFichaManual(clienteId, ficha);

  redirect(`/dashboard/clientes/${clienteId}`);
}

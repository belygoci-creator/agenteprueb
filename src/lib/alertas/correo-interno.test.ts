import { describe, expect, it } from "vitest";
import { construirCorreoInterno } from "./correo-interno";
import type { EventoDetectado, ReglaAlerta } from "./tipos";

const regla: ReglaAlerta = {
  id: "regla-1",
  clase: "renta_variable",
  perfil_riesgo: "conservador",
  ventana_dias: 5,
  umbral: 0.03,
  created_at: "2026-08-26T00:00:00Z",
};

const evento: EventoDetectado = {
  regla_id: "regla-1",
  desde: "2026-08-01",
  hasta: "2026-08-05",
  variacion: -0.045,
};

describe("construirCorreoInterno", () => {
  it("identifica al cliente afectado y describe el hecho", () => {
    const correo = construirCorreoInterno(regla, evento, "Maribel");

    expect(correo.asunto).toContain("Maribel");
    expect(correo.texto).toContain("Maribel");
    expect(correo.texto).toContain("4.5%");
  });

  it("nunca recomienda comprar ni vender", () => {
    const correo = construirCorreoInterno(regla, evento, "Maribel");

    expect(correo.texto.toLowerCase()).not.toMatch(/compr|vend|invert[ií]|adquir/);
  });
});

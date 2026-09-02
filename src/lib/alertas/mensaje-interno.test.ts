import { describe, expect, it } from "vitest";
import { direccionDe, formatearPorcentajeVariacion, mensajeInterno } from "./mensaje-interno.ts";
import type { EventoDetectado, ReglaAlerta } from "./tipos.ts";

const regla: ReglaAlerta = {
  id: "regla-1",
  clase: "renta_variable",
  perfil_riesgo: "conservador",
  ventana_dias: 5,
  umbral: 0.03,
  created_at: "2026-08-26T00:00:00Z",
};

const eventoCaida: EventoDetectado = {
  regla_id: "regla-1",
  desde: "2026-08-01",
  hasta: "2026-08-05",
  variacion: -0.045,
};

const eventoSubida: EventoDetectado = {
  regla_id: "regla-1",
  desde: "2026-08-01",
  hasta: "2026-08-05",
  variacion: 0.052,
};

describe("direccionDe", () => {
  it("identifica una caída", () => {
    expect(direccionDe(eventoCaida)).toBe("caida");
  });

  it("identifica una subida", () => {
    expect(direccionDe(eventoSubida)).toBe("subida");
  });
});

describe("formatearPorcentajeVariacion", () => {
  it("siempre devuelve la magnitud positiva", () => {
    expect(formatearPorcentajeVariacion(eventoCaida)).toBe("4.5%");
    expect(formatearPorcentajeVariacion(eventoSubida)).toBe("5.2%");
  });
});

describe("mensajeInterno", () => {
  it("describe una caída con el verbo correcto", () => {
    const mensaje = mensajeInterno(regla, eventoCaida);

    expect(mensaje).toContain("cayó 4.5%");
    expect(mensaje).toContain("2026-08-01");
    expect(mensaje).toContain("2026-08-05");
  });

  it("describe una subida con el verbo correcto", () => {
    const mensaje = mensajeInterno(regla, eventoSubida);

    expect(mensaje).toContain("subió 5.2%");
  });

  it("nunca recomienda comprar ni vender", () => {
    for (const evento of [eventoCaida, eventoSubida]) {
      const mensaje = mensajeInterno(regla, evento).toLowerCase();
      expect(mensaje).not.toMatch(/compr|vend|invert[ií]|adquir/);
    }
  });
});

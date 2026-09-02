import { describe, expect, it } from "vitest";
import { detectarEventos } from "./detectar-eventos";
import type { ObservacionMercado, ReglaAlerta } from "./tipos";

const regla: ReglaAlerta = {
  id: "regla-1",
  clase: "renta_variable",
  perfil_riesgo: "conservador",
  ventana_dias: 5,
  umbral: 0.03,
  created_at: "2026-08-26T00:00:00Z",
};

function obs(fecha: string, valor: number, clase = "renta_variable"): ObservacionMercado {
  return { id: `${clase}-${fecha}`, clase, fecha, valor, created_at: `${fecha}T00:00:00Z` };
}

describe("detectarEventos", () => {
  it("genera un evento cuando la caída llega exactamente al umbral", () => {
    const observaciones = [
      obs("2026-08-01", 100),
      obs("2026-08-02", 99),
      obs("2026-08-03", 98),
      obs("2026-08-04", 97.5),
      obs("2026-08-05", 97),
    ];

    const eventos = detectarEventos(regla, observaciones);

    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      regla_id: "regla-1",
      desde: "2026-08-01",
      hasta: "2026-08-05",
    });
    expect(eventos[0].variacion).toBeCloseTo(-0.03, 5);
  });

  it("genera un evento cuando la caída supera el umbral", () => {
    const observaciones = [
      obs("2026-08-01", 100),
      obs("2026-08-02", 95),
      obs("2026-08-03", 92),
      obs("2026-08-04", 91),
      obs("2026-08-05", 90),
    ];

    const eventos = detectarEventos(regla, observaciones);

    expect(eventos).toHaveLength(1);
    expect(eventos[0].variacion).toBeCloseTo(-0.1, 5);
  });

  it("no genera evento si la caída no llega al umbral", () => {
    const observaciones = [
      obs("2026-08-01", 100),
      obs("2026-08-02", 99.5),
      obs("2026-08-03", 99),
      obs("2026-08-04", 98.8),
      obs("2026-08-05", 98.5),
    ];

    expect(detectarEventos(regla, observaciones)).toEqual([]);
  });

  it("no genera evento si la subida no llega al umbral", () => {
    const observaciones = [
      obs("2026-08-01", 100),
      obs("2026-08-02", 100.5),
      obs("2026-08-03", 101),
      obs("2026-08-04", 101.5),
      obs("2026-08-05", 102),
    ];

    expect(detectarEventos(regla, observaciones)).toEqual([]);
  });

  it("genera un evento (con variación positiva) cuando la subida supera el umbral", () => {
    const observaciones = [
      obs("2026-08-01", 100),
      obs("2026-08-02", 101),
      obs("2026-08-03", 103),
      obs("2026-08-04", 104),
      obs("2026-08-05", 105),
    ];

    const eventos = detectarEventos(regla, observaciones);

    expect(eventos).toHaveLength(1);
    expect(eventos[0].variacion).toBeCloseTo(0.05, 5);
  });

  it("no genera evento si hay menos observaciones que la ventana de la regla", () => {
    const observaciones = [obs("2026-08-04", 97), obs("2026-08-05", 90)];

    expect(detectarEventos(regla, observaciones)).toEqual([]);
  });

  it("ignora observaciones de otras clases", () => {
    const observaciones = [
      obs("2026-08-01", 100),
      obs("2026-08-02", 95, "renta_fija"),
      obs("2026-08-02", 99),
      obs("2026-08-03", 98),
      obs("2026-08-04", 97.5),
      obs("2026-08-05", 97),
    ];

    const eventos = detectarEventos(regla, observaciones);

    expect(eventos).toHaveLength(1);
    expect(eventos[0].desde).toBe("2026-08-01");
  });

  it("usa la ventana más reciente cuando hay más observaciones que ventana_dias", () => {
    const observaciones = [
      obs("2026-07-01", 50), // fuera de la ventana, no debería influir
      obs("2026-08-01", 100),
      obs("2026-08-02", 99),
      obs("2026-08-03", 98),
      obs("2026-08-04", 97.5),
      obs("2026-08-05", 97),
    ];

    const eventos = detectarEventos(regla, observaciones);

    expect(eventos).toHaveLength(1);
    expect(eventos[0].desde).toBe("2026-08-01");
    expect(eventos[0].hasta).toBe("2026-08-05");
  });
});

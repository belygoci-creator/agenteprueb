import { describe, expect, it } from "vitest";
import { construirCorreoAlerta } from "./correo-alerta";
import type { EventoDetectado, ReglaAlerta } from "./tipos";

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
  variacion: 0.045,
};

describe("construirCorreoAlerta", () => {
  it("destaca el porcentaje de caída, en rojo, con signo negativo", () => {
    const correo = construirCorreoAlerta(regla, eventoCaida, "Maribel");

    expect(correo.asunto).toContain("cayó 4.5%");
    expect(correo.html).toContain("−4.5%");
    expect(correo.html).toContain("#b91c1c");
    expect(correo.html).toContain("Maribel");
    expect(correo.html).toContain("renta_variable");
  });

  it("destaca el porcentaje de subida, en verde, con signo positivo", () => {
    const correo = construirCorreoAlerta(regla, eventoSubida, "Maribel");

    expect(correo.asunto).toContain("subió 4.5%");
    expect(correo.html).toContain("+4.5%");
    expect(correo.html).toContain("#15803d");
  });

  it("siempre incluye el descargo legal", () => {
    const correo = construirCorreoAlerta(regla, eventoCaida, "Maribel");

    expect(correo.html).toMatch(/no constituye asesoramiento financiero/i);
    expect(correo.html).toMatch(/recomendaci[oó]n[\s\S]*de compra/i);
  });

  it("escapa el nombre del cliente para evitar HTML injection", () => {
    const correo = construirCorreoAlerta(regla, eventoCaida, "<script>alert(1)</script>");

    expect(correo.html).not.toContain("<script>");
    expect(correo.html).toContain("&lt;script&gt;");
  });
});

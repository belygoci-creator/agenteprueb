import { describe, expect, it } from "vitest";
import { clientesAfectados } from "./clientes-afectados";
import type { ClienteCandidato, Posicion, ReglaAlerta } from "./tipos";

const regla: ReglaAlerta = {
  id: "regla-1",
  clase: "renta_variable",
  perfil_riesgo: "conservador",
  ventana_dias: 5,
  umbral: 0.03,
  created_at: "2026-08-26T00:00:00Z",
};

function posicion(cliente_id: string, clase = "renta_variable"): Posicion {
  return {
    id: `pos-${cliente_id}`,
    cliente_id,
    clase,
    valor_eur: 1000,
    fecha: "2026-08-26",
    created_at: "2026-08-26T00:00:00Z",
  };
}

function cliente(overrides: Partial<ClienteCandidato> & { cliente_id: string }): ClienteCandidato {
  return {
    suspendido: false,
    tiene_analisis: true,
    perfil_riesgo: "conservador",
    ...overrides,
  };
}

describe("clientesAfectados", () => {
  it("incluye al cliente que tiene posición, no está suspendido, tiene análisis y coincide el perfil", () => {
    const posiciones = [posicion("cliente-1")];
    const candidatos = [cliente({ cliente_id: "cliente-1" })];

    const resultado = clientesAfectados(regla, posiciones, candidatos);

    expect(resultado.map((c) => c.cliente_id)).toEqual(["cliente-1"]);
  });

  it("excluye a un cliente suspendido", () => {
    const posiciones = [posicion("cliente-1")];
    const candidatos = [cliente({ cliente_id: "cliente-1", suspendido: true })];

    expect(clientesAfectados(regla, posiciones, candidatos)).toEqual([]);
  });

  it("excluye a un cliente sin análisis", () => {
    const posiciones = [posicion("cliente-1")];
    const candidatos = [cliente({ cliente_id: "cliente-1", tiene_analisis: false })];

    expect(clientesAfectados(regla, posiciones, candidatos)).toEqual([]);
  });

  it("excluye a un cliente con perfil de riesgo distinto al de la regla", () => {
    const posiciones = [posicion("cliente-1")];
    const candidatos = [cliente({ cliente_id: "cliente-1", perfil_riesgo: "dinamico" })];

    expect(clientesAfectados(regla, posiciones, candidatos)).toEqual([]);
  });

  it("excluye a un cliente sin perfil de riesgo declarado", () => {
    const posiciones = [posicion("cliente-1")];
    const candidatos = [cliente({ cliente_id: "cliente-1", perfil_riesgo: null })];

    expect(clientesAfectados(regla, posiciones, candidatos)).toEqual([]);
  });

  it("excluye a un cliente elegible que no tiene posición en la clase de la regla", () => {
    const posiciones = [posicion("cliente-1", "renta_fija")];
    const candidatos = [cliente({ cliente_id: "cliente-1" })];

    expect(clientesAfectados(regla, posiciones, candidatos)).toEqual([]);
  });

  it("aplica las tres exclusiones de forma independiente sobre varios clientes", () => {
    const posiciones = [
      posicion("suspendido"),
      posicion("sin-analisis"),
      posicion("perfil-distinto"),
      posicion("elegible"),
    ];
    const candidatos = [
      cliente({ cliente_id: "suspendido", suspendido: true }),
      cliente({ cliente_id: "sin-analisis", tiene_analisis: false }),
      cliente({ cliente_id: "perfil-distinto", perfil_riesgo: "moderado" }),
      cliente({ cliente_id: "elegible" }),
    ];

    const resultado = clientesAfectados(regla, posiciones, candidatos);

    expect(resultado.map((c) => c.cliente_id)).toEqual(["elegible"]);
  });
});

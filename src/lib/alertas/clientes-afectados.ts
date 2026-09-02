import type { ClienteCandidato, Posicion, ReglaAlerta } from "./tipos.ts";

/**
 * Filtra, entre los clientes con posición en la clase de la regla, los que
 * quedan realmente afectados por una alerta de esa regla. Excluye tres casos:
 * cliente suspendido, cliente sin análisis (ficha) todavía, y cliente cuyo
 * perfil de riesgo no coincide con el de la regla.
 *
 * Función pura: recibe posiciones y candidatos ya cargados, no consulta nada.
 */
export function clientesAfectados(
  regla: ReglaAlerta,
  posiciones: Posicion[],
  candidatos: ClienteCandidato[],
): ClienteCandidato[] {
  const clientesConPosicion = new Set(
    posiciones.filter((p) => p.clase === regla.clase).map((p) => p.cliente_id),
  );

  return candidatos.filter((cliente) => {
    if (!clientesConPosicion.has(cliente.cliente_id)) return false;
    if (cliente.suspendido) return false;
    if (!cliente.tiene_analisis) return false;
    if (cliente.perfil_riesgo !== regla.perfil_riesgo) return false;
    return true;
  });
}

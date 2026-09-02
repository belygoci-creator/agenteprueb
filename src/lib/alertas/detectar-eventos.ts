import type { EventoDetectado, ObservacionMercado, ReglaAlerta } from "./tipos.ts";

/**
 * Compara el último nivel observado de la clase de la regla con el nivel al
 * inicio de la ventana (`regla.ventana_dias` observaciones atrás) y devuelve
 * un evento si la variación (subida o bajada) llegó o superó el umbral, en
 * cualquiera de los dos sentidos -- `regla.umbral` es una magnitud, no una
 * dirección fija.
 *
 * Función pura: no consulta la base ni la red, recibe las observaciones ya
 * cargadas. Devuelve el evento sin `id` ni `created_at` (los asigna la base
 * al insertarlo).
 */
export function detectarEventos(
  regla: ReglaAlerta,
  observaciones: ObservacionMercado[],
): EventoDetectado[] {
  const deLaClase = observaciones
    .filter((o) => o.clase === regla.clase)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (deLaClase.length < regla.ventana_dias) {
    return [];
  }

  const ventana = deLaClase.slice(-regla.ventana_dias);
  const inicio = ventana[0];
  const fin = ventana[ventana.length - 1];

  if (inicio.valor === 0) {
    return [];
  }

  const variacion = (fin.valor - inicio.valor) / inicio.valor;

  if (Math.abs(variacion) < regla.umbral) {
    return [];
  }

  return [
    {
      regla_id: regla.id,
      desde: inicio.fecha,
      hasta: fin.fecha,
      variacion,
    },
  ];
}

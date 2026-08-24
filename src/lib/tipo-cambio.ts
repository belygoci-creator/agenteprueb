export interface TipoCambio {
  valor: number;
  fecha: string;
  fuente: string;
}

/**
 * Busca el dólar blue en vivo (SS6 de reglas-recomendacion.md). Nunca se
 * cachea entre corridas ni se reutiliza un valor viejo -- cada cálculo que
 * necesita conversión de moneda vuelve a llamar a esta función. Si falla,
 * devuelve null y el llamador debe bloquear el cálculo, nunca estimar.
 */
export async function obtenerDolarBlue(): Promise<TipoCambio | null> {
  try {
    const response = await fetch("https://api.bluelytics.com.ar/v2/latest", {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const valor = data?.blue?.value_sell;

    if (typeof valor !== "number") {
      return null;
    }

    return {
      valor,
      fecha: new Date().toISOString(),
      fuente: "Bluelytics (api.bluelytics.com.ar)",
    };
  } catch {
    return null;
  }
}

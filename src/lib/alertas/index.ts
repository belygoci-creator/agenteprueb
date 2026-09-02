// Extensiones .ts explícitas a propósito: este módulo lo consume también
// supabase/functions/revision-diaria (Deno), que las requiere en imports
// relativos. Habilitado en tsconfig.json vía allowImportingTsExtensions.
export { detectarEventos } from "./detectar-eventos.ts";
export { clientesAfectados } from "./clientes-afectados.ts";
export { mensajeInterno, formatearPorcentajeVariacion, direccionDe } from "./mensaje-interno.ts";
export type { DireccionVariacion } from "./mensaje-interno.ts";
export { construirCorreoAlerta } from "./correo-alerta.ts";
export type { CorreoAlerta } from "./correo-alerta.ts";
export { construirCorreoInterno } from "./correo-interno.ts";
export type { CorreoInterno } from "./correo-interno.ts";
export type {
  Alerta,
  ClienteCandidato,
  EventoDetectado,
  EventoMercado,
  ObservacionMercado,
  Posicion,
  ReglaAlerta,
} from "./tipos.ts";

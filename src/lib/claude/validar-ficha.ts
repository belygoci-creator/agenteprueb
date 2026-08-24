import { GUARDAR_FICHA_TOOL } from "./tools";

/**
 * Valida que el input de la tool guardar_ficha tenga todos los campos
 * requeridos, con un valor no nulo. La API de Claude no fuerza el
 * cumplimiento de "required" en el schema de la tool -- si el modelo cierra
 * la entrevista sin haber capturado un dato, esto lo detecta antes de
 * insertar en la base (donde esos campos son NOT NULL) en vez de dejar que
 * la escritura falle con un error crudo de Postgres.
 */
export function camposFaltantes(input: Record<string, unknown>): string[] {
  const requeridos = (GUARDAR_FICHA_TOOL.input_schema.required ?? []) as string[];
  return requeridos.filter((campo) => input[campo] === undefined || input[campo] === null);
}

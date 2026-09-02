-- 0005_alertas_avisar_cliente_y_suspendido.sql
-- Dos columnas en clientes que necesita scripts/revision.ts para decidir a
-- quién avisar por correo y a quién excluir. ALTER TABLE aditivo -- no toca
-- filas ni columnas existentes.
--
-- avisar_cliente: si true, el cliente recibe el correo de aviso cuando una
-- alerta lo afecta (ver src/lib/alertas/correo-alerta.ts).
--
-- suspendido: una de las tres exclusiones de clientesAfectados
-- (src/lib/alertas/clientes-afectados.ts), ya implementada en el código pero
-- sin columna real que la respalde hasta ahora.

alter table public.clientes
  add column avisar_cliente boolean not null default false;

alter table public.clientes
  add column suspendido boolean not null default false;

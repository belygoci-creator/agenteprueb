-- 0002_fix_crear_cliente_con_token_security.sql
-- crear_cliente_con_token fallaba con "new row violates row-level security
-- policy for table entrevista_tokens": la funcion corria security invoker,
-- sujeta a RLS del rol authenticated, que no tiene policy de INSERT sobre
-- entrevista_tokens (a proposito, ver docs/data-model.md). La pasamos a
-- security definer -- la comprobacion de propiedad sigue intacta porque el
-- cliente se inserta con asesor_id = auth.uid(), nunca con un valor pasado
-- por el llamador.

create or replace function public.crear_cliente_con_token(
  p_nombre text,
  p_email text,
  p_token text,
  p_expires_at timestamptz
)
returns public.clientes
language plpgsql
security definer set search_path = public
as $$
declare
  v_cliente public.clientes;
begin
  insert into public.clientes (asesor_id, nombre, email)
  values (auth.uid(), p_nombre, p_email)
  returning * into v_cliente;

  insert into public.entrevista_tokens (cliente_id, token, expires_at)
  values (v_cliente.id, p_token, p_expires_at);

  return v_cliente;
end;
$$;

-- 0003_generar_enlace_entrevista.sql
-- Permite al asesor generar un nuevo enlace de entrevista para un cliente
-- que ya existe (reentrevista, para armar historial -- ver docs/roadmap.md
-- Fase 2). entrevista_tokens no tiene policy de INSERT para el rol
-- authenticated (a proposito, ver docs/data-model.md), asi que hace falta
-- una funcion security definer, igual que crear_cliente_con_token.

create function public.generar_enlace_entrevista(
  p_cliente_id uuid,
  p_token text,
  p_expires_at timestamptz
)
returns public.entrevista_tokens
language plpgsql
security definer set search_path = public
as $$
declare
  v_token public.entrevista_tokens;
begin
  -- Solo el asesor dueno del cliente puede generar un enlace para el.
  if not exists (
    select 1 from public.clientes
    where clientes.id = p_cliente_id
      and clientes.asesor_id = auth.uid()
  ) then
    raise exception 'No autorizado: el cliente no pertenece al asesor actual.';
  end if;

  insert into public.entrevista_tokens (cliente_id, token, expires_at)
  values (p_cliente_id, p_token, p_expires_at)
  returning * into v_token;

  return v_token;
end;
$$;

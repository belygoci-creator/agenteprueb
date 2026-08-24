-- 0001_initial_schema.sql
-- Esquema inicial según docs/data-model.md: asesores, clientes,
-- entrevista_tokens, fichas, diagnosticos, recomendaciones + políticas RLS.

-- ─── asesores ──────────────────────────────────────────────────────────────
create table public.asesores (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now()
);

alter table public.asesores enable row level security;

create policy "asesores_select_propio"
  on public.asesores for select
  using (id = auth.uid());

create policy "asesores_update_propio"
  on public.asesores for update
  using (id = auth.uid());

-- ─── clientes ──────────────────────────────────────────────────────────────
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  asesor_id uuid not null references public.asesores (id) on delete cascade,
  nombre text not null,
  email text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'entrevista_completa')),
  created_at timestamptz not null default now()
);

create index clientes_asesor_id_idx on public.clientes (asesor_id);

alter table public.clientes enable row level security;

create policy "clientes_all_propio"
  on public.clientes for all
  using (asesor_id = auth.uid())
  with check (asesor_id = auth.uid());

-- ─── entrevista_tokens ─────────────────────────────────────────────────────
create table public.entrevista_tokens (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz
);

create index entrevista_tokens_cliente_id_idx on public.entrevista_tokens (cliente_id);

alter table public.entrevista_tokens enable row level security;

-- Sin acceso directo desde el cliente final (no tiene sesión de Supabase
-- Auth): las operaciones de validación/uso de token se hacen con
-- service_role desde route handlers de servidor (ver src/lib/supabase/admin.ts).
-- El asesor puede ver los tokens de sus propios clientes.
create policy "entrevista_tokens_select_asesor_dueno"
  on public.entrevista_tokens for select
  using (
    exists (
      select 1 from public.clientes
      where clientes.id = entrevista_tokens.cliente_id
        and clientes.asesor_id = auth.uid()
    )
  );

-- ─── fichas ────────────────────────────────────────────────────────────────
create table public.fichas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  edad integer not null,
  dependientes text not null,
  situacion_laboral text not null,
  estabilidad_laboral text not null,
  objetivo_descripcion text not null,
  objetivo_monto numeric not null,
  objetivo_moneda text not null,
  objetivo_plazo_meses integer not null,
  objetivo_prioridad text,
  ingresos_netos_mensuales numeric not null,
  ingresos_estimado boolean not null default false,
  gastos_fijos_mensuales numeric not null,
  gastos_estimado boolean not null default false,
  deuda_saldo numeric,
  deuda_cuota_mensual numeric,
  deuda_tasa_interes numeric,
  deuda_estimado boolean not null default false,
  ahorro_actual_monto numeric not null,
  ahorro_actual_liquidez text,
  ahorro_estimado boolean not null default false,
  fondo_emergencia_meses numeric not null,
  perfil_riesgo_declarado text not null check (perfil_riesgo_declarado in ('conservador', 'moderado', 'dinamico')),
  notas_cualitativas text,
  created_at timestamptz not null default now()
);

create index fichas_cliente_id_idx on public.fichas (cliente_id);

alter table public.fichas enable row level security;

create policy "fichas_select_asesor_dueno"
  on public.fichas for select
  using (
    exists (
      select 1 from public.clientes
      where clientes.id = fichas.cliente_id
        and clientes.asesor_id = auth.uid()
    )
  );

-- INSERT/UPDATE exclusivo del servidor (service_role) durante la entrevista
-- y la edición manual del asesor (como nueva versión, no update destructivo).

-- ─── diagnosticos ──────────────────────────────────────────────────────────
create table public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.fichas (id) on delete cascade,
  tasa_ahorro numeric not null,
  porcentaje_camino_recorrido numeric not null,
  proyeccion_acumulada numeric not null,
  gap numeric,
  gap_pendiente_motivo text,
  created_at timestamptz not null default now()
);

create index diagnosticos_ficha_id_idx on public.diagnosticos (ficha_id);

alter table public.diagnosticos enable row level security;

create policy "diagnosticos_select_asesor_dueno"
  on public.diagnosticos for select
  using (
    exists (
      select 1 from public.fichas
      join public.clientes on clientes.id = fichas.cliente_id
      where fichas.id = diagnosticos.ficha_id
        and clientes.asesor_id = auth.uid()
    )
  );

-- ─── recomendaciones ───────────────────────────────────────────────────────
create table public.recomendaciones (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos (id) on delete cascade,
  etapa_prioridad text not null check (etapa_prioridad in ('fondo_emergencia', 'deuda_cara', 'invertir')),
  fondo_emergencia_requerido_meses numeric not null,
  tipo_cambio_usado numeric,
  tipo_cambio_fecha timestamptz,
  tipo_cambio_fuente text,
  aporte_necesario numeric not null,
  aporte_maximo_sostenible numeric not null,
  diferencia numeric not null,
  viable boolean not null,
  distribucion_renta_fija numeric not null,
  distribucion_liquidez numeric not null,
  distribucion_renta_variable numeric not null,
  alternativas jsonb,
  supuestos jsonb,
  created_at timestamptz not null default now()
);

create index recomendaciones_diagnostico_id_idx on public.recomendaciones (diagnostico_id);

alter table public.recomendaciones enable row level security;

create policy "recomendaciones_select_asesor_dueno"
  on public.recomendaciones for select
  using (
    exists (
      select 1 from public.diagnosticos
      join public.fichas on fichas.id = diagnosticos.ficha_id
      join public.clientes on clientes.id = fichas.cliente_id
      where diagnosticos.id = recomendaciones.diagnostico_id
        and clientes.asesor_id = auth.uid()
    )
  );

-- ─── Alta de cliente + token de entrevista en una sola transacción ────────
-- Evita clientes "huérfanos" sin enlace si falla el segundo insert (FLOW-01).
create function public.crear_cliente_con_token(
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
  -- security definer porque entrevista_tokens no tiene politica de INSERT
  -- para el rol authenticated (esa tabla solo se escribe desde el servidor,
  -- ver docs/data-model.md). La comprobacion de propiedad sigue vigente:
  -- el cliente siempre queda asociado al asesor autenticado (auth.uid()),
  -- nunca a un asesor_id arbitrario pasado por el llamador.
  insert into public.clientes (asesor_id, nombre, email)
  values (auth.uid(), p_nombre, p_email)
  returning * into v_cliente;

  insert into public.entrevista_tokens (cliente_id, token, expires_at)
  values (v_cliente.id, p_token, p_expires_at);

  return v_cliente;
end;
$$;

-- ─── Alta automática de asesores al crear el usuario en auth.users ────────
create function public.handle_new_asesor()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.asesores (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_asesor();

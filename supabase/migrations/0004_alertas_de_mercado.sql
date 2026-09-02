-- 0004_alertas_de_mercado.sql
-- Capa de vigilancia de mercado, por encima del esquema existente (no modifica
-- ninguna tabla de 0001-0003): observaciones_mercado, reglas_alerta,
-- eventos_mercado, alertas, posiciones + políticas RLS.
--
-- Lectura restringida a asesores en las cinco tablas. No hay policies de
-- INSERT/UPDATE/DELETE: la escritura (carga de observaciones, disparo de
-- eventos/alertas, carga de posiciones) se hace desde route handlers de
-- servidor con la service_role key, igual que en entrevista_tokens (ver
-- 0001_initial_schema.sql).

-- ─── observaciones_mercado ───────────────────────────────────────────────────
-- Valor observado de una clase de activo en una fecha dada.
create table public.observaciones_mercado (
  id uuid primary key default gen_random_uuid(),
  clase text not null,
  fecha date not null,
  valor numeric not null,
  created_at timestamptz not null default now(),
  unique (clase, fecha)
);

alter table public.observaciones_mercado enable row level security;

create policy "observaciones_mercado_select_asesor"
  on public.observaciones_mercado for select
  using (exists (select 1 from public.asesores where id = auth.uid()));

-- ─── reglas_alerta ────────────────────────────────────────────────────────────
-- Umbral configurado para disparar una alerta, en tanto por uno (0.03 = 3 %).
create table public.reglas_alerta (
  id uuid primary key default gen_random_uuid(),
  clase text not null,
  perfil_riesgo text not null check (perfil_riesgo in ('conservador', 'moderado', 'dinamico')),
  ventana_dias int not null,
  umbral numeric not null check (umbral > 0 and umbral <= 1),
  created_at timestamptz not null default now()
);

alter table public.reglas_alerta enable row level security;

create policy "reglas_alerta_select_asesor"
  on public.reglas_alerta for select
  using (exists (select 1 from public.asesores where id = auth.uid()));

-- ─── eventos_mercado ──────────────────────────────────────────────────────────
-- Disparo efectivo de una regla: la variación medida superó el umbral en la
-- ventana [desde, hasta].
create table public.eventos_mercado (
  id uuid primary key default gen_random_uuid(),
  regla_id uuid not null references public.reglas_alerta (id) on delete cascade,
  desde date not null,
  hasta date not null,
  variacion numeric not null,
  created_at timestamptz not null default now(),
  unique (regla_id, hasta)
);

create index eventos_mercado_regla_id_idx on public.eventos_mercado (regla_id);

alter table public.eventos_mercado enable row level security;

create policy "eventos_mercado_select_asesor"
  on public.eventos_mercado for select
  using (exists (select 1 from public.asesores where id = auth.uid()));

-- ─── alertas ──────────────────────────────────────────────────────────────────
-- Instancia de un evento de mercado aplicada a un cliente concreto.
create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos_mercado (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'revisada')),
  created_at timestamptz not null default now(),
  unique (evento_id, cliente_id)
);

create index alertas_cliente_id_idx on public.alertas (cliente_id);
create index alertas_evento_id_idx on public.alertas (evento_id);

alter table public.alertas enable row level security;

-- Solo el asesor dueño del cliente asociado (join contra clientes.asesor_id,
-- mismo patrón que fichas/diagnosticos/recomendaciones en data-model.md).
create policy "alertas_select_asesor_dueno"
  on public.alertas for select
  using (
    exists (
      select 1 from public.clientes
      where clientes.id = alertas.cliente_id
        and clientes.asesor_id = auth.uid()
    )
  );

-- ─── posiciones ───────────────────────────────────────────────────────────────
-- Cartera del cliente, valorada en euros.
create table public.posiciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  clase text not null,
  valor_eur numeric not null,
  fecha date not null,
  created_at timestamptz not null default now()
);

create index posiciones_cliente_id_idx on public.posiciones (cliente_id);

alter table public.posiciones enable row level security;

create policy "posiciones_select_asesor_dueno"
  on public.posiciones for select
  using (
    exists (
      select 1 from public.clientes
      where clientes.id = posiciones.cliente_id
        and clientes.asesor_id = auth.uid()
    )
  );

-- ─── seed: reglas de caída de renta variable a 5 días ────────────────────────
insert into public.reglas_alerta (clase, perfil_riesgo, ventana_dias, umbral)
values
  ('renta_variable', 'conservador', 5, 0.03),
  ('renta_variable', 'moderado', 5, 0.04),
  ('renta_variable', 'dinamico', 5, 0.06);

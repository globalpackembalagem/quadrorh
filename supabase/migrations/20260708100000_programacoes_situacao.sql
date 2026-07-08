create table if not exists public.programacoes_situacao (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  situacao_id uuid not null references public.situacoes(id),
  situacao_nome text not null,
  data_inicio date not null,
  data_fim date,
  status text not null default 'PENDENTE' check (status in ('PENDENTE', 'APLICADO', 'FINALIZADO', 'CANCELADO')),
  criado_por_id uuid references public.user_roles(id),
  criado_por_nome text,
  aplicado_em timestamptz,
  finalizado_em timestamptz,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_programacoes_situacao_funcionario
  on public.programacoes_situacao (funcionario_id, status, data_inicio, data_fim);

alter table public.programacoes_situacao enable row level security;

drop policy if exists "Leitura programacoes situacao" on public.programacoes_situacao;
create policy "Leitura programacoes situacao"
  on public.programacoes_situacao for select
  using (true);

drop policy if exists "Insert programacoes situacao" on public.programacoes_situacao;
create policy "Insert programacoes situacao"
  on public.programacoes_situacao for insert
  with check (true);

drop policy if exists "Update programacoes situacao" on public.programacoes_situacao;
create policy "Update programacoes situacao"
  on public.programacoes_situacao for update
  using (true)
  with check (true);

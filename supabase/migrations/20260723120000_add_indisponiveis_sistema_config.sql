alter table public.sistema_config
  add column if not exists indisponiveis_situacao_ids text[] not null default '{}';

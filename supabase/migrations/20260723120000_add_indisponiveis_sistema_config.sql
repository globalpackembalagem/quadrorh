alter table public.sistema_config
  add column if not exists indisponiveis_situacao_ids text[] not null default '{}';

insert into public.sistema_config (id, sistema_bloqueado, data_validade, dias_validade, atualizado_por, indisponiveis_situacao_ids)
values ('00000000-0000-0000-0000-000000000001', false, null, null, 'SISTEMA', '{}')
on conflict (id) do nothing;

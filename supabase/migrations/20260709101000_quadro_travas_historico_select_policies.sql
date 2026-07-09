do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quadro_travas'
      and policyname = 'Leitura liberada quadro_travas'
  ) then
    execute 'create policy "Leitura liberada quadro_travas" on public.quadro_travas for select using (true)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quadro_historico'
      and policyname = 'Leitura liberada quadro_historico'
  ) then
    execute 'create policy "Leitura liberada quadro_historico" on public.quadro_historico for select using (true)';
  end if;
end $$;

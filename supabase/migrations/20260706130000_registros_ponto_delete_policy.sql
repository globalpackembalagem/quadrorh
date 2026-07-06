drop policy if exists "Qualquer pessoa pode deletar registros_ponto" on public.registros_ponto;

create policy "Qualquer pessoa pode deletar registros_ponto"
  on public.registros_ponto for delete
  using (true);

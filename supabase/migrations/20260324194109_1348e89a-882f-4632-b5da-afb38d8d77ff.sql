-- Force PostgREST schema cache reload so the REST API recognizes public.treinamentos_previsao
NOTIFY pgrst, 'reload schema';
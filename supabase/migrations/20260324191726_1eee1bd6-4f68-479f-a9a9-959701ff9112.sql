-- Reload PostgREST schema cache so the public API recognizes treinamentos_previsao
NOTIFY pgrst, 'reload schema';
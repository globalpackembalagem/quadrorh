CREATE TABLE IF NOT EXISTS public.acessos_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  login_em timestamptz NOT NULL DEFAULT now(),
  ultima_atividade_em timestamptz NOT NULL DEFAULT now(),
  logout_em timestamptz,
  user_agent text,
  origem text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acessos_usuarios_user_role_id
  ON public.acessos_usuarios(user_role_id);

CREATE INDEX IF NOT EXISTS idx_acessos_usuarios_login_em
  ON public.acessos_usuarios(login_em DESC);

ALTER TABLE public.acessos_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer pessoa pode ver acessos_usuarios" ON public.acessos_usuarios;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir acessos_usuarios" ON public.acessos_usuarios;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar acessos_usuarios" ON public.acessos_usuarios;

CREATE POLICY "Qualquer pessoa pode ver acessos_usuarios"
  ON public.acessos_usuarios FOR SELECT
  USING (true);

CREATE POLICY "Qualquer pessoa pode inserir acessos_usuarios"
  ON public.acessos_usuarios FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar acessos_usuarios"
  ON public.acessos_usuarios FOR UPDATE
  USING (true);

ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS tipos_notificacao text[] NOT NULL DEFAULT ARRAY[
  'troca_turno',
  'demissao_temporario',
  'demissao',
  'divergencia',
  'faltas',
  'previsao_admissao',
  'evento_sistema_modal',
  'armarios'
];

UPDATE public.user_roles
SET tipos_notificacao = ARRAY[
  'troca_turno',
  'demissao_temporario',
  'demissao',
  'divergencia',
  'faltas',
  'previsao_admissao',
  'evento_sistema_modal',
  'armarios'
]
WHERE tipos_notificacao IS NULL OR cardinality(tipos_notificacao) = 0;

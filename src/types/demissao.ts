// Types para o sistema de demissões

// Tipos sugeridos de desligamento (aceita qualquer texto)
export const TIPOS_DESLIGAMENTO: string[] = [
  'Pedido de Demissão',
  'Dispensa S/ Justa Causa',
  'Dem. Justa Causa',
  'Término de Contrato',
  'Ant. Término',
];

export interface Demissao {
  id: string;
  funcionario_id: string;
  tipo_desligamento: string | null;
  data_prevista: string;
  data_exame_demissional: string | null;
  hora_exame_demissional: string | null;
  data_homologacao: string | null;
  hora_homologacao: string | null;
  realizado: boolean;
  lancado_apdata: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  funcionario?: {
    id: string;
    nome_completo: string;
    matricula: string | null;
    data_admissao: string | null;
    cargo: string | null;
    turma: string | null;
    setor?: {
      id: string;
      nome: string;
      grupo: string | null;
    };
  };
}

export interface PeriodoDemissao {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

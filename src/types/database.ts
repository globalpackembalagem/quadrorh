// Types para o sistema de controle de quadro

export type SexoTipo = 'masculino' | 'feminino';
export type PontoTipo = 'P' | 'F' | 'A' | 'FE' | 'DA' | 'DF' | 'S' | 'SS';
export type PeriodoStatus = 'aberto' | 'fechado';
export type UsuarioPerfil = 'administrador' | 'gestor' | 'visualizacao';

export interface Setor {
  id: string;
  nome: string;
  ativo: boolean;
  conta_no_quadro: boolean;
  grupo: string | null;
  created_at: string;
  updated_at: string;
}

export interface Situacao {
  id: string;
  nome: string;
  conta_no_quadro: boolean;
  entra_no_ponto: boolean;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export type EmpresaTipo = 'GLOBALPACK' | 'G+P';

export interface Funcionario {
  id: string;
  nome_completo: string;
  sexo: SexoTipo;
  setor_id: string;
  situacao_id: string;
  observacoes: string | null;
  empresa: EmpresaTipo;
  matricula: string | null;
  data_admissao: string | null;
  cargo: string | null;
  centro_custo: string | null;
  turma: string | null;
  data_demissao: string | null;
  // Campos para situações especiais
  cobertura_funcionario_id: string | null;
  treinamento_setor_id: string | null;
  sumido_desde: string | null;
  cobertura_data_inicio: string | null;
  cobertura_data_fim: string | null;
  // Campos para transferência
  transferencia_programada: boolean;
  transferencia_data: string | null;
  transferencia_setor_id: string | null;
  nao_e_meu_funcionario: boolean;
  tamanho_uniforme: string | null;
  tamanho_calca: string | null;
  tamanho_camiseta: string | null;
  tamanho_calcado: string | null;
  usa_oculos: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  setor?: Setor;
  situacao?: Situacao;
  cobertura_funcionario?: Funcionario;
  treinamento_setor?: Setor;
  transferencia_setor?: Setor;
}

export interface PeriodoPonto {
  id: string;
  data_inicio: string;
  data_fim: string;
  status: PeriodoStatus;
  created_at: string;
  updated_at: string;
}

export interface RegistroPonto {
  id: string;
  funcionario_id: string;
  data: string;
  periodo_id: string;
  tipo: PontoTipo;
  observacao: string | null;
  ativo_no_periodo: boolean;
  created_at: string;
  // Relacionamentos
  funcionario?: Funcionario;
  periodo?: PeriodoPonto;
}

export interface Usuario {
  id: string;
  user_id: string | null;
  nome: string;
  perfil: UsuarioPerfil;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalFuncionarios: number;
  totalHomens: number;
  totalMulheres: number;
  porSetor: { setor: string; total: number }[];
  faltasHoje: number;
  atestadosHoje: number;
  presentesHoje: number;
}

// Quadro Planejado
export interface QuadroPlanejado {
  id: string;
  grupo: string;
  turma: string;
  aux_maquina_industria: number;
  reserva_ferias_industria: number;
  reserva_faltas_industria: number;
  amarra_pallets: number;
  revisao_frasco: number;
  mod_sindicalista: number;
  controle_praga: number;
  aux_maquina_gp: number;
  reserva_faltas_gp: number;
  reserva_ferias_gp: number;
  aumento_quadro: number;
  created_at: string;
  updated_at: string;
}

// Quadro Decoração
export interface QuadroDecoracao {
  id: string;
  turma: string;
  aux_maquina: number;
  reserva_refeicao: number;
  reserva_faltas: number;
  reserva_ferias: number;
  apoio_topografia: number;
  reserva_afastadas: number;
  reserva_covid: number;
  created_at: string;
  updated_at: string;
}

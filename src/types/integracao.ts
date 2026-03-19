export interface Integracao {
  id: string;
  nome_completo: string;
  data_integracao: string;
  presente: boolean;
  marcado_em: string | null;
  marcado_por_id: string | null;
  marcado_por_nome: string | null;
  created_at: string;
  updated_at: string;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      armarios_config: {
        Row: {
          created_at: string
          id: string
          local: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          local: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          local?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      armarios_femininos: {
        Row: {
          bloqueado: boolean
          created_at: string
          funcionario_id: string | null
          id: string
          local: string
          matricula: string | null
          nome_prestador: string | null
          numero: number
          observacoes: string | null
          quebrado: boolean
          setor_prestador: string | null
          updated_at: string
        }
        Insert: {
          bloqueado?: boolean
          created_at?: string
          funcionario_id?: string | null
          id?: string
          local?: string
          matricula?: string | null
          nome_prestador?: string | null
          numero: number
          observacoes?: string | null
          quebrado?: boolean
          setor_prestador?: string | null
          updated_at?: string
        }
        Update: {
          bloqueado?: boolean
          created_at?: string
          funcionario_id?: string | null
          id?: string
          local?: string
          matricula?: string | null
          nome_prestador?: string | null
          numero?: number
          observacoes?: string | null
          quebrado?: boolean
          setor_prestador?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "armarios_femininos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      armarios_setores_prestador: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      avisos_movimentacao: {
        Row: {
          created_at: string
          criado_por: string | null
          id: string
          mensagem: string
          quantidade: number
          setor_nome: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          id?: string
          mensagem: string
          quantidade?: number
          setor_nome?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          id?: string
          mensagem?: string
          quantidade?: number
          setor_nome?: string | null
          tipo?: string
        }
        Relationships: []
      }
      avisos_movimentacao_lidos: {
        Row: {
          aviso_id: string
          id: string
          lido_em: string
          user_role_id: string
        }
        Insert: {
          aviso_id: string
          id?: string
          lido_em?: string
          user_role_id: string
        }
        Update: {
          aviso_id?: string
          id?: string
          lido_em?: string
          user_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_movimentacao_lidos_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos_movimentacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_movimentacao_lidos_user_role_id_fkey"
            columns: ["user_role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados: {
        Row: {
          arquivo_pdf_url: string | null
          ativo: boolean | null
          categoria_id: string
          conteudo: string
          created_at: string
          criado_por: string | null
          fixado: boolean | null
          id: string
          ordem: number | null
          titulo: string
          updated_at: string
        }
        Insert: {
          arquivo_pdf_url?: string | null
          ativo?: boolean | null
          categoria_id: string
          conteudo: string
          created_at?: string
          criado_por?: string | null
          fixado?: boolean | null
          id?: string
          ordem?: number | null
          titulo: string
          updated_at?: string
        }
        Update: {
          arquivo_pdf_url?: string | null
          ativo?: boolean | null
          categoria_id?: string
          conteudo?: string
          created_at?: string
          criado_por?: string | null
          fixado?: boolean | null
          id?: string
          ordem?: number | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "comunicados_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados_categorias: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      demissoes: {
        Row: {
          created_at: string
          data_exame_demissional: string | null
          data_homologacao: string | null
          data_prevista: string
          funcionario_id: string
          hora_exame_demissional: string | null
          hora_homologacao: string | null
          id: string
          lancado_apdata: boolean
          observacoes: string | null
          realizado: boolean
          tipo_desligamento: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_exame_demissional?: string | null
          data_homologacao?: string | null
          data_prevista: string
          funcionario_id: string
          hora_exame_demissional?: string | null
          hora_homologacao?: string | null
          id?: string
          lancado_apdata?: boolean
          observacoes?: string | null
          realizado?: boolean
          tipo_desligamento?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_exame_demissional?: string | null
          data_homologacao?: string | null
          data_prevista?: string
          funcionario_id?: string
          hora_exame_demissional?: string | null
          hora_homologacao?: string | null
          id?: string
          lancado_apdata?: boolean
          observacoes?: string | null
          realizado?: boolean
          tipo_desligamento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demissoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      divergencias_ponto: {
        Row: {
          created_at: string
          criado_por: string
          data: string
          funcionario_id: string
          id: string
          motivo: string | null
          periodo_id: string
          resolvido: boolean
          resolvido_em: string | null
          resolvido_por: string | null
          tipo_atual: string | null
          tipo_solicitado: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          data: string
          funcionario_id: string
          id?: string
          motivo?: string | null
          periodo_id: string
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          tipo_atual?: string | null
          tipo_solicitado: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          data?: string
          funcionario_id?: string
          id?: string
          motivo?: string | null
          periodo_id?: string
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          tipo_atual?: string | null
          tipo_solicitado?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "divergencias_ponto_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divergencias_ponto_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_ponto"
            referencedColumns: ["id"]
          },
        ]
      }
      divergencias_quadro: {
        Row: {
          created_at: string
          criado_por: string
          descricao_acao: string | null
          feedback_rh: string | null
          funcionario_id: string
          id: string
          observacoes: string | null
          resolvido: boolean
          resolvido_em: string | null
          resolvido_por: string | null
          status: string
          tipo_divergencia: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          descricao_acao?: string | null
          feedback_rh?: string | null
          funcionario_id: string
          id?: string
          observacoes?: string | null
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          tipo_divergencia: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          descricao_acao?: string | null
          feedback_rh?: string | null
          funcionario_id?: string
          id?: string
          observacoes?: string | null
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          tipo_divergencia?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "divergencias_quadro_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_sistema: {
        Row: {
          created_at: string | null
          criado_por: string | null
          dados_extra: Json | null
          descricao: string
          funcionario_id: string | null
          funcionario_nome: string | null
          id: string
          notificado: boolean | null
          notificado_em: string | null
          notificado_tipo: string | null
          quantidade: number | null
          setor_id: string | null
          setor_nome: string | null
          tipo: string
          turma: string | null
        }
        Insert: {
          created_at?: string | null
          criado_por?: string | null
          dados_extra?: Json | null
          descricao: string
          funcionario_id?: string | null
          funcionario_nome?: string | null
          id?: string
          notificado?: boolean | null
          notificado_em?: string | null
          notificado_tipo?: string | null
          quantidade?: number | null
          setor_id?: string | null
          setor_nome?: string | null
          tipo: string
          turma?: string | null
        }
        Update: {
          created_at?: string | null
          criado_por?: string | null
          dados_extra?: Json | null
          descricao?: string
          funcionario_id?: string | null
          funcionario_nome?: string | null
          id?: string
          notificado?: boolean | null
          notificado_em?: string | null
          notificado_tipo?: string | null
          quantidade?: number | null
          setor_id?: string | null
          setor_nome?: string | null
          tipo?: string
          turma?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_sistema_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_sistema_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      experiencia_decisoes: {
        Row: {
          created_at: string
          criado_por: string | null
          data_prevista: string | null
          data_programada: string | null
          decisao: string
          funcionario_ciente: boolean
          funcionario_id: string
          id: string
          responsavel: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data_prevista?: string | null
          data_programada?: string | null
          decisao: string
          funcionario_ciente?: boolean
          funcionario_id: string
          id?: string
          responsavel?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data_prevista?: string | null
          data_programada?: string | null
          decisao?: string
          funcionario_ciente?: boolean
          funcionario_id?: string
          id?: string
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiencia_decisoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: true
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      force_logout: {
        Row: {
          id: string
          triggered_at: string
          triggered_by: string
        }
        Insert: {
          id?: string
          triggered_at?: string
          triggered_by: string
        }
        Update: {
          id?: string
          triggered_at?: string
          triggered_by?: string
        }
        Relationships: []
      }
      fretado_imports: {
        Row: {
          created_at: string
          id: string
          import_date: string
          periodo: string
          total_diario: number
          total_extras: number
          total_lotacao: number
          total_pedagio: number
        }
        Insert: {
          created_at?: string
          id?: string
          import_date: string
          periodo: string
          total_diario?: number
          total_extras?: number
          total_lotacao?: number
          total_pedagio?: number
        }
        Update: {
          created_at?: string
          id?: string
          import_date?: string
          periodo?: string
          total_diario?: number
          total_extras?: number
          total_lotacao?: number
          total_pedagio?: number
        }
        Relationships: []
      }
      fretado_itinerarios: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          pedagio: number
          updated_at: string
          valor_micro: number
          valor_onibus: number
          valor_van: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          pedagio?: number
          updated_at?: string
          valor_micro?: number
          valor_onibus?: number
          valor_van?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          pedagio?: number
          updated_at?: string
          valor_micro?: number
          valor_onibus?: number
          valor_van?: number
        }
        Relationships: []
      }
      fretado_trips: {
        Row: {
          baixo: number
          date: string
          entry_destino: string
          entry_time: string
          exit_destino: string
          exit_time: string
          id: string
          import_id: string
          micro: number
          onibus: number
          pedagio: number
          sheet: string
          total: number
          van: number
        }
        Insert: {
          baixo?: number
          date: string
          entry_destino?: string
          entry_time?: string
          exit_destino?: string
          exit_time?: string
          id?: string
          import_id: string
          micro?: number
          onibus?: number
          pedagio?: number
          sheet: string
          total?: number
          van?: number
        }
        Update: {
          baixo?: number
          date?: string
          entry_destino?: string
          entry_time?: string
          exit_destino?: string
          exit_time?: string
          id?: string
          import_id?: string
          micro?: number
          onibus?: number
          pedagio?: number
          sheet?: string
          total?: number
          van?: number
        }
        Relationships: [
          {
            foreignKeyName: "fretado_trips_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "fretado_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      fretado_valores_extras: {
        Row: {
          cidade: string
          created_at: string
          id: string
          updated_at: string
          valor_viagem: number
        }
        Insert: {
          cidade: string
          created_at?: string
          id?: string
          updated_at?: string
          valor_viagem?: number
        }
        Update: {
          cidade?: string
          created_at?: string
          id?: string
          updated_at?: string
          valor_viagem?: number
        }
        Relationships: []
      }
      funcionarios: {
        Row: {
          cargo: string | null
          centro_custo: string | null
          cobertura_data_fim: string | null
          cobertura_data_inicio: string | null
          cobertura_funcionario_id: string | null
          created_at: string
          data_admissao: string | null
          data_demissao: string | null
          empresa: string | null
          id: string
          matricula: string | null
          nao_e_meu_funcionario: boolean
          nome_completo: string
          observacoes: string | null
          setor_id: string
          sexo: Database["public"]["Enums"]["sexo_tipo"]
          situacao_id: string
          sumido_desde: string | null
          tamanho_calca: string | null
          tamanho_calcado: string | null
          tamanho_camiseta: string | null
          tamanho_uniforme: string | null
          treinamento_setor_id: string | null
          turma: string | null
          updated_at: string
          usa_oculos: boolean | null
        }
        Insert: {
          cargo?: string | null
          centro_custo?: string | null
          cobertura_data_fim?: string | null
          cobertura_data_inicio?: string | null
          cobertura_funcionario_id?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          empresa?: string | null
          id?: string
          matricula?: string | null
          nao_e_meu_funcionario?: boolean
          nome_completo: string
          observacoes?: string | null
          setor_id: string
          sexo: Database["public"]["Enums"]["sexo_tipo"]
          situacao_id: string
          sumido_desde?: string | null
          tamanho_calca?: string | null
          tamanho_calcado?: string | null
          tamanho_camiseta?: string | null
          tamanho_uniforme?: string | null
          treinamento_setor_id?: string | null
          turma?: string | null
          updated_at?: string
          usa_oculos?: boolean | null
        }
        Update: {
          cargo?: string | null
          centro_custo?: string | null
          cobertura_data_fim?: string | null
          cobertura_data_inicio?: string | null
          cobertura_funcionario_id?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          empresa?: string | null
          id?: string
          matricula?: string | null
          nao_e_meu_funcionario?: boolean
          nome_completo?: string
          observacoes?: string | null
          setor_id?: string
          sexo?: Database["public"]["Enums"]["sexo_tipo"]
          situacao_id?: string
          sumido_desde?: string | null
          tamanho_calca?: string | null
          tamanho_calcado?: string | null
          tamanho_camiseta?: string | null
          tamanho_uniforme?: string | null
          treinamento_setor_id?: string | null
          turma?: string | null
          updated_at?: string
          usa_oculos?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_cobertura_funcionario_id_fkey"
            columns: ["cobertura_funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_situacao_id_fkey"
            columns: ["situacao_id"]
            isOneToOne: false
            referencedRelation: "situacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_treinamento_setor_id_fkey"
            columns: ["treinamento_setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_acesso: {
        Row: {
          data_acesso: string
          dispositivo: string | null
          id: string
          ip: string | null
          navegador: string | null
          nome_usuario: string
          user_role_id: string
        }
        Insert: {
          data_acesso?: string
          dispositivo?: string | null
          id?: string
          ip?: string | null
          navegador?: string | null
          nome_usuario: string
          user_role_id: string
        }
        Update: {
          data_acesso?: string
          dispositivo?: string | null
          id?: string
          ip?: string | null
          navegador?: string | null
          nome_usuario?: string
          user_role_id?: string
        }
        Relationships: []
      }
      historico_auditoria: {
        Row: {
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          operacao: string
          registro_id: string
          tabela: string
          usuario_nome: string | null
        }
        Insert: {
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          operacao: string
          registro_id: string
          tabela: string
          usuario_nome?: string | null
        }
        Update: {
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          operacao?: string
          registro_id?: string
          tabela?: string
          usuario_nome?: string | null
        }
        Relationships: []
      }
      historico_faltas: {
        Row: {
          created_at: string
          data: string
          funcionario_id: string
          id: string
          operacao: string
          periodo_id: string
          registro_ponto_id: string
          tipo_anterior: string | null
          tipo_novo: string
          usuario_nome: string
        }
        Insert: {
          created_at?: string
          data: string
          funcionario_id: string
          id?: string
          operacao: string
          periodo_id: string
          registro_ponto_id: string
          tipo_anterior?: string | null
          tipo_novo: string
          usuario_nome: string
        }
        Update: {
          created_at?: string
          data?: string
          funcionario_id?: string
          id?: string
          operacao?: string
          periodo_id?: string
          registro_ponto_id?: string
          tipo_anterior?: string | null
          tipo_novo?: string
          usuario_nome?: string
        }
        Relationships: []
      }
      historico_movimentacao: {
        Row: {
          created_at: string
          criado_por: string | null
          data: string
          funcionario_nome: string
          grupo: string
          id: string
          necessario: number
          observacoes: string | null
          quadro_anterior: number
          quadro_novo: number
          tipo_movimentacao: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data?: string
          funcionario_nome: string
          grupo: string
          id?: string
          necessario?: number
          observacoes?: string | null
          quadro_anterior?: number
          quadro_novo?: number
          tipo_movimentacao: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data?: string
          funcionario_nome?: string
          grupo?: string
          id?: string
          necessario?: number
          observacoes?: string | null
          quadro_anterior?: number
          quadro_novo?: number
          tipo_movimentacao?: string
        }
        Relationships: []
      }
      historico_quadro: {
        Row: {
          campo: string
          created_at: string
          grupo: string | null
          id: string
          registro_id: string
          tabela: string
          turma: string
          usuario_nome: string
          valor_anterior: number
          valor_novo: number
        }
        Insert: {
          campo: string
          created_at?: string
          grupo?: string | null
          id?: string
          registro_id: string
          tabela: string
          turma: string
          usuario_nome: string
          valor_anterior: number
          valor_novo: number
        }
        Update: {
          campo?: string
          created_at?: string
          grupo?: string | null
          id?: string
          registro_id?: string
          tabela?: string
          turma?: string
          usuario_nome?: string
          valor_anterior?: number
          valor_novo?: number
        }
        Relationships: []
      }
      integracoes_agencia: {
        Row: {
          aprovado: boolean | null
          calca: string | null
          camisa: string | null
          compareceu: boolean | null
          cpf: string | null
          created_at: string
          criado_por: string | null
          data_integracao: string | null
          funcao: string | null
          id: string
          indicacao: string | null
          nome_completo: string | null
          oculos: string | null
          ponto_referencia: string | null
          residencia_fretado: string | null
          sapato: string | null
          setor: string | null
          sexo: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          aprovado?: boolean | null
          calca?: string | null
          camisa?: string | null
          compareceu?: boolean | null
          cpf?: string | null
          created_at?: string
          criado_por?: string | null
          data_integracao?: string | null
          funcao?: string | null
          id?: string
          indicacao?: string | null
          nome_completo?: string | null
          oculos?: string | null
          ponto_referencia?: string | null
          residencia_fretado?: string | null
          sapato?: string | null
          setor?: string | null
          sexo?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          aprovado?: boolean | null
          calca?: string | null
          camisa?: string | null
          compareceu?: boolean | null
          cpf?: string | null
          created_at?: string
          criado_por?: string | null
          data_integracao?: string | null
          funcao?: string | null
          id?: string
          indicacao?: string | null
          nome_completo?: string | null
          oculos?: string | null
          ponto_referencia?: string | null
          residencia_fretado?: string | null
          sapato?: string | null
          setor?: string | null
          sexo?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      liberacoes_faltas: {
        Row: {
          created_at: string
          data_liberada: string
          expira_em: string
          id: string
          liberado_por: string
          setor_id: string
        }
        Insert: {
          created_at?: string
          data_liberada: string
          expira_em: string
          id?: string
          liberado_por: string
          setor_id: string
        }
        Update: {
          created_at?: string
          data_liberada?: string
          expira_em?: string
          id?: string
          liberado_por?: string
          setor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liberacoes_faltas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_records: {
        Row: {
          cost_center_id: string
          created_at: string
          date: string
          employee_id: string
          employee_name: string
          id: string
          meal_type_id: string
          time: string
        }
        Insert: {
          cost_center_id?: string
          created_at?: string
          date: string
          employee_id: string
          employee_name?: string
          id?: string
          meal_type_id?: string
          time: string
        }
        Update: {
          cost_center_id?: string
          created_at?: string
          date?: string
          employee_id?: string
          employee_name?: string
          id?: string
          meal_type_id?: string
          time?: string
        }
        Relationships: []
      }
      meal_types: {
        Row: {
          created_at: string
          end_time: string
          id: string
          name: string
          start_time: string
          tolerance_after: number
          tolerance_before: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          name: string
          start_time: string
          tolerance_after?: number
          tolerance_before?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          name?: string
          start_time?: string
          tolerance_after?: number
          tolerance_before?: number
          updated_at?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          referencia_id: string | null
          tipo: string
          titulo: string
          user_role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          referencia_id?: string | null
          tipo: string
          titulo: string
          user_role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          referencia_id?: string | null
          tipo?: string
          titulo?: string
          user_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_user_role_id_fkey"
            columns: ["user_role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_vistas: {
        Row: {
          evento_id: string
          id: string
          nome_gestor: string
          user_role_id: string
          visto_em: string
        }
        Insert: {
          evento_id: string
          id?: string
          nome_gestor: string
          user_role_id: string
          visto_em?: string
        }
        Update: {
          evento_id?: string
          id?: string
          nome_gestor?: string
          user_role_id?: string
          visto_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_vistas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_sistema"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_vistas_user_role_id_fkey"
            columns: ["user_role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos_demissao: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim: string
          data_inicio: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim: string
          data_inicio: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      periodos_ponto: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          id: string
          status: Database["public"]["Enums"]["periodo_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          id?: string
          status?: Database["public"]["Enums"]["periodo_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          status?: Database["public"]["Enums"]["periodo_status"]
          updated_at?: string
        }
        Relationships: []
      }
      prestadores_funcionarios: {
        Row: {
          cargo: string
          centro_custo: string
          codigo_estrutura: string
          created_at: string
          empresa: string
          id: string
          matricula: string
          mes_referencia: string
          nome: string
          situacao: string
        }
        Insert: {
          cargo?: string
          centro_custo?: string
          codigo_estrutura?: string
          created_at?: string
          empresa?: string
          id?: string
          matricula: string
          mes_referencia: string
          nome?: string
          situacao?: string
        }
        Update: {
          cargo?: string
          centro_custo?: string
          codigo_estrutura?: string
          created_at?: string
          empresa?: string
          id?: string
          matricula?: string
          mes_referencia?: string
          nome?: string
          situacao?: string
        }
        Relationships: []
      }
      prestadores_usuarios: {
        Row: {
          ativo: boolean
          data_cadastro: string
          id: string
          modulos: string[]
          nome: string
          setor: string
          telefone_whatsapp: string
        }
        Insert: {
          ativo?: boolean
          data_cadastro?: string
          id?: string
          modulos?: string[]
          nome: string
          setor: string
          telefone_whatsapp?: string
        }
        Update: {
          ativo?: boolean
          data_cadastro?: string
          id?: string
          modulos?: string[]
          nome?: string
          setor?: string
          telefone_whatsapp?: string
        }
        Relationships: []
      }
      previsao_documentos: {
        Row: {
          atualizado_por: string
          created_at: string
          funcionario_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          atualizado_por: string
          created_at?: string
          funcionario_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          atualizado_por?: string
          created_at?: string
          funcionario_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "previsao_documentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: true
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      previsao_documentos_historico: {
        Row: {
          created_at: string
          funcionario_id: string
          id: string
          status_anterior: string | null
          status_novo: string
          usuario_nome: string
        }
        Insert: {
          created_at?: string
          funcionario_id: string
          id?: string
          status_anterior?: string | null
          status_novo: string
          usuario_nome: string
        }
        Update: {
          created_at?: string
          funcionario_id?: string
          id?: string
          status_anterior?: string | null
          status_novo?: string
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "previsao_documentos_historico_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      previsao_horarios_notificacao: {
        Row: {
          ativo: boolean
          created_at: string
          horario: string
          id: string
          setor_grupo: string
          ultimo_envio: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          horario: string
          id?: string
          setor_grupo: string
          ultimo_envio?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          horario?: string
          id?: string
          setor_grupo?: string
          ultimo_envio?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quadro_decoracao: {
        Row: {
          apoio_topografia: number
          aux_maquina: number
          created_at: string
          id: string
          reserva_afastadas: number
          reserva_covid: number
          reserva_faltas: number
          reserva_ferias: number
          reserva_refeicao: number
          turma: string
          updated_at: string
        }
        Insert: {
          apoio_topografia?: number
          aux_maquina?: number
          created_at?: string
          id?: string
          reserva_afastadas?: number
          reserva_covid?: number
          reserva_faltas?: number
          reserva_ferias?: number
          reserva_refeicao?: number
          turma: string
          updated_at?: string
        }
        Update: {
          apoio_topografia?: number
          aux_maquina?: number
          created_at?: string
          id?: string
          reserva_afastadas?: number
          reserva_covid?: number
          reserva_faltas?: number
          reserva_ferias?: number
          reserva_refeicao?: number
          turma?: string
          updated_at?: string
        }
        Relationships: []
      }
      quadro_planejado: {
        Row: {
          amarra_pallets: number
          aumento_quadro: number
          aux_maquina_gp: number
          aux_maquina_industria: number
          controle_praga: number
          created_at: string
          grupo: string
          id: string
          mod_sindicalista: number
          reserva_faltas_gp: number
          reserva_faltas_industria: number
          reserva_ferias_gp: number
          reserva_ferias_industria: number
          revisao_frasco: number
          turma: string
          updated_at: string
        }
        Insert: {
          amarra_pallets?: number
          aumento_quadro?: number
          aux_maquina_gp?: number
          aux_maquina_industria?: number
          controle_praga?: number
          created_at?: string
          grupo: string
          id?: string
          mod_sindicalista?: number
          reserva_faltas_gp?: number
          reserva_faltas_industria?: number
          reserva_ferias_gp?: number
          reserva_ferias_industria?: number
          revisao_frasco?: number
          turma: string
          updated_at?: string
        }
        Update: {
          amarra_pallets?: number
          aumento_quadro?: number
          aux_maquina_gp?: number
          aux_maquina_industria?: number
          controle_praga?: number
          created_at?: string
          grupo?: string
          id?: string
          mod_sindicalista?: number
          reserva_faltas_gp?: number
          reserva_faltas_industria?: number
          reserva_ferias_gp?: number
          reserva_ferias_industria?: number
          revisao_frasco?: number
          turma?: string
          updated_at?: string
        }
        Relationships: []
      }
      rateio_excecoes: {
        Row: {
          created_at: string
          empresa: string
          id: string
          tipo: string
          valor: string
        }
        Insert: {
          created_at?: string
          empresa?: string
          id?: string
          tipo: string
          valor: string
        }
        Update: {
          created_at?: string
          empresa?: string
          id?: string
          tipo?: string
          valor?: string
        }
        Relationships: []
      }
      rateio_funcionarios_pj: {
        Row: {
          centro_custo: string
          codigo_estrutura: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          centro_custo?: string
          codigo_estrutura?: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          centro_custo?: string
          codigo_estrutura?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      rateio_meses_fechados: {
        Row: {
          fechado_em: string
          id: string
          mes: string
        }
        Insert: {
          fechado_em?: string
          id?: string
          mes: string
        }
        Update: {
          fechado_em?: string
          id?: string
          mes?: string
        }
        Relationships: []
      }
      registros_ponto: {
        Row: {
          ativo_no_periodo: boolean
          created_at: string
          data: string
          funcionario_id: string
          id: string
          observacao: string | null
          periodo_id: string
          tipo: Database["public"]["Enums"]["ponto_tipo"]
        }
        Insert: {
          ativo_no_periodo?: boolean
          created_at?: string
          data: string
          funcionario_id: string
          id?: string
          observacao?: string | null
          periodo_id: string
          tipo: Database["public"]["Enums"]["ponto_tipo"]
        }
        Update: {
          ativo_no_periodo?: boolean
          created_at?: string
          data?: string
          funcionario_id?: string
          id?: string
          observacao?: string | null
          periodo_id?: string
          tipo?: Database["public"]["Enums"]["ponto_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "registros_ponto_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_ponto"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          ativo: boolean
          conta_no_quadro: boolean
          created_at: string
          grupo: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          conta_no_quadro?: boolean
          created_at?: string
          grupo?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          conta_no_quadro?: boolean
          created_at?: string
          grupo?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      sistema_config: {
        Row: {
          atualizado_por: string
          created_at: string
          data_validade: string | null
          dias_validade: number | null
          id: string
          motivo_bloqueio: string | null
          sistema_bloqueado: boolean
          updated_at: string
        }
        Insert: {
          atualizado_por?: string
          created_at?: string
          data_validade?: string | null
          dias_validade?: number | null
          id?: string
          motivo_bloqueio?: string | null
          sistema_bloqueado?: boolean
          updated_at?: string
        }
        Update: {
          atualizado_por?: string
          created_at?: string
          data_validade?: string | null
          dias_validade?: number | null
          id?: string
          motivo_bloqueio?: string | null
          sistema_bloqueado?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      situacoes: {
        Row: {
          ativa: boolean
          conta_no_quadro: boolean
          created_at: string
          entra_no_ponto: boolean
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          conta_no_quadro?: boolean
          created_at?: string
          entra_no_ponto?: boolean
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          conta_no_quadro?: boolean
          created_at?: string
          entra_no_ponto?: boolean
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      tipos_desligamento: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          emoji: string | null
          id: string
          nome: string
          ordem: number
          tem_exame_demissional: boolean
          tem_homologacao: boolean
          template_texto: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          emoji?: string | null
          id?: string
          nome: string
          ordem?: number
          tem_exame_demissional?: boolean
          tem_homologacao?: boolean
          template_texto?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          emoji?: string | null
          id?: string
          nome?: string
          ordem?: number
          tem_exame_demissional?: boolean
          tem_homologacao?: boolean
          template_texto?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trocas_turno: {
        Row: {
          created_at: string
          criado_por: string
          data_efetivada: string | null
          data_programada: string | null
          efetivada: boolean | null
          funcionario_id: string
          gestor_destino_aprovado: boolean | null
          gestor_destino_aprovado_em: string | null
          gestor_destino_nome: string | null
          gestor_origem_aprovado: boolean | null
          gestor_origem_aprovado_em: string | null
          gestor_origem_nome: string | null
          id: string
          motivo_recusa: string | null
          observacoes: string | null
          recusado_por: string | null
          setor_destino_id: string
          setor_origem_id: string
          status: string
          tipo: string | null
          turma_destino: string | null
          turma_origem: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          data_efetivada?: string | null
          data_programada?: string | null
          efetivada?: boolean | null
          funcionario_id: string
          gestor_destino_aprovado?: boolean | null
          gestor_destino_aprovado_em?: string | null
          gestor_destino_nome?: string | null
          gestor_origem_aprovado?: boolean | null
          gestor_origem_aprovado_em?: string | null
          gestor_origem_nome?: string | null
          id?: string
          motivo_recusa?: string | null
          observacoes?: string | null
          recusado_por?: string | null
          setor_destino_id: string
          setor_origem_id: string
          status?: string
          tipo?: string | null
          turma_destino?: string | null
          turma_origem?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          data_efetivada?: string | null
          data_programada?: string | null
          efetivada?: boolean | null
          funcionario_id?: string
          gestor_destino_aprovado?: boolean | null
          gestor_destino_aprovado_em?: string | null
          gestor_destino_nome?: string | null
          gestor_origem_aprovado?: boolean | null
          gestor_origem_aprovado_em?: string | null
          gestor_origem_nome?: string | null
          id?: string
          motivo_recusa?: string | null
          observacoes?: string | null
          recusado_por?: string | null
          setor_destino_id?: string
          setor_origem_id?: string
          status?: string
          tipo?: string | null
          turma_destino?: string | null
          turma_origem?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trocas_turno_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trocas_turno_setor_destino_id_fkey"
            columns: ["setor_destino_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trocas_turno_setor_origem_id_fkey"
            columns: ["setor_origem_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          acesso_admin: boolean
          ativo: boolean
          created_at: string
          email: string | null
          id: string
          nome: string
          perfil: Database["public"]["Enums"]["perfil_usuario"]
          pode_criar_divergencias: boolean
          pode_editar_armarios: boolean
          pode_editar_coberturas: boolean
          pode_editar_demissoes: boolean
          pode_editar_faltas: boolean
          pode_editar_funcionarios: boolean
          pode_editar_homologacoes: boolean
          pode_editar_previsao: boolean
          pode_editar_troca_turno: boolean
          pode_exportar_excel: boolean
          pode_visualizar_armarios: boolean
          pode_visualizar_coberturas: boolean
          pode_visualizar_demissoes: boolean
          pode_visualizar_divergencias: boolean
          pode_visualizar_faltas: boolean
          pode_visualizar_funcionarios: boolean
          pode_visualizar_homologacoes: boolean
          pode_visualizar_previsao: boolean
          pode_visualizar_troca_turno: boolean
          recebe_notificacoes: boolean
          senha: string | null
          setor_id: string | null
          tempo_inatividade: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acesso_admin?: boolean
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
          pode_criar_divergencias?: boolean
          pode_editar_armarios?: boolean
          pode_editar_coberturas?: boolean
          pode_editar_demissoes?: boolean
          pode_editar_faltas?: boolean
          pode_editar_funcionarios?: boolean
          pode_editar_homologacoes?: boolean
          pode_editar_previsao?: boolean
          pode_editar_troca_turno?: boolean
          pode_exportar_excel?: boolean
          pode_visualizar_armarios?: boolean
          pode_visualizar_coberturas?: boolean
          pode_visualizar_demissoes?: boolean
          pode_visualizar_divergencias?: boolean
          pode_visualizar_faltas?: boolean
          pode_visualizar_funcionarios?: boolean
          pode_visualizar_homologacoes?: boolean
          pode_visualizar_previsao?: boolean
          pode_visualizar_troca_turno?: boolean
          recebe_notificacoes?: boolean
          senha?: string | null
          setor_id?: string | null
          tempo_inatividade?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acesso_admin?: boolean
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
          pode_criar_divergencias?: boolean
          pode_editar_armarios?: boolean
          pode_editar_coberturas?: boolean
          pode_editar_demissoes?: boolean
          pode_editar_faltas?: boolean
          pode_editar_funcionarios?: boolean
          pode_editar_homologacoes?: boolean
          pode_editar_previsao?: boolean
          pode_editar_troca_turno?: boolean
          pode_exportar_excel?: boolean
          pode_visualizar_armarios?: boolean
          pode_visualizar_coberturas?: boolean
          pode_visualizar_demissoes?: boolean
          pode_visualizar_divergencias?: boolean
          pode_visualizar_faltas?: boolean
          pode_visualizar_funcionarios?: boolean
          pode_visualizar_homologacoes?: boolean
          pode_visualizar_previsao?: boolean
          pode_visualizar_troca_turno?: boolean
          recebe_notificacoes?: boolean
          senha?: string | null
          setor_id?: string | null
          tempo_inatividade?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles_setores: {
        Row: {
          created_at: string
          id: string
          setor_id: string
          user_role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          setor_id: string
          user_role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          setor_id?: string
          user_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_setores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_setores_user_role_id_fkey"
            columns: ["user_role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          perfil: Database["public"]["Enums"]["usuario_perfil"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          perfil?: Database["public"]["Enums"]["usuario_perfil"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          perfil?: Database["public"]["Enums"]["usuario_perfil"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      valor_historico: {
        Row: {
          campo: string
          data_criacao: string
          data_vigencia: string
          id: string
          motivo: string
          nome_registro: string
          registro_id: string
          tipo: string
          valor_anterior: number
          valor_novo: number
        }
        Insert: {
          campo: string
          data_criacao?: string
          data_vigencia: string
          id?: string
          motivo: string
          nome_registro: string
          registro_id: string
          tipo: string
          valor_anterior: number
          valor_novo: number
        }
        Update: {
          campo?: string
          data_criacao?: string
          data_vigencia?: string
          id?: string
          motivo?: string
          nome_registro?: string
          registro_id?: string
          tipo?: string
          valor_anterior?: number
          valor_novo?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_demissoes: { Args: { _user_id: string }; Returns: boolean }
      can_edit_faltas: {
        Args: { _funcionario_setor_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_data: { Args: { _user_id: string }; Returns: boolean }
      get_user_perfil: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["perfil_usuario"]
      }
      get_user_setor_id: { Args: { _user_id: string }; Returns: string }
      get_user_setores: { Args: { _user_id: string }; Returns: string[] }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_gestor: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      perfil_usuario:
        | "admin"
        | "rh_demissoes"
        | "rh_completo"
        | "gestor_setor"
        | "visualizacao"
      periodo_status: "aberto" | "fechado"
      ponto_tipo: "F" | "A" | "P" | "FE" | "DF" | "DA" | "S" | "SS"
      sexo_tipo: "masculino" | "feminino"
      usuario_perfil: "administrador" | "gestor" | "visualizacao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      perfil_usuario: [
        "admin",
        "rh_demissoes",
        "rh_completo",
        "gestor_setor",
        "visualizacao",
      ],
      periodo_status: ["aberto", "fechado"],
      ponto_tipo: ["F", "A", "P", "FE", "DF", "DA", "S", "SS"],
      sexo_tipo: ["masculino", "feminino"],
      usuario_perfil: ["administrador", "gestor", "visualizacao"],
    },
  },
} as const

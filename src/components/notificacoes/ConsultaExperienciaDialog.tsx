import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Send, Users, Loader2 } from 'lucide-react';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { inserirEventoSemDuplicata } from '@/hooks/useEventosSistema';
import { cn } from '@/lib/utils';

interface FuncExperiencia {
  id: string;
  nome_completo: string;
  matricula: string | null;
  data_admissao: string | null;
  turma: string | null;
  sexo: string;
  empresa: string | null;
  setor_id: string;
  setor_nome: string;
  setor_grupo: string;
  isTemporario: boolean;
  diasDesdeAdmissao: number;
  diasRestantes: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsultaExperienciaDialog({ open, onOpenChange }: Props) {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  // Buscar funcionários em experiência
  const { data: funcionarios = [], isLoading } = useQuery({
    queryKey: ['funcionarios-experiencia-consulta'],
    queryFn: async () => {
      const { data: funcs, error } = await supabase
        .from('funcionarios')
        .select('id, nome_completo, matricula, data_admissao, turma, sexo, empresa, setor_id, setor:setores!setor_id(id, nome, grupo), situacao:situacoes!situacao_id(nome)')
        .order('data_admissao', { ascending: true });

      if (error) throw error;

      const hoje = new Date();
      const lista: FuncExperiencia[] = [];

      (funcs || []).forEach((f: any) => {
        const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
        if (situacaoNome !== 'ATIVO' || !f.data_admissao) return;

        const isTemporario = (f.matricula || '').toUpperCase().startsWith('TEMP');
        const dataAdmissao = parseISO(f.data_admissao);
        const diasDesdeAdmissao = differenceInDays(hoje, dataAdmissao);

        if (isTemporario) {
          const diasRestantes = 90 - diasDesdeAdmissao;
          if (diasRestantes >= -3) {
            lista.push({
              id: f.id,
              nome_completo: f.nome_completo,
              matricula: f.matricula,
              data_admissao: f.data_admissao,
              turma: f.turma,
              sexo: f.sexo,
              empresa: f.empresa,
              setor_id: f.setor?.id || f.setor_id,
              setor_nome: f.setor?.nome || '',
              setor_grupo: f.setor?.grupo || '',
              isTemporario: true,
              diasDesdeAdmissao,
              diasRestantes,
            });
          }
        } else {
          const diasPara30 = 30 - diasDesdeAdmissao;
          const diasPara60 = 60 - diasDesdeAdmissao;
          if (diasPara30 >= -3) {
            lista.push({
              id: f.id, nome_completo: f.nome_completo, matricula: f.matricula,
              data_admissao: f.data_admissao, turma: f.turma, sexo: f.sexo, empresa: f.empresa,
              setor_id: f.setor?.id || f.setor_id, setor_nome: f.setor?.nome || '',
              setor_grupo: f.setor?.grupo || '', isTemporario: false,
              diasDesdeAdmissao, diasRestantes: diasPara30,
            });
          } else if (diasPara60 >= -3) {
            lista.push({
              id: f.id, nome_completo: f.nome_completo, matricula: f.matricula,
              data_admissao: f.data_admissao, turma: f.turma, sexo: f.sexo, empresa: f.empresa,
              setor_id: f.setor?.id || f.setor_id, setor_nome: f.setor?.nome || '',
              setor_grupo: f.setor?.grupo || '', isTemporario: false,
              diasDesdeAdmissao, diasRestantes: diasPara60,
            });
          }
        }
      });

      return lista;
    },
    enabled: open,
  });

  // Buscar decisões já existentes
  const { data: decisoesExistentes = [] } = useQuery({
    queryKey: ['experiencia-decisoes-consulta'],
    queryFn: async () => {
      const { data } = await supabase.from('experiencia_decisoes').select('funcionario_id, decisao');
      return data || [];
    },
    enabled: open,
  });

  const decisoesMap = useMemo(() => {
    const map: Record<string, string> = {};
    decisoesExistentes.forEach(d => { map[d.funcionario_id] = d.decisao; });
    return map;
  }, [decisoesExistentes]);

  // Filtrar apenas os que ainda não têm decisão
  const funcionariosSemDecisao = useMemo(() =>
    funcionarios.filter(f => !decisoesMap[f.id]),
    [funcionarios, decisoesMap]
  );

  // Agrupar por setor
  const porSetor = useMemo(() => {
    const mapa: Record<string, FuncExperiencia[]> = {};
    funcionariosSemDecisao.forEach(f => {
      const key = f.setor_nome.toUpperCase() || 'SEM SETOR';
      if (!mapa[key]) mapa[key] = [];
      mapa[key].push(f);
    });
    return Object.entries(mapa).sort(([a], [b]) => a.localeCompare(b));
  }, [funcionariosSemDecisao]);

  useEffect(() => {
    if (open) setSelecionados(new Set());
  }, [open]);

  const toggleAll = () => {
    if (selecionados.size === funcionariosSemDecisao.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(funcionariosSemDecisao.map(f => f.id)));
    }
  };

  const enviarConsulta = async () => {
    if (selecionados.size === 0) return;
    setEnviando(true);

    try {
      const funcsSelecionados = funcionariosSemDecisao.filter(f => selecionados.has(f.id));
      let criados = 0;

      for (const func of funcsSelecionados) {
        const tipoLabel = func.isTemporario ? 'TEMPORÁRIO' : 'EFETIVO';
        const diasInfo = func.isTemporario
          ? `${func.diasDesdeAdmissao} dias trabalhados / ${Math.max(0, func.diasRestantes)} dias restantes`
          : `${func.diasDesdeAdmissao} dias de experiência`;

        const result = await inserirEventoSemDuplicata({
          tipo: 'experiencia_consulta',
          descricao: `CONSULTA EXPERIÊNCIA — ${func.setor_nome.toUpperCase()}`,
          funcionario_id: func.id,
          funcionario_nome: func.nome_completo,
          setor_id: func.setor_id,
          setor_nome: func.setor_nome,
          turma: func.turma,
          criado_por: userRole?.nome || 'ADMIN',
          dados_extra: {
            tipo_contrato: tipoLabel,
            matricula: func.matricula,
            data_admissao: func.data_admissao,
            dias_trabalhados: func.diasDesdeAdmissao,
            dias_restantes: func.diasRestantes,
            dias_info: diasInfo,
            empresa: func.empresa,
          },
          notificado: false,
        });

        if (result) criados++;
      }

      if (criados > 0) {
        toast.success(`${criados} consulta(s) de experiência criada(s) na Central!`);
        queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
      } else {
        toast.info('Todas as consultas já existiam na Central.');
      }

      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao criar consultas:', err);
      toast.error('Erro ao criar consultas de experiência');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            CONSULTAR EXPERIÊNCIA / TEMPORÁRIOS
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Selecione os funcionários para enviar consulta ao gestor: EFETIVAR ou DESLIGAR?
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Carregando funcionários...
            </div>
          ) : funcionariosSemDecisao.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum funcionário em experiência pendente de decisão.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">
                  {funcionariosSemDecisao.length} FUNCIONÁRIO(S) SEM DECISÃO
                </span>
                <Button variant="outline" size="sm" onClick={toggleAll} className="text-xs">
                  {selecionados.size === funcionariosSemDecisao.length ? 'DESMARCAR TODOS' : 'SELECIONAR TODOS'}
                </Button>
              </div>

              {porSetor.map(([setor, funcs]) => (
                <div key={setor} className="space-y-1">
                  <div className="flex items-center gap-2 px-2">
                    <Badge variant="secondary" className="text-[10px] font-bold">{setor}</Badge>
                    <span className="text-xs text-muted-foreground">({funcs.length})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-6 ml-auto"
                      onClick={() => {
                        const ids = funcs.map(f => f.id);
                        const allSelected = ids.every(id => selecionados.has(id));
                        setSelecionados(prev => {
                          const next = new Set(prev);
                          ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
                          return next;
                        });
                      }}
                    >
                      SELECIONAR SETOR
                    </Button>
                  </div>
                  {funcs.map(func => (
                    <label
                      key={func.id}
                      className={cn(
                        'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border',
                        selecionados.has(func.id)
                          ? 'bg-primary/5 border-primary/30'
                          : 'hover:bg-muted/50 border-transparent'
                      )}
                    >
                      <Checkbox
                        checked={selecionados.has(func.id)}
                        onCheckedChange={() => {
                          setSelecionados(prev => {
                            const next = new Set(prev);
                            next.has(func.id) ? next.delete(func.id) : next.add(func.id);
                            return next;
                          });
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm truncate">{func.nome_completo.toUpperCase()}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] shrink-0',
                              func.isTemporario ? 'border-orange-400 text-orange-600' : 'border-blue-400 text-blue-600'
                            )}
                          >
                            {func.isTemporario ? 'TEMPORÁRIO' : 'EFETIVO'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                          <span>{func.matricula || '—'}</span>
                          <span>•</span>
                          <span>Turma {func.turma || '—'}</span>
                          <span>•</span>
                          <span className="font-semibold">
                            {func.diasDesdeAdmissao} dias trabalhados
                          </span>
                          <span>•</span>
                          <span className={cn(
                            'font-bold',
                            func.diasRestantes <= 7 ? 'text-destructive' : func.diasRestantes <= 15 ? 'text-amber-600' : ''
                          )}>
                            {func.diasRestantes > 0 ? `${func.diasRestantes} dias restantes` : 'VENCIDO'}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>CANCELAR</Button>
          <Button
            onClick={enviarConsulta}
            disabled={selecionados.size === 0 || enviando}
            className="gap-1.5"
          >
            {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            CRIAR CONSULTA ({selecionados.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

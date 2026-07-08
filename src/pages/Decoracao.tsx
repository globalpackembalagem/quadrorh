import { useMemo, useEffect, useState } from 'react';
import { Palette, ShieldAlert, ClipboardList, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFuncionariosNoQuadro, useFuncionarios } from '@/hooks/useFuncionarios';
import { useQuadroDecoracao } from '@/hooks/useQuadroDecoracao';
import { useFuncionariosPrevisao } from '@/hooks/usePrevisoes';
import { useDemissoesPendentes, usePeriodosDemissao, useDemissoesRealizadas } from '@/hooks/useDemissoes';
import { QuadroDecoracaoTable } from '@/components/dashboard/QuadroDecoracaoTable';
import { QuadroRealDecoracaoTable } from '@/components/dashboard/QuadroRealDecoracaoTable';
import { SubstituicaoReposicaoTable } from '@/components/dashboard/SubstituicaoReposicaoTable';
import { MetricasTurmaCards } from '@/components/dashboard/MetricasTurmaCards';
import { EscalaFolgaDialog } from '@/components/decoracao/EscalaFolgaDialog';
import { EscalaFolgaCalendario } from '@/components/decoracao/EscalaFolgaCalendario';
import { ListaFuncionariosSetor } from '@/components/dashboard/ListaFuncionariosSetor';
import { ListaFuncionariosExperiencia } from '@/components/dashboard/ListaFuncionariosExperiencia';
import { useUsuario } from '@/contexts/UserContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getTrabalhaOuFolga } from '@/lib/escalaPanama';

export default function Decoracao() {
  const navigate = useNavigate();
  const { usuarioAtual, isAdmin } = useUsuario();
  const { data: funcionariosQuadro = [], isLoading: loadingFunc } = useFuncionariosNoQuadro();
  const { data: todosFuncionarios = [] } = useFuncionarios();
  const { data: quadroDecoracao = [], isLoading: loadingDecoracao } = useQuadroDecoracao();
  const { data: demissoesPendentes = [] } = useDemissoesPendentes();
  const { data: demissoesRealizadas = [] } = useDemissoesRealizadas();
  const { data: periodos = [] } = usePeriodosDemissao();
  const { data: funcionariosPrevisao = [] } = useFuncionariosPrevisao();
  const [setoresNomes, setSetoresNomes] = useState<Map<string, string>>(new Map());



  const isLoading = loadingFunc || loadingDecoracao;

  // Buscar nomes dos setores
  useEffect(() => {
    const fetchSetores = async () => {
      const { data } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('ativo', true);
      
      if (data) {
        const map = new Map<string, string>();
        data.forEach(s => map.set(s.id, s.nome));
        setSetoresNomes(map);
      }
    };
    fetchSetores();
  }, []);

  // Verificar se o gestor tem acesso à Decoração
  const setoresCarregados = setoresNomes.size > 0;
  const temAcessoDecoracao = useMemo(() => {
    if (!usuarioAtual || isAdmin) return true;
    if (usuarioAtual.setoresIds.length === 0) return true; // Sem setores = todos
    // Enquanto setores não carregaram, assumir acesso (evita redirect prematuro)
    if (!setoresCarregados) return true;
    
    return usuarioAtual.setoresIds.some(setorId => {
      const nomeSetor = setoresNomes.get(setorId)?.toUpperCase() || '';
      return nomeSetor.includes('DECORAÇÃO') || nomeSetor.includes('DECORACAO');
    });
  }, [usuarioAtual, isAdmin, setoresNomes, setoresCarregados]);

  // Filtrar funcionários por grupo
  const funcionariosDecoracao = useMemo(() => {
    return funcionariosQuadro.filter(f => {
      const setorNome = f.setor?.nome?.toUpperCase() || '';
      return setorNome.includes('DECORAÇÃO') || setorNome.includes('DECORACAO');
    });
  }, [funcionariosQuadro]);

  // Todos os funcionários (para a tabela de substituição - inclui sumidos, etc)
  const todosDecoracao = useMemo(() => {
    return todosFuncionarios.filter(f => {
      const setorNome = f.setor?.nome?.toUpperCase() || '';
      return setorNome.includes('DECORAÇÃO') || setorNome.includes('DECORACAO');
    });
  }, [todosFuncionarios]);

  // Calcular desfalque por turma
  const desfalqueDecoracao = useMemo(() => {
    const result: Record<string, number> = { 
      'DIA-T1': 0, 'DIA-T2': 0, 'NOITE-T1': 0, 'NOITE-T2': 0 
    };
    
    quadroDecoracao.forEach(q => {
      const totalNecessario = q.aux_maquina + (q.reserva_refeicao || 0) + q.reserva_faltas + 
        q.reserva_ferias + q.apoio_topografia + q.reserva_afastadas + q.reserva_covid;
      
      const funcTurma = funcionariosDecoracao.filter(f => {
        const turma = f.turma?.toUpperCase();
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        const isDia = setorNome.includes('DIA');
        const isNoite = setorNome.includes('NOITE');
        
        if (turma === 'T1' || turma === '1') {
          return (isDia && q.turma === 'DIA-T1') || (isNoite && q.turma === 'NOITE-T1');
        }
        if (turma === 'T2' || turma === '2') {
          return (isDia && q.turma === 'DIA-T2') || (isNoite && q.turma === 'NOITE-T2');
        }
        return false;
      });
      
      const quadroReal = funcTurma.length;
      result[q.turma] = totalNecessario - quadroReal;
    });
    
    return result;
  }, [quadroDecoracao, funcionariosDecoracao]);

  const isLuciano = (usuarioAtual?.nome || '').toUpperCase().trim() === 'LUCIANO';

  const escalaAtualDecoracao = useMemo(() => {
    const hoje = new Date();
    const t1Trabalha = getTrabalhaOuFolga(hoje, 'T1');
    const trabalhando = t1Trabalha ? 'T1' : 'T2';
    const folga = t1Trabalha ? 'T2' : 'T1';

    const contarPorTurma = (turma: 'T1' | 'T2') =>
      funcionariosDecoracao.filter(f => {
        const turmaFunc = (f.turma || '').toUpperCase().trim();
        return turmaFunc === turma || turmaFunc === turma.replace('T', '');
      }).length;

    return {
      trabalhando,
      folga,
      trabalhandoTotal: contarPorTurma(trabalhando),
      folgaTotal: contarPorTurma(folga),
    };
  }, [funcionariosDecoracao]);

  // Não redirecionar - apenas ocultar conteúdo se sem acesso
  // O redirecionamento causava loop infinito: /quadro-geral → /home → /quadro-geral

  if (!temAcessoDecoracao) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2">
          <Palette className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DECORAÇÃO</h1>
          <p className="text-muted-foreground">QUADRO DE FUNCIONÁRIOS DO SETOR DE DECORAÇÃO</p>
        </div>
      </div>

      {/* Toolbar / Barra de ações */}
      <div className="flex items-center gap-2 border rounded-lg bg-muted/30 p-2 overflow-x-auto">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => navigate('/faltas')}
        >
          <ClipboardList className="h-4 w-4" />
          CONTROLE DE FALTAS
        </Button>
        <div className="w-px h-6 bg-border shrink-0" />
        <ListaFuncionariosSetor
          grupo="DECORAÇÃO"
          funcionarios={todosFuncionarios}
        />
        <ListaFuncionariosExperiencia
          funcionarios={todosFuncionarios}
          grupo="DECORAÇÃO"
        />
        <div className="w-px h-6 bg-border shrink-0" />
        <EscalaFolgaDialog />
      </div>

      {isLuciano && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Agora na Decoração</p>
                <p className="text-xs text-muted-foreground">Escala Panamá de hoje</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-80">
              <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase text-success">Trabalhando</p>
                <p className="font-bold text-foreground">{escalaAtualDecoracao.trabalhando} · {escalaAtualDecoracao.trabalhandoTotal} pessoas</p>
              </div>
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase text-destructive">Folga</p>
                <p className="font-bold text-foreground">{escalaAtualDecoracao.folga} · {escalaAtualDecoracao.folgaTotal} pessoas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}




      {/* Cards de Resumo por Turma */}
      <MetricasTurmaCards
        grupo="DECORAÇÃO"
        funcionarios={funcionariosDecoracao}
        quadroPlanejadoDecoracao={quadroDecoracao}
        funcionariosPrevisao={funcionariosPrevisao}
      />

      {/* Tabelas do Quadro */}
      <div className="space-y-6">
        <QuadroDecoracaoTable dados={quadroDecoracao} />
        <QuadroRealDecoracaoTable
          funcionarios={funcionariosDecoracao}
          quadroPlanejado={quadroDecoracao}
        />
        <SubstituicaoReposicaoTable
          grupo="DECORAÇÃO"
          funcionarios={todosDecoracao}
          demissoesPendentes={demissoesPendentes}
          periodos={periodos}
          desfalquePorTurma={desfalqueDecoracao}
        />

        {/* Escala de Folga - visível para administradores */}
        {isAdmin && <EscalaFolgaCalendario />}
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Funcionario, Setor, Situacao } from '@/types/database';
import { format } from 'date-fns';
// xlsx-js-style loaded dynamically
import { toast } from 'sonner';

interface ExportarFuncionariosDialogProps {
  funcionarios: Funcionario[];
  setores: Setor[];
  situacoes: Situacao[];
}

export function ExportarFuncionariosDialog({ 
  funcionarios, 
  setores, 
  situacoes 
}: ExportarFuncionariosDialogProps) {
  const [open, setOpen] = useState(false);
  const [setoresSelecionados, setSetoresSelecionados] = useState<Set<string>>(new Set());
  const [situacoesSelecionadas, setSituacoesSelecionadas] = useState<Set<string>>(new Set());

  // Setores que contam no quadro (default)
  const setoresQueContam = useMemo(() => {
    return setores.filter(s => s.conta_no_quadro && s.ativo);
  }, [setores]);

  // Situações que contam no quadro (default)
  const situacoesQueContam = useMemo(() => {
    return situacoes.filter(s => s.conta_no_quadro && s.ativa);
  }, [situacoes]);

  // Todas as situações ativas
  const todasSituacoesAtivas = useMemo(() => {
    return situacoes.filter(s => s.ativa);
  }, [situacoes]);

  // Inicializar seleção com TODOS os setores ativos e TODAS as situações ativas
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSetoresSelecionados(new Set(setores.filter(s => s.ativo).map(s => s.id)));
      setSituacoesSelecionadas(new Set(todasSituacoesAtivas.map(s => s.id)));
    }
    setOpen(isOpen);
  };

  const toggleSetor = (id: string) => {
    const newSet = new Set(setoresSelecionados);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSetoresSelecionados(newSet);
  };

  const toggleSituacao = (id: string) => {
    const newSet = new Set(situacoesSelecionadas);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSituacoesSelecionadas(newSet);
  };

  const selecionarTodosSetores = () => {
    setSetoresSelecionados(new Set(setores.filter(s => s.ativo).map(s => s.id)));
  };

  const limparSetores = () => {
    setSetoresSelecionados(new Set());
  };

  const selecionarTodasSituacoes = () => {
    setSituacoesSelecionadas(new Set(todasSituacoesAtivas.map(s => s.id)));
  };

  const limparSituacoes = () => {
    setSituacoesSelecionadas(new Set());
  };

  // Funcionários filtrados
  const funcionariosFiltrados = useMemo(() => {
    return funcionarios.filter(f => 
      setoresSelecionados.has(f.setor_id) && 
      situacoesSelecionadas.has(f.situacao_id)
    );
  }, [funcionarios, setoresSelecionados, situacoesSelecionadas]);

  // Função para calcular em qual turma do quadro o funcionário está
  const calcularTurmaQuadro = (func: Funcionario): string => {
    const setorNome = func.setor?.nome?.toUpperCase() || '';
    const turma = func.turma?.toUpperCase()?.trim() || '';
    const cargo = func.cargo?.toUpperCase() || '';
    
    // Verificar se setor e situação contam no quadro
    const setorContaNoQuadro = func.setor?.conta_no_quadro && func.setor?.ativo;
    const situacaoContaNoQuadro = func.situacao?.conta_no_quadro && func.situacao?.ativa;
    
    if (!setorContaNoQuadro || !situacaoContaNoQuadro) {
      return 'NÃO CONTA';
    }
    
    // Verificar SOPRO
    if (setorNome.includes('SOPRO')) {
      // Tentar extrair turma do nome do setor (ex: "SOPRO A", "SOPRO B", "SOPRO C")
      const matchSetor = setorNome.match(/SOPRO\s+([ABC])/);
      if (matchSetor) {
        return `SOPRO ${matchSetor[1]}`;
      }
      // Ou usar a turma do funcionário
      if (turma === 'A' || turma === 'B' || turma === 'C') {
        return `SOPRO ${turma}`;
      }
      return 'SOPRO (SEM TURMA)';
    }
    
    // Verificar DECORAÇÃO
    const isDecoracaoDia = setorNome.includes('DECORAÇÃO MOD DIA') || setorNome.includes('DECORACAO MOD DIA');
    const isDecoracaoNoite = setorNome.includes('DECORAÇÃO MOD NOITE') || setorNome.includes('DECORACAO MOD NOITE');
    
    if (isDecoracaoDia || isDecoracaoNoite) {
      const periodo = isDecoracaoDia ? 'DIA' : 'NOITE';
      
      if (turma === 'T1' || turma === '1' || turma === 'TURMA 1') {
        return `DECORAÇÃO ${periodo}-T1`;
      }
      if (turma === 'T2' || turma === '2' || turma === 'TURMA 2') {
        return `DECORAÇÃO ${periodo}-T2`;
      }
      return `DECORAÇÃO ${periodo} (SEM TURMA)`;
    }
    
    // Outros setores de decoração
    if (setorNome.includes('DECORAÇÃO') || setorNome.includes('DECORACAO')) {
      return 'DECORAÇÃO (OUTRO)';
    }
    
    return 'OUTRO SETOR';
  };

  const exportar = async () => {
    const XLSX = await import('xlsx-js-style');
    if (funcionariosFiltrados.length === 0) {
      toast.error('Nenhum funcionário para exportar com os filtros selecionados');
      return;
    }

    const dados = funcionariosFiltrados.map(f => {
      // Verificar se conta no quadro (setor E situação E cargo precisam contar)
      const setorContaNoQuadro = f.setor?.conta_no_quadro && f.setor?.ativo;
      const situacaoContaNoQuadro = f.situacao?.conta_no_quadro && f.situacao?.ativa;
      const contaNoQuadro = setorContaNoQuadro && situacaoContaNoQuadro;
      
      const turmaQuadro = calcularTurmaQuadro(f);
      
      return {
        'Nome': f.nome_completo,
        'Sexo': f.sexo === 'masculino' ? 'M' : 'F',
        'Setor': f.setor?.nome || '',
        'Situação': f.situacao?.nome || '',
        'Empresa': f.empresa || '',
        'Matrícula': f.matricula || '',
        'Data Admissão': f.data_admissao ? format(new Date(f.data_admissao), 'dd/MM/yyyy') : '',
        'Cargo': f.cargo || '',
        'Turma': f.turma || '',
        'Conta no Quadro': contaNoQuadro ? 'SIM' : 'NÃO',
        'Turma Quadro': turmaQuadro,
        'Data Demissão': f.data_demissao ? format(new Date(f.data_demissao), 'dd/MM/yyyy') : '',
        'Tamanho Uniforme': f.tamanho_uniforme || '',
        'Tamanho Calça': f.tamanho_calca || '',
        'Tamanho Camiseta': f.tamanho_camiseta || '',
        'Tamanho Calçado': f.tamanho_calcado || '',
        'Usa Óculos': f.usa_oculos ? 'SIM' : 'NÃO',
        'Observações': f.observacoes || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Funcionários');
    
    const nomeArquivo = `Funcionarios_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
    toast.success(`${funcionariosFiltrados.length} funcionário(s) exportado(s)!`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar Funcionários</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Setores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Setores</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selecionarTodosSetores}>
                  Todos
                </Button>
                <Button variant="ghost" size="sm" onClick={limparSetores}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
              {setores.filter(s => s.ativo).map((setor) => (
                <div key={setor.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`setor-${setor.id}`}
                    checked={setoresSelecionados.has(setor.id)}
                    onCheckedChange={() => toggleSetor(setor.id)}
                  />
                  <label
                    htmlFor={`setor-${setor.id}`}
                    className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {setor.nome}
                    {setor.conta_no_quadro && (
                      <span className="ml-1 text-xs text-muted-foreground">(quadro)</span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Situações */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Situações</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selecionarTodasSituacoes}>
                  Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={limparSituacoes}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
              {todasSituacoesAtivas.map((situacao) => (
                <div key={situacao.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`situacao-${situacao.id}`}
                    checked={situacoesSelecionadas.has(situacao.id)}
                    onCheckedChange={() => toggleSituacao(situacao.id)}
                  />
                  <label
                    htmlFor={`situacao-${situacao.id}`}
                    className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {situacao.nome}
                    {situacao.conta_no_quadro && (
                      <span className="ml-1 text-xs text-muted-foreground">(quadro)</span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Funcionários a exportar:</span>
            <span className="font-semibold text-lg">{funcionariosFiltrados.length}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={exportar} disabled={funcionariosFiltrados.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo } from 'react';
import { Trash2, AlertTriangle, Loader2, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface Periodo {
  id: string;
  data_inicio: string;
  data_fim: string;
  status: string;
}

interface Setor {
  id: string;
  nome: string;
  grupo: string | null;
  conta_no_quadro: boolean;
}

interface ZerarFaltasDialogProps {
  periodos: Periodo[];
  setores: Setor[];
}

export function ZerarFaltasDialog({ periodos, setores }: ZerarFaltasDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>('');
  const [setoresSelecionados, setSetoresSelecionados] = useState<string[]>([]);
  const [tipoZerar, setTipoZerar] = useState<'TUDO' | 'FALTAS' | 'ATESTADOS'>('TUDO');
  const queryClient = useQueryClient();

  const CONFIRM_PHRASE = 'ZERAR';

  // Apenas setores que contam no quadro
  const setoresQuadro = useMemo(() => {
    return setores.filter(s => s.conta_no_quadro).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [setores]);

  // Agrupar setores por grupo (SOPRO/DECORAÇÃO)
  const gruposSetores = useMemo(() => {
    const grupos: Record<string, Setor[]> = {};
    setoresQuadro.forEach(setor => {
      const nomeUpper = setor.nome.toUpperCase();
      let grupo = 'OUTROS';
      if (nomeUpper.includes('SOPRO')) grupo = 'SOPRO';
      else if (nomeUpper.includes('DECORAÇÃO') || nomeUpper.includes('DECORACAO')) grupo = 'DECORAÇÃO';
      
      if (!grupos[grupo]) grupos[grupo] = [];
      grupos[grupo].push(setor);
    });
    return grupos;
  }, [setoresQuadro]);

  const handleSetorToggle = (setorId: string, checked: boolean) => {
    if (checked) {
      setSetoresSelecionados(prev => [...prev, setorId]);
    } else {
      setSetoresSelecionados(prev => prev.filter(s => s !== setorId));
    }
  };

  const selecionarTodosSetores = () => {
    setSetoresSelecionados(setoresQuadro.map(s => s.id));
  };

  const selecionarGrupo = (grupo: string) => {
    const setoresDoGrupo = gruposSetores[grupo] || [];
    const idsDoGrupo = setoresDoGrupo.map(s => s.id);
    
    // Se todos do grupo já estão selecionados, desmarcar
    const todosJaSelecionados = idsDoGrupo.every(id => setoresSelecionados.includes(id));
    
    if (todosJaSelecionados) {
      setSetoresSelecionados(prev => prev.filter(id => !idsDoGrupo.includes(id)));
    } else {
      setSetoresSelecionados(prev => [...new Set([...prev, ...idsDoGrupo])]);
    }
  };

  const limparSelecao = () => {
    setSetoresSelecionados([]);
  };

  const formatarPeriodo = (inicio: string, fim: string) => {
    const dataInicio = parseISO(inicio);
    const dataFim = parseISO(fim);
    return `${format(dataInicio, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dataFim, 'dd/MM/yyyy', { locale: ptBR })}`;
  };

  const handleZerarFaltas = async () => {
    if (confirmText !== CONFIRM_PHRASE) {
      toast.error(`Digite "${CONFIRM_PHRASE}" para confirmar`);
      return;
    }

    if (!periodoSelecionado) {
      toast.error('Selecione um período');
      return;
    }

    if (setoresSelecionados.length === 0) {
      toast.error('Selecione ao menos um setor');
      return;
    }

    setIsDeleting(true);

    try {
      // Buscar funcionários dos setores selecionados
      const { data: funcionarios, error: funcError } = await supabase
        .from('funcionarios')
        .select('id')
        .in('setor_id', setoresSelecionados);

      if (funcError) throw new Error('Erro ao buscar funcionários');

      const funcionarioIds = funcionarios?.map(f => f.id) || [];

      if (funcionarioIds.length === 0) {
        toast.info('Nenhum funcionário encontrado nos setores selecionados');
        setIsDeleting(false);
        return;
      }

      // Construir query de deleção
      let query = supabase
        .from('registros_ponto')
        .delete()
        .eq('periodo_id', periodoSelecionado)
        .in('funcionario_id', funcionarioIds);

      // Filtrar por tipo se não for TUDO
      if (tipoZerar === 'FALTAS') {
        query = query.eq('tipo', 'F');
      } else if (tipoZerar === 'ATESTADOS') {
        query = query.eq('tipo', 'A');
      }

      // Executar deleção em lotes para evitar limite
      const TAMANHO_LOTE = 100;

      for (let i = 0; i < funcionarioIds.length; i += TAMANHO_LOTE) {
        const lote = funcionarioIds.slice(i, i + TAMANHO_LOTE);
        
        let deleteQuery = supabase
          .from('registros_ponto')
          .delete()
          .eq('periodo_id', periodoSelecionado)
          .in('funcionario_id', lote);

        if (tipoZerar === 'FALTAS') {
          deleteQuery = deleteQuery.eq('tipo', 'F');
        } else if (tipoZerar === 'ATESTADOS') {
          deleteQuery = deleteQuery.eq('tipo', 'A');
        }

        const { error: deleteError } = await deleteQuery;
        if (deleteError) throw deleteError;
      }

      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['registros_faltas'] });

      const periodoInfo = periodos.find(p => p.id === periodoSelecionado);
      const periodoLabel = periodoInfo ? formatarPeriodo(periodoInfo.data_inicio, periodoInfo.data_fim) : '';
      
      toast.success(
        `Registros de ${tipoZerar === 'TUDO' ? 'faltas e atestados' : tipoZerar.toLowerCase()} zerados com sucesso!\n` +
        `Período: ${periodoLabel}\n` +
        `Setores: ${setoresSelecionados.length} selecionado(s)`
      );
      
      setOpen(false);
      setConfirmText('');
      setPeriodoSelecionado('');
      setSetoresSelecionados([]);
      setTipoZerar('TUDO');
    } catch (error) {
      console.error('Erro ao zerar faltas:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao zerar registros');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setConfirmText('');
      setPeriodoSelecionado('');
      setSetoresSelecionados([]);
      setTipoZerar('TUDO');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          ZERAR REGISTROS
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zerar Registros de Faltas
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Selecione o <strong>período</strong> e os <strong>setores</strong> para limpar os registros:
              </p>
              
              {/* Seleção de Período */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Período
                </Label>
                <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {formatarPeriodo(p.data_inicio, p.data_fim)}
                        {p.status === 'fechado' && ' (FECHADO)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Registro a Zerar */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">O que zerar?</Label>
                <div className="flex gap-2">
                  {(['TUDO', 'FALTAS', 'ATESTADOS'] as const).map((tipo) => (
                    <Button
                      key={tipo}
                      type="button"
                      variant={tipoZerar === tipo ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTipoZerar(tipo)}
                      disabled={isDeleting}
                      className="flex-1"
                    >
                      {tipo}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Seleção de Setores */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Building2 className="h-4 w-4" />
                    Setores
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={selecionarTodosSetores}
                      disabled={isDeleting}
                    >
                      Todos
                    </Button>
                    <span className="text-muted-foreground">|</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={limparSelecao}
                      disabled={isDeleting}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                
                {/* Atalhos por grupo */}
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(gruposSetores).map(grupo => {
                    const setoresDoGrupo = gruposSetores[grupo];
                    const todosSelecionados = setoresDoGrupo.every(s => setoresSelecionados.includes(s.id));
                    const algunsSelecionados = setoresDoGrupo.some(s => setoresSelecionados.includes(s.id));
                    
                    return (
                      <Badge
                        key={grupo}
                        variant={todosSelecionados ? 'default' : algunsSelecionados ? 'secondary' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => selecionarGrupo(grupo)}
                      >
                        {grupo} ({setoresDoGrupo.length})
                      </Badge>
                    );
                  })}
                </div>

                <ScrollArea className="h-40 border rounded-lg p-2 bg-muted/20">
                  <div className="space-y-2">
                    {setoresQuadro.map((setor) => (
                      <div key={setor.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`setor-${setor.id}`}
                          checked={setoresSelecionados.includes(setor.id)}
                          onCheckedChange={(checked) => handleSetorToggle(setor.id, checked as boolean)}
                          disabled={isDeleting}
                        />
                        <Label
                          htmlFor={`setor-${setor.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {setor.nome}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {setoresSelecionados.length} setor(es) selecionado(s)
                </p>
              </div>

              <p className="text-destructive font-medium text-sm bg-destructive/10 p-2 rounded border border-destructive/20">
                ⚠️ Esta ação NÃO pode ser desfeita! Os registros serão removidos permanentemente.
              </p>
              
              <div>
                <Label htmlFor="confirm" className="text-sm">
                  Digite <strong>{CONFIRM_PHRASE}</strong> para confirmar:
                </Label>
                <Input
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={CONFIRM_PHRASE}
                  className="mt-2"
                  disabled={isDeleting}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleZerarFaltas();
            }}
            disabled={
              confirmText !== CONFIRM_PHRASE || 
              isDeleting || 
              !periodoSelecionado ||
              setoresSelecionados.length === 0
            }
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Limpando...
              </>
            ) : (
              'Zerar Registros'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

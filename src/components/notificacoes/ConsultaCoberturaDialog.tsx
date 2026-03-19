import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Users, Send, Loader2 } from 'lucide-react';
import { useFuncionarios } from '@/hooks/useFuncionarios';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsultaCoberturaDialog({ open, onOpenChange }: Props) {
  const { data: funcionarios = [] } = useFuncionarios();
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [isEnviando, setIsEnviando] = useState(false);

  // Filtrar funcionários em COB. FÉRIAS ou TREINAMENTO
  const funcionariosCobTrein = useMemo(() => {
    return funcionarios.filter(f => {
      const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
      return situacaoNome.includes('COB') || 
             situacaoNome.includes('COBERTURA') || 
             situacaoNome.includes('TREINAMENTO');
    });
  }, [funcionarios]);

  // Agrupar por setor
  const porSetor = useMemo(() => {
    const map = new Map<string, typeof funcionariosCobTrein>();
    funcionariosCobTrein.forEach(f => {
      const setor = f.setor?.nome || 'SEM SETOR';
      if (!map.has(setor)) map.set(setor, []);
      map.get(setor)!.push(f);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [funcionariosCobTrein]);

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selecionarTodos = () => {
    if (selecionados.size === funcionariosCobTrein.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(funcionariosCobTrein.map(f => f.id)));
    }
  };

  const handleEnviar = async () => {
    if (selecionados.size === 0) return;
    setIsEnviando(true);

    try {
      const eventosParaInserir = [];
      for (const funcId of selecionados) {
        const func = funcionariosCobTrein.find(f => f.id === funcId);
        if (!func) continue;

        const situacaoNome = func.situacao?.nome || '';
        eventosParaInserir.push({
          tipo: 'cobertura_treinamento',
          descricao: `COB/TREIN. — ${func.nome_completo}`,
          funcionario_id: func.id,
          funcionario_nome: func.nome_completo,
          setor_id: func.setor_id,
          setor_nome: func.setor?.nome || null,
          turma: func.turma || null,
          criado_por: userRole?.nome || 'ADMIN',
          dados_extra: {
            situacao_nome: situacaoNome,
            empresa: func.empresa,
            matricula: func.matricula,
          },
          notificado: false,
        });
      }

      if (eventosParaInserir.length > 0) {
        const { error } = await supabase
          .from('eventos_sistema')
          .insert(eventosParaInserir);
        if (error) throw error;

        toast.success(`${eventosParaInserir.length} evento(s) criado(s) na Central de Notificações!`);
        queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
      }

      setSelecionados(new Set());
      onOpenChange(false);
    } catch (err) {
      toast.error('Erro ao criar eventos');
      console.error(err);
    } finally {
      setIsEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            CONSULTA COB. FÉRIAS / TREINAMENTO
          </DialogTitle>
          <DialogDescription>
            Selecione os funcionários em COB. FÉRIAS ou TREINAMENTO para criar eventos na Central.
            Os gestores receberão notificação para confirmar a situação.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1">
          {funcionariosCobTrein.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum funcionário em COB. FÉRIAS ou TREINAMENTO no momento.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <Button variant="outline" size="sm" onClick={selecionarTodos} className="gap-1.5">
                  {selecionados.size === funcionariosCobTrein.length ? 'DESMARCAR TODOS' : 'SELECIONAR TODOS'}
                </Button>
                <Badge variant="outline" className="text-sm">
                  {selecionados.size} de {funcionariosCobTrein.length} selecionado(s)
                </Badge>
              </div>

              {porSetor.map(([setor, funcs]) => (
                <div key={setor} className="mb-4">
                  <h3 className="text-sm font-bold text-foreground mb-2 px-2">
                    {setor} ({funcs.length})
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]" />
                        <TableHead>NOME</TableHead>
                        <TableHead className="w-[100px]">TURMA</TableHead>
                        <TableHead className="w-[160px]">SITUAÇÃO</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funcs.map(func => (
                        <TableRow key={func.id} className="cursor-pointer" onClick={() => toggleSelecionado(func.id)}>
                          <TableCell>
                            <Checkbox
                              checked={selecionados.has(func.id)}
                              onCheckedChange={() => toggleSelecionado(func.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{func.nome_completo}</TableCell>
                          <TableCell>{func.turma || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30 text-xs">
                              {func.situacao?.nome || '-'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            CANCELAR
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={selecionados.size === 0 || isEnviando}
            className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isEnviando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            CRIAR EVENTOS ({selecionados.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

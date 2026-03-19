import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Plus, Trash2, Save, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HorarioNotificacao {
  id: string;
  setor_grupo: string;
  horario: string;
  ativo: boolean;
  ultimo_envio: string | null;
  created_at: string;
  updated_at: string;
}

function useHorariosNotificacao() {
  return useQuery({
    queryKey: ['previsao-horarios-notificacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('previsao_horarios_notificacao')
        .select('*')
        .order('horario');
      if (error) throw error;
      return data as HorarioNotificacao[];
    },
  });
}

export function HorariosNotificacaoConfig() {
  const queryClient = useQueryClient();
  const { data: horarios, isLoading } = useHorariosNotificacao();
  const [novoGrupo, setNovoGrupo] = useState('');
  const [novoHorario, setNovoHorario] = useState('08:00');
  const [editando, setEditando] = useState<Record<string, string>>({});

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('previsao_horarios_notificacao')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['previsao-horarios-notificacao'] });
    },
  });

  const salvarHorario = useMutation({
    mutationFn: async ({ id, horario }: { id: string; horario: string }) => {
      const { error } = await supabase
        .from('previsao_horarios_notificacao')
        .update({ horario })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['previsao-horarios-notificacao'] });
      setEditando({});
      toast.success('Horário atualizado!');
    },
  });

  const adicionarHorario = useMutation({
    mutationFn: async () => {
      if (!novoGrupo.trim()) throw new Error('Informe o nome do grupo/setor');
      const { error } = await supabase
        .from('previsao_horarios_notificacao')
        .insert({ setor_grupo: novoGrupo.trim().toUpperCase(), horario: novoHorario });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['previsao-horarios-notificacao'] });
      setNovoGrupo('');
      setNovoHorario('08:00');
      toast.success('Horário adicionado!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao adicionar');
    },
  });

  const removerHorario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('previsao_horarios_notificacao')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['previsao-horarios-notificacao'] });
      toast.success('Horário removido!');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-primary" />
          HORÁRIOS DE ENVIO AUTOMÁTICO — PREVISÃO
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Configure os horários em que as notificações de previsão serão enviadas automaticamente para cada setor/turma. 
          Só envia se houver candidatos com situação PREVISÃO.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabela de horários */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-4">Carregando...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SETOR / GRUPO</TableHead>
                <TableHead className="w-[130px]">HORÁRIO</TableHead>
                <TableHead className="w-[100px]">STATUS</TableHead>
                <TableHead className="w-[160px]">ÚLTIMO ENVIO</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(horarios || []).map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.setor_grupo}</TableCell>
                  <TableCell>
                    {editando[h.id] !== undefined ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="time"
                          value={editando[h.id]}
                          onChange={(e) => setEditando(prev => ({ ...prev, [h.id]: e.target.value }))}
                          className="h-8 w-[100px]"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => salvarHorario.mutate({ id: h.id, horario: editando[h.id] })}
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="text-sm font-mono hover:underline cursor-pointer"
                        onClick={() => setEditando(prev => ({ ...prev, [h.id]: h.horario }))}
                      >
                        {h.horario.slice(0, 5)}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={h.ativo}
                      onCheckedChange={(checked) => toggleAtivo.mutate({ id: h.id, ativo: checked })}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {h.ultimo_envio
                      ? format(new Date(h.ultimo_envio + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })
                      : <span className="italic">Nunca</span>
                    }
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removerHorario.mutate(h.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!horarios || horarios.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    Nenhum horário configurado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {/* Adicionar novo */}
        <div className="flex items-end gap-2 pt-2 border-t">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">SETOR / GRUPO</label>
            <Input
              value={novoGrupo}
              onChange={(e) => setNovoGrupo(e.target.value)}
              placeholder="Ex: SOPRO D, DECORAÇÃO TARDE..."
              className="h-9"
            />
          </div>
          <div className="w-[130px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">HORÁRIO</label>
            <Input
              type="time"
              value={novoHorario}
              onChange={(e) => setNovoHorario(e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            size="sm"
            className="gap-1.5 h-9"
            onClick={() => adicionarHorario.mutate()}
            disabled={!novoGrupo.trim() || adicionarHorario.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
            ADICIONAR
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface TurmaPendenteActionsProps {
  aviso: {
    id: string;
    referencia_id: string | null;
  };
  isCiente: boolean;
  userRoleName: string;
  onDone: (id: string) => void;
}

/**
 * Componente de ações para notificação de turma pendente.
 * Mostra select de turma baseado no grupo do setor (SOPRO/DECORAÇÃO).
 * Só permite marcar como ciente após selecionar e salvar a turma.
 */
export function TurmaPendenteActions({ aviso, isCiente, userRoleName, onDone }: TurmaPendenteActionsProps) {
  const [turma, setTurma] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [grupoSetor, setGrupoSetor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const queryClient = useQueryClient();

  // Buscar grupo do setor do funcionário via evento
  const loadGrupo = useCallback(async () => {
    if (loaded || !aviso.referencia_id) return;
    setLoaded(true);
    try {
      const { data: evento } = await supabase
        .from('eventos_sistema')
        .select('funcionario_id, dados_extra')
        .eq('id', aviso.referencia_id)
        .single();

      if (evento?.funcionario_id) {
        const { data: func } = await supabase
          .from('funcionarios')
          .select('setor:setores!setor_id(grupo)')
          .eq('id', evento.funcionario_id)
          .single();
        const grupo = ((func?.setor as any)?.grupo || '').toUpperCase();
        setGrupoSetor(grupo);
      } else if (evento?.dados_extra) {
        // Fallback: grupo salvo no dados_extra
        const extra = evento.dados_extra as any;
        setGrupoSetor((extra.setor_grupo || '').toUpperCase());
      }
    } catch (e) {
      console.error('Erro ao carregar grupo:', e);
    }
  }, [aviso.referencia_id, loaded]);

  // Lazy load on first render
  if (!loaded) loadGrupo();

  const turmasDisponiveis = grupoSetor?.startsWith('SOPRO')
    ? ['1A', '2A', '1B', '2B']
    : (grupoSetor?.startsWith('DECORAÇÃO') || grupoSetor?.startsWith('DECORACAO'))
      ? ['T1', 'T2']
      : ['1A', '2A', '1B', '2B', 'T1', 'T2']; // fallback

  const handleSalvar = async () => {
    if (!turma || !aviso.referencia_id) return;
    setSalvando(true);
    try {
      // Buscar funcionario_id do evento
      const { data: evento } = await supabase
        .from('eventos_sistema')
        .select('funcionario_id, funcionario_nome, setor_nome')
        .eq('id', aviso.referencia_id)
        .single();

      if (!evento?.funcionario_id) {
        toast.error('Funcionário não encontrado');
        setSalvando(false);
        return;
      }

      // Atualizar turma do funcionário
      const { error } = await supabase
        .from('funcionarios')
        .update({ turma })
        .eq('id', evento.funcionario_id);

      if (error) throw error;

      // Notificar admin/RH da resposta
      const { data: admins } = await supabase
        .from('user_roles')
        .select('id')
        .eq('ativo', true)
        .or('acesso_admin.eq.true,perfil.eq.rh_completo');

      if (admins && admins.length > 0) {
        await supabase.from('notificacoes').insert(
          admins.map((a: any) => ({
            user_role_id: a.id,
            tipo: 'turma_pendente_resposta',
            titulo: `TURMA DEFINIDA — ${evento.setor_nome || ''}`,
            mensagem: `O gestor ${userRoleName} definiu a turma de ${evento.funcionario_nome}:\n\n✅ TURMA: ${turma}`,
            referencia_id: aviso.referencia_id,
          }))
        );
      }

      // Atualizar evento
      await supabase
        .from('eventos_sistema')
        .update({
          dados_extra: {
            turma_definida: turma,
            definido_por: userRoleName,
            definido_em: new Date().toISOString(),
          }
        })
        .eq('id', aviso.referencia_id);

      toast.success(`Turma ${turma} definida para ${evento.funcionario_nome}!`);
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      onDone(aviso.id);
    } catch {
      toast.error('Erro ao salvar turma');
    }
    setSalvando(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={turma} onValueChange={setTurma}>
        <SelectTrigger className="w-24 h-8 text-xs">
          <SelectValue placeholder="Turma" />
        </SelectTrigger>
        <SelectContent>
          {turmasDisponiveis.map(t => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="gap-1.5 text-xs h-8"
        onClick={handleSalvar}
        disabled={!turma || salvando || isCiente}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {salvando ? 'SALVANDO...' : 'DEFINIR TURMA'}
      </Button>
    </div>
  );
}

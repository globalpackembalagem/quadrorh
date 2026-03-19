import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, ShieldOff, Calendar, Clock, Save } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SENHA_MESTRE = 'Stenzo2025@@@';

export default function SistemaValidadeConfig() {
  const queryClient = useQueryClient();
  const [senhaMestre, setSenhaMestre] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [erroSenha, setErroSenha] = useState(false);

  const verificarSenha = () => {
    if (senhaMestre === SENHA_MESTRE) {
      setAutenticado(true);
      setErroSenha(false);
    } else {
      setErroSenha(true);
    }
  };

  const { data: config, isLoading } = useQuery({
    queryKey: ['sistema_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sistema_config')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [bloqueado, setBloqueado] = useState(false);
  const [dataValidade, setDataValidade] = useState('');
  const [diasValidade, setDiasValidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [modoValidade, setModoValidade] = useState<'data' | 'dias'>('data');

  useEffect(() => {
    if (config) {
      setBloqueado(config.sistema_bloqueado);
      setDataValidade(config.data_validade || '');
      setDiasValidade(config.dias_validade?.toString() || '');
      setMotivo(config.motivo_bloqueio || '');
      setModoValidade(config.dias_validade ? 'dias' : 'data');
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updateData: Record<string, unknown> = {
        sistema_bloqueado: bloqueado,
        motivo_bloqueio: motivo || null,
        atualizado_por: 'LUCIANO',
        updated_at: new Date().toISOString(),
      };

      if (modoValidade === 'dias' && diasValidade) {
        const dias = parseInt(diasValidade);
        updateData.dias_validade = dias;
        updateData.data_validade = format(addDays(new Date(), dias), 'yyyy-MM-dd');
      } else if (modoValidade === 'data' && dataValidade) {
        updateData.data_validade = dataValidade;
        updateData.dias_validade = null;
      } else {
        updateData.data_validade = null;
        updateData.dias_validade = null;
      }

      const { error } = await supabase
        .from('sistema_config')
        .update(updateData)
        .eq('id', config!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sistema_config'] });
      toast.success('Configuração do sistema atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar configuração'),
  });

  if (isLoading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  if (!autenticado) {
    return (
      <div className="rounded-lg border bg-card p-6 space-y-4 max-w-md mx-auto">
        <div className="flex items-center gap-2 text-center justify-center">
          <Shield className="h-6 w-6 text-destructive" />
          <h3 className="font-bold text-sm">ACESSO RESTRITO — SENHA MESTRE</h3>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Este módulo é exclusivo. Digite a senha mestre para acessar o controle de validade do sistema.
        </p>
        <div className="space-y-2">
          <Label className="text-xs">Senha Mestre</Label>
          <Input
            type="password"
            value={senhaMestre}
            onChange={(e) => { setSenhaMestre(e.target.value); setErroSenha(false); }}
            onKeyDown={(e) => e.key === 'Enter' && verificarSenha()}
            placeholder="Digite a senha mestre"
          />
          {erroSenha && (
            <p className="text-xs text-destructive font-medium">❌ Senha incorreta</p>
          )}
        </div>
        <Button onClick={verificarSenha} className="w-full">
          <Shield className="h-4 w-4 mr-2" />
          ACESSAR
        </Button>
      </div>
    );
  }
  const dataValidadeFormatada = config?.data_validade
    ? format(new Date(config.data_validade + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })
    : null;

  const sistemaExpirado = config?.data_validade && new Date(config.data_validade + 'T23:59:59') < new Date();

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">CONTROLE DO SISTEMA</h3>
        </div>
        <Badge variant={bloqueado || sistemaExpirado ? 'destructive' : 'default'} className="text-xs">
          {bloqueado ? '🔒 BLOQUEADO' : sistemaExpirado ? '⏰ EXPIRADO' : '✅ LIBERADO'}
        </Badge>
      </div>

      {/* Bloqueio manual */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-3">
          {bloqueado ? <ShieldOff className="h-5 w-5 text-destructive" /> : <Shield className="h-5 w-5 text-primary" />}
          <div>
            <p className="text-sm font-medium">Bloquear sistema</p>
            <p className="text-xs text-muted-foreground">
              {bloqueado ? 'Sistema bloqueado — ninguém acessa exceto LUCIANO' : 'Sistema liberado para todos os usuários'}
            </p>
          </div>
        </div>
        <Switch checked={bloqueado} onCheckedChange={setBloqueado} />
      </div>

      {bloqueado && (
        <div className="space-y-2">
          <Label className="text-xs">Motivo do bloqueio (opcional)</Label>
          <Input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: Manutenção do sistema"
          />
        </div>
      )}

      {/* Validade */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          PRAZO DE VALIDADE
        </Label>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={modoValidade === 'data' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModoValidade('data')}
          >
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Por data
          </Button>
          <Button
            type="button"
            variant={modoValidade === 'dias' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModoValidade('dias')}
          >
            <Clock className="h-3.5 w-3.5 mr-1" />
            Por dias
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setDataValidade(''); setDiasValidade(''); }}
            className="text-muted-foreground"
          >
            Sem limite
          </Button>
        </div>

        {modoValidade === 'data' ? (
          <div className="space-y-1">
            <Input
              type="date"
              value={dataValidade}
              onChange={(e) => setDataValidade(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            {dataValidade && (
              <p className="text-xs text-muted-foreground">
                Sistema válido até {format(new Date(dataValidade + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <Input
              type="number"
              min={1}
              value={diasValidade}
              onChange={(e) => setDiasValidade(e.target.value)}
              placeholder="Quantidade de dias"
            />
            {diasValidade && (
              <p className="text-xs text-muted-foreground">
                Válido até {format(addDays(new Date(), parseInt(diasValidade) || 0), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
        )}

        {!dataValidade && !diasValidade && (
          <p className="text-xs text-muted-foreground italic">Sem data de validade definida — sistema funciona indefinidamente</p>
        )}
      </div>

      {/* Status atual */}
      {config && (
        <div className="text-xs text-muted-foreground space-y-0.5 border-t pt-3">
          <p>Última atualização por: <strong>{config.atualizado_por}</strong></p>
          {dataValidadeFormatada && <p>Validade atual: <strong>{dataValidadeFormatada}</strong></p>}
          {sistemaExpirado && <p className="text-destructive font-medium">⚠ O sistema está expirado!</p>}
        </div>
      )}

      <Button
        onClick={() => updateMutation.mutate()}
        disabled={updateMutation.isPending}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        SALVAR CONFIGURAÇÃO
      </Button>
    </div>
  );
}

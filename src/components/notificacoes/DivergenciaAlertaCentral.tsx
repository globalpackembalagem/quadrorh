import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface DivergenciaAlerta {
  id: string;
  titulo: string;
  mensagem: string;
}

const STORAGE_KEY = 'divergencia_alerta_abertura_count';

export function DivergenciaAlertaCentral() {
  const { isAdmin, userRole } = useAuth();
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState<DivergenciaAlerta[]>([]);
  const [deveExibir, setDeveExibir] = useState(false);

  // Controle: exibir a cada 2ª abertura do sistema
  useEffect(() => {
    if (!isAdmin) return;
    
    const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    const novoCount = count + 1;
    localStorage.setItem(STORAGE_KEY, String(novoCount));
    
    // Exibir a cada 2ª abertura (números pares)
    if (novoCount % 2 === 0) {
      setDeveExibir(true);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !userRole?.id || !deveExibir) return;

    // Buscar notificações não lidas ao carregar
    const buscarPendentes = async () => {
      const { data } = await supabase
        .from('notificacoes')
        .select('id, titulo, mensagem')
        .eq('user_role_id', userRole.id)
        .eq('tipo', 'divergencia_nova')
        .eq('lida', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        setAlertas(data.map(n => ({
          id: n.id,
          titulo: n.titulo,
          mensagem: n.mensagem,
        })));
      }
    };

    buscarPendentes();

    // Escutar novas em tempo real
    const channel = supabase
      .channel('divergencia-alerta-central')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes' },
        (payload) => {
          const notif = payload.new as any;
          if (notif.tipo === 'divergencia_nova' && notif.user_role_id === userRole.id) {
            setAlertas(prev => {
              if (prev.some(a => a.id === notif.id)) return prev;
              return [...prev, {
                id: notif.id,
                titulo: notif.titulo,
                mensagem: notif.mensagem,
              }];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, userRole?.id, deveExibir]);

  const removerAlerta = async (id: string) => {
    // Marcar como lida no banco
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    setAlertas(prev => prev.filter(a => a.id !== id));
  };

  const irParaDivergencias = (id: string) => {
    removerAlerta(id);
    navigate('/divergencias');
  };

  if (alertas.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 pointer-events-auto">
      <div className="space-y-3 max-w-lg w-full mx-4">
        {alertas.map(alerta => (
          <div
            key={alerta.id}
            className="bg-card border-2 border-destructive rounded-xl shadow-2xl p-6 animate-in zoom-in-95 fade-in duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="bg-destructive/10 rounded-full p-3 shrink-0">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-foreground">{alerta.titulo}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">{alerta.mensagem}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={() => removerAlerta(alerta.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-3 mt-5">
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => irParaDivergencias(alerta.id)}
              >
                VER DIVERGÊNCIAS
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => removerAlerta(alerta.id)}
              >
                FECHAR
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

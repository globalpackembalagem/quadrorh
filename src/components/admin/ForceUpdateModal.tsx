import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUsuario } from '@/contexts/UserContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const FORCE_UPDATE_KEY = 'force_update_checked_at';

export function ForceUpdateModal() {
  const { isRHMode } = useUsuario();
  const [open, setOpen] = useState(false);
  const [updateAt, setUpdateAt] = useState(0);

  useQuery({
    queryKey: ['force-update-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('force_update')
        .select('triggered_at')
        .order('triggered_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const lastForceUpdate = new Date(data[0].triggered_at).getTime();
      const sessionExpiry = Number(localStorage.getItem('usuario_sessao_expira') || '0');
      const loginTimestamp = Number(localStorage.getItem('login_timestamp') || '0');
      const loginTime = loginTimestamp > 0 ? loginTimestamp : (sessionExpiry - (12 * 60 * 60 * 1000));
      const lastChecked = Number(localStorage.getItem(FORCE_UPDATE_KEY) || '0');

      if (lastForceUpdate > loginTime && lastForceUpdate > lastChecked) {
        setUpdateAt(lastForceUpdate);
        setOpen(true);
      }

      return data[0];
    },
    enabled: isRHMode,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isRHMode) {
      setOpen(false);
      setUpdateAt(0);
    }
  }, [isRHMode]);

  const atualizarAgora = () => {
    localStorage.setItem(FORCE_UPDATE_KEY, String(updateAt || Date.now()));
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen && setOpen(true)}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Atualizacao obrigatoria
          </DialogTitle>
          <DialogDescription>
            Uma nova versao do sistema foi publicada. Clique em atualizar agora para continuar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full gap-2" onClick={atualizarAgora}>
            <RefreshCw className="h-4 w-4" />
            Atualizar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

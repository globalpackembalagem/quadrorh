import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, UserCog, AlertCircle, ShieldCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function FakeQuadro() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['user-roles-fake'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, nome, fake_quadro_ativo, fake_quadro_config')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ativo, config }: { id: string, ativo: boolean, config: any }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ fake_quadro_ativo: ativo, fake_quadro_config: config })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-fake'] });
      toast.success('Configuração salva com sucesso!');
    },
    onError: (err: any) => toast.error('Erro ao salvar: ' + err.message),
  });

  const filteredUsers = users.filter(u => u.nome?.toLowerCase().includes(search.toLowerCase()));

  const handleToggle = (user: any) => {
    updateMutation.mutate({
      id: user.id,
      ativo: !user.fake_quadro_ativo,
      config: user.fake_quadro_config || {}
    });
  };

  const handleConfigChange = (user: any, key: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const newConfig = { ...(user.fake_quadro_config || {}), [key]: numValue };
    updateMutation.mutate({
      id: user.id,
      ativo: user.fake_quadro_ativo,
      config: newConfig
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">FAKES QUADRO</h1>
      </div>

      <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg flex gap-3 text-amber-800 dark:text-amber-200 text-sm">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p>
          Esta tela permite configurar dados falsos (negativos/desfalque) para usuários específicos. 
          Quando ativo, o dashboard do usuário selecionado exibirá os valores subtraídos conforme configurado aqui.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuário..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map(user => (
          <Card key={user.id} className={user.fake_quadro_ativo ? 'border-primary shadow-md' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase">{user.nome}</CardTitle>
                <Switch
                  checked={user.fake_quadro_ativo}
                  onCheckedChange={() => handleToggle(user)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Desfalque Sopro</Label>
                  <Input
                    type="number"
                    className="h-8"
                    value={user.fake_quadro_config?.desfalque_sopro || 0}
                    onChange={(e) => handleConfigChange(user, 'desfalque_sopro', e.target.value)}
                    disabled={!user.fake_quadro_ativo}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Desfalque Decoração</Label>
                  <Input
                    type="number"
                    className="h-8"
                    value={user.fake_quadro_config?.desfalque_decoracao || 0}
                    onChange={(e) => handleConfigChange(user, 'desfalque_decoracao', e.target.value)}
                    disabled={!user.fake_quadro_ativo}
                  />
                </div>
              </div>
              <Separator />
              <p className="text-[10px] text-muted-foreground italic">
                {user.fake_quadro_ativo 
                  ? "Este usuário está visualizando dados alterados."
                  : "Este usuário visualiza os dados reais do sistema."}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

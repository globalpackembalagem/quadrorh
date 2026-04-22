import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, AlertCircle, ShieldCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/useAuth';

interface FakeConfig {
  sopro?: Record<string, number>;
  deco?: Record<string, number>;
}

export default function FakeQuadro() {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const [search, setSearch] = useState('');

  // Acesso restrito: apenas LUCIANO e MAURICIO
  const nomeNormalizado = (userRole?.nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  const podeAcessar = nomeNormalizado === 'LUCIANO' || nomeNormalizado === 'MAURICIO';

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
    mutationFn: async ({ id, ativo, config }: { id: string, ativo: boolean, config: FakeConfig }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ fake_quadro_ativo: ativo, fake_quadro_config: config as any })
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
      config: (user.fake_quadro_config as FakeConfig) || {}
    });
  };

  const handleConfigChange = (user: any, type: 'sopro' | 'deco', turma: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const currentConfig = (user.fake_quadro_config as FakeConfig) || {};
    const newConfig = {
      ...currentConfig,
      [type]: {
        ...(currentConfig[type] || {}),
        [turma]: numValue
      }
    };
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
          Quando ativo, o dashboard do usuário selecionado exibirá os valores configurados aqui somados ao desfalque real.
          Use valores positivos para <strong>aumentar</strong> o desfalque (piorar o quadro).
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {filteredUsers.map(user => {
          const config = (user.fake_quadro_config as FakeConfig) || {};
          return (
            <Card key={user.id} className={user.fake_quadro_ativo ? 'border-primary shadow-md' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold uppercase">{user.nome}</CardTitle>
                    <p className="text-xs text-muted-foreground">ID: {user.id.substring(0, 8)}...</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{user.fake_quadro_ativo ? 'ATIVO' : 'INATIVO'}</span>
                    <Switch
                      checked={user.fake_quadro_ativo}
                      onCheckedChange={() => handleToggle(user)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="sopro">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sopro">SOPRO</TabsTrigger>
                    <TabsTrigger value="deco">DECORAÇÃO</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="sopro" className="space-y-3 mt-4">
                    <div className="grid grid-cols-3 gap-3">
                      {['A', 'B', 'C'].map(turma => (
                        <div key={turma} className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold">Turma {turma}</Label>
                          <Input
                            type="number"
                            className="h-8 text-center"
                            value={config.sopro?.[turma] || 0}
                            onChange={(e) => handleConfigChange(user, 'sopro', turma, e.target.value)}
                            disabled={!user.fake_quadro_ativo}
                          />
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="deco" className="space-y-3 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      {['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'].map(turma => (
                        <div key={turma} className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold">{turma}</Label>
                          <Input
                            type="number"
                            className="h-8 text-center"
                            value={config.deco?.[turma] || 0}
                            onChange={(e) => handleConfigChange(user, 'deco', turma, e.target.value)}
                            disabled={!user.fake_quadro_ativo}
                          />
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
                
                <Separator />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground italic">
                  <span>{user.fake_quadro_ativo ? "Dados alterados para este usuário" : "Usuário visualiza dados reais"}</span>
                  {user.fake_quadro_ativo && (
                    <span className="text-amber-500 font-bold">● MODO FAKE ATIVO</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

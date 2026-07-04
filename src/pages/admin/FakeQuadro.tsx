import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, AlertCircle, ShieldCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

interface FakeConfig {
  sopro?: Record<string, number>;
  deco?: Record<string, number>;
}

const normalizarNome = (nome?: string | null) =>
  (nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

const configVazia: FakeConfig = { sopro: {}, deco: {} };

export default function FakeQuadro() {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const [search, setSearch] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const podeAcessar = normalizarNome(userRole?.nome) === 'LUCIANO';

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
    mutationFn: async ({ ids, ativo, config }: { ids: string[]; ativo: boolean; config?: FakeConfig }) => {
      const updates = ids.map((id) => {
        const payload: any = { fake_quadro_ativo: ativo };
        if (config) payload.fake_quadro_config = config as any;
        return supabase.functions.invoke('auth-handler', {
          body: {
            action: 'admin_update_user_extra',
            session_token: userRole?.session_token,
            user_id: id,
            campos: payload,
          },
        });
      });

      const results = await Promise.all(updates);
      const error = results.find((result) => result.error || result.data?.error);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-fake'] });
      toast.success('Configuracao salva.');
    },
    onError: (err: any) => toast.error('Erro ao salvar: ' + err.message),
  });

  const filteredUsers = users.filter((u: any) =>
    normalizarNome(u.nome).includes(normalizarNome(search))
  );

  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selecionarTodosFiltrados = () => {
    setSelecionados(new Set(filteredUsers.map((user: any) => user.id)));
  };

  const limparSelecao = () => setSelecionados(new Set());

  const aplicarSelecionados = (ativo: boolean) => {
    const ids = Array.from(selecionados);
    if (ids.length === 0) {
      toast.warning('Selecione pelo menos um usuario.');
      return;
    }
    updateMutation.mutate({ ids, ativo, config: ativo ? undefined : configVazia });
  };

  const handleToggle = (user: any) => {
    updateMutation.mutate({
      ids: [user.id],
      ativo: !user.fake_quadro_ativo,
      config: (user.fake_quadro_config as FakeConfig) || configVazia,
    });
  };

  const handleConfigChange = (user: any, type: 'sopro' | 'deco', turma: string, value: string) => {
    const numValue = Math.max(0, parseInt(value, 10) || 0);
    const currentConfig = (user.fake_quadro_config as FakeConfig) || {};
    const newConfig = {
      ...currentConfig,
      [type]: {
        ...(currentConfig[type] || {}),
        [turma]: numValue,
      },
    };

    updateMutation.mutate({
      ids: [user.id],
      ativo: user.fake_quadro_ativo,
      config: newConfig,
    });
  };

  if (!podeAcessar) {
    return <Navigate to="/home" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">QUADRO FAKE</h1>
      </div>

      <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg flex gap-3 text-amber-800 dark:text-amber-200 text-sm">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p>
          Tela exclusiva do LUCIANO. Selecione uma ou mais usuarias, ative o fake e configure os valores
          de SOPRO e DECORACAO no card de cada uma. Valores positivos tiram pessoas do quadro exibido.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuario..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={selecionarTodosFiltrados}>
              Selecionar filtrados
            </Button>
            <Button size="sm" variant="outline" onClick={limparSelecao}>
              Limpar selecao
            </Button>
            <Button size="sm" onClick={() => aplicarSelecionados(true)}>
              Ativar fake selecionados
            </Button>
            <Button size="sm" variant="secondary" onClick={() => aplicarSelecionados(false)}>
              Desativar fake selecionados
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {selecionados.size} usuario(s) selecionado(s). Depois de ativar, ajuste SOPRO e DECORACAO no card do usuario.
          </p>
        </CardContent>
      </Card>

      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum usuario encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {filteredUsers.map((user: any) => {
            const config = (user.fake_quadro_config as FakeConfig) || {};
            const isSelecionado = selecionados.has(user.id);

            return (
              <Card key={user.id} className={user.fake_quadro_ativo ? 'border-primary shadow-md' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Checkbox
                        checked={isSelecionado}
                        onCheckedChange={() => toggleSelecionado(user.id)}
                        className="mt-1"
                      />
                      <div className="space-y-1 min-w-0">
                        <CardTitle className="text-base font-bold uppercase truncate">{user.nome}</CardTitle>
                        <p className="text-xs text-muted-foreground">ID: {user.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{user.fake_quadro_ativo ? 'ATIVO' : 'INATIVO'}</span>
                      <Switch
                        checked={!!user.fake_quadro_ativo}
                        onCheckedChange={() => handleToggle(user)}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Tabs defaultValue="sopro">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="sopro">SOPRO</TabsTrigger>
                      <TabsTrigger value="deco">DECORACAO</TabsTrigger>
                    </TabsList>

                    <TabsContent value="sopro" className="space-y-3 mt-4">
                      <div className="grid grid-cols-3 gap-3">
                        {['A', 'B', 'C'].map((turma) => (
                          <div key={turma} className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold">Tirar MOD - SOPRO {turma}</Label>
                            <Input
                              type="number"
                              min={0}
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
                        {['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'].map((turma) => (
                          <div key={turma} className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold">Tirar DECORACAO {turma}</Label>
                            <Input
                              type="number"
                              min={0}
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
                    <span>{user.fake_quadro_ativo ? 'Usuario visualiza quadro fake' : 'Usuario visualiza dados reais'}</span>
                    {user.fake_quadro_ativo && (
                      <span className="text-amber-500 font-bold">MODO FAKE ATIVO</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

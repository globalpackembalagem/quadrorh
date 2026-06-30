import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Activity, Download, Search, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { loadXLSX } from '@/lib/xlsx';
import { toast } from 'sonner';

interface AcessoUsuario {
  id: string;
  user_role_id: string;
  login_em: string;
  ultima_atividade_em: string;
  logout_em: string | null;
  user_agent: string | null;
  origem: string | null;
}

interface UsuarioRole {
  id: string;
  nome: string;
  perfil: string | null;
  ativo: boolean | null;
}

const formatarData = (valor?: string | null) => {
  if (!valor) return '-';
  return format(parseISO(valor), 'dd/MM/yyyy HH:mm:ss');
};

const getDispositivo = (userAgent?: string | null) => {
  if (!userAgent) return '-';
  if (/mobile|android|iphone/i.test(userAgent)) return 'Celular';
  if (/tablet|ipad/i.test(userAgent)) return 'Tablet';
  return 'Computador';
};

export default function AcessosUsuarios() {
  const [search, setSearch] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['relatorio_acessos_usuarios'],
    queryFn: async () => {
      const [{ data: acessos, error: acessosError }, { data: usuarios, error: usuariosError }] = await Promise.all([
        (supabase as any)
          .from('acessos_usuarios')
          .select('id,user_role_id,login_em,ultima_atividade_em,logout_em,user_agent,origem')
          .order('login_em', { ascending: false })
          .limit(1000),
        supabase
          .from('user_roles')
          .select('id,nome,perfil,ativo'),
      ]);

      if (acessosError) throw acessosError;
      if (usuariosError) throw usuariosError;

      const usuariosPorId = new Map((usuarios as UsuarioRole[]).map((u) => [u.id, u]));
      return (acessos as AcessoUsuario[]).map((acesso) => ({
        ...acesso,
        usuario: usuariosPorId.get(acesso.user_role_id),
      }));
    },
  });

  const filtrado = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return data;
    return data.filter((item) => {
      const usuario = item.usuario;
      return (
        usuario?.nome?.toLowerCase().includes(termo) ||
        usuario?.perfil?.toLowerCase().includes(termo) ||
        item.origem?.toLowerCase().includes(termo) ||
        getDispositivo(item.user_agent).toLowerCase().includes(termo)
      );
    });
  }, [data, search]);

  const online = useMemo(() => filtrado.filter((item) => !item.logout_em).length, [filtrado]);

  const exportarExcel = async () => {
    if (!filtrado.length) return;
    const XLSX = await loadXLSX();
    const dados = filtrado.map((item) => ({
      Usuario: item.usuario?.nome || 'Usuario removido',
      Perfil: item.usuario?.perfil || '',
      Status: item.logout_em ? 'ENCERRADO' : 'ABERTO',
      Login: formatarData(item.login_em),
      'Ultima atividade': formatarData(item.ultima_atividade_em),
      Logout: formatarData(item.logout_em),
      Origem: item.origem || '',
      Dispositivo: getDispositivo(item.user_agent),
      Navegador: item.user_agent || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Acessos');
    XLSX.writeFile(wb, `relatorio-acessos-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`);
    toast.success('Relatorio exportado.');
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            Relatorio de acessos
          </h1>
          <p className="text-sm text-muted-foreground">
            Login, ultima atividade e saida dos usuarios cadastrados.
          </p>
        </div>
        <Button onClick={exportarExcel} disabled={!filtrado.length} className="gap-2">
          <Download className="h-4 w-4" />
          Excel
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Registros</p>
            <p className="text-2xl font-bold">{filtrado.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Sessoes abertas</p>
            <p className="text-2xl font-bold text-emerald-600">{online}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Usuarios encontrados</p>
            <p className="text-2xl font-bold">
              {new Set(filtrado.map((item) => item.user_role_id)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar usuario, perfil ou dispositivo..."
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3 text-left">Usuario</th>
              <th className="px-3 py-3 text-left">Perfil</th>
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3 text-left">Login</th>
              <th className="px-3 py-3 text-left">Ultima atividade</th>
              <th className="px-3 py-3 text-left">Logout</th>
              <th className="px-3 py-3 text-left">Dispositivo</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            ) : filtrado.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhum acesso encontrado.
                </td>
              </tr>
            ) : (
              filtrado.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      {item.usuario?.nome || 'Usuario removido'}
                    </span>
                  </td>
                  <td className="px-3 py-3">{item.usuario?.perfil || '-'}</td>
                  <td className="px-3 py-3">
                    <Badge variant={item.logout_em ? 'secondary' : 'default'}>
                      {item.logout_em ? 'Encerrado' : 'Aberto'}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">{formatarData(item.login_em)}</td>
                  <td className="px-3 py-3">{formatarData(item.ultima_atividade_em)}</td>
                  <td className="px-3 py-3">{formatarData(item.logout_em)}</td>
                  <td className="px-3 py-3">{getDispositivo(item.user_agent)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

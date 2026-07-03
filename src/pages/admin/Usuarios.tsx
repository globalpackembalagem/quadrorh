import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSetoresAtivos } from '@/hooks/useSetores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Eye, EyeOff,
  ShieldCheck, Users, UserCog, UserCheck, Building2,
  FileText, ClipboardList, CalendarCheck, Timer, Star,
  History, Monitor, Smartphone, Shield, LogIn,
} from 'lucide-react';
import { useUsuario } from '@/contexts/UserContext';
import { montarUsuarioLocal } from '@/lib/montarUsuarioLocal';
import { useNavigate } from 'react-router-dom';
import { PermissoesCheckboxes, Permissoes } from '@/components/usuarios/PermissoesCheckboxes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SistemaValidadeConfig from '@/components/admin/SistemaValidadeConfig';

interface UserRoleSetor {
  setor_id: string;
  setor?: { nome: string };
}

interface UserRole {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  setor_id: string | null;
  ativo: boolean;
  created_at: string;
  tempo_inatividade: number;
  setor?: { nome: string } | null;
  user_roles_setores?: UserRoleSetor[];
  pode_visualizar_funcionarios: boolean;
  pode_editar_funcionarios: boolean;
  pode_editar_demissoes: boolean;
  pode_editar_homologacoes: boolean;
  pode_editar_faltas: boolean;
  pode_criar_divergencias: boolean;
  pode_exportar_excel: boolean;
  acesso_admin: boolean;
  recebe_notificacoes: boolean;
  tipos_notificacao?: string[] | null;
}

const USER_ROLE_SELECT = `
  id, user_id, nome, email, setor_id, ativo, created_at, tempo_inatividade,
  pode_visualizar_funcionarios, pode_editar_funcionarios,
  pode_visualizar_previsao, pode_editar_previsao,
  pode_visualizar_coberturas, pode_editar_coberturas,
  pode_visualizar_faltas, pode_editar_faltas,
  pode_visualizar_demissoes, pode_editar_demissoes,
  pode_visualizar_homologacoes, pode_editar_homologacoes,
  pode_visualizar_divergencias, pode_criar_divergencias,
  pode_visualizar_troca_turno, pode_editar_troca_turno,
  pode_visualizar_armarios, pode_editar_armarios,
  pode_exportar_excel, acesso_admin, recebe_notificacoes, tipos_notificacao
`;

const DEFAULT_PERMISSOES: Permissoes = {
  pode_visualizar_funcionarios: true,
  pode_editar_funcionarios: false,
  pode_visualizar_previsao: true,
  pode_editar_previsao: false,
  pode_visualizar_coberturas: true,
  pode_editar_coberturas: false,
  pode_visualizar_faltas: true,
  pode_editar_faltas: false,
  pode_visualizar_demissoes: false,
  pode_editar_demissoes: false,
  pode_visualizar_homologacoes: false,
  pode_editar_homologacoes: false,
  pode_visualizar_divergencias: false,
  pode_criar_divergencias: false,
  pode_visualizar_troca_turno: true,
  pode_editar_troca_turno: true,
  pode_visualizar_armarios: false,
  pode_editar_armarios: false,
  pode_visualizar_integracoes: true,
  pode_editar_integracoes: false,
  pode_exportar_excel: true,
  acesso_admin: false,
  recebe_notificacoes: true,
};

const TIPOS_NOTIFICACAO = [
  { value: 'admissao', label: 'ADMISSAO' },
  { value: 'transferencia', label: 'TRANSFERENCIA / TROCA TURNO' },
  { value: 'turma_pendente', label: 'TURMA PENDENTE' },
];

// Determinar grupo/tipo do usuário
function getTipoUsuario(user: UserRole): { label: string; icon: React.ReactNode; color: string } {
  if (user.acesso_admin) return { label: 'Admin', icon: <ShieldCheck className="h-3.5 w-3.5" />, color: 'text-destructive' };
  if (user.pode_editar_faltas) return { label: 'Gestor', icon: <UserCog className="h-3.5 w-3.5" />, color: 'text-primary' };
  if (user.pode_editar_demissoes || user.pode_editar_homologacoes || user.pode_editar_funcionarios)
    return { label: 'RH', icon: <UserCheck className="h-3.5 w-3.5" />, color: 'text-success' };
  if (user.nome === 'REAL PARCERIA') return { label: 'Externo', icon: <Building2 className="h-3.5 w-3.5" />, color: 'text-muted-foreground' };
  return { label: 'Visualização', icon: <Eye className="h-3.5 w-3.5" />, color: 'text-muted-foreground' };
}

// Ícones de permissões individuais
const PERM_ICONS: { key: keyof UserRole; label: string; icon: React.ReactNode }[] = [
  { key: 'pode_editar_funcionarios', label: 'Editar Funcionários', icon: <Users className="h-3 w-3" /> },
  { key: 'pode_editar_demissoes', label: 'Demissões', icon: <FileText className="h-3 w-3" /> },
  { key: 'pode_editar_homologacoes', label: 'Homologações', icon: <CalendarCheck className="h-3 w-3" /> },
  { key: 'pode_editar_faltas', label: 'Faltas', icon: <ClipboardList className="h-3 w-3" /> },
];

export default function Usuarios() {
  const queryClient = useQueryClient();
  const { isAdmin, usuarioAtual, setUsuarioAtual } = useUsuario();
  const { data: setores = [] } = useSetoresAtivos();
  const navigate = useNavigate();
  const isMaster = usuarioAtual.nome.toUpperCase() === 'LUCIANO';

  const acessarComoUsuario = async (userId: string, userNome: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`${USER_ROLE_SELECT}, user_roles_setores(setor_id)`)
        .eq('id', userId)
        .single();
      if (error) throw error;
      setUsuarioAtual(montarUsuarioLocal(data));
      await supabase.from('historico_acesso').insert({
        user_role_id: userId,
        nome_usuario: `${userNome} (IMPERSONADO POR LUCIANO)`,
        navegador: navigator.userAgent.substring(0, 200),
        dispositivo: /Mobi|Android/i.test(navigator.userAgent) ? 'MOBILE' : 'DESKTOP',
      });
      toast.success(`Acessando como ${userNome.toUpperCase()}`);
      navigate('/home');
    } catch (e) {
      toast.error('Erro ao acessar como usuário');
      console.error(e);
    }
  };

  const [activeTab, setActiveTab] = useState('usuarios');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRole | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [setoresIds, setSetoresIds] = useState<string[]>([]);
  const [permissoes, setPermissoes] = useState<Permissoes>(DEFAULT_PERMISSOES);
  const [tiposNotificacao, setTiposNotificacao] = useState<string[]>(TIPOS_NOTIFICACAO.map(t => t.value));
  const [ativo, setAtivo] = useState(true);
  const [tempoInatividade, setTempoInatividade] = useState(4);
  const [tipoAcesso, setTipoAcesso] = useState<'admin' | 'rh' | 'gestor' | 'visualizacao'>('visualizacao');

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['user_roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`${USER_ROLE_SELECT}, setor:setores(nome), user_roles_setores(setor_id, setor:setores(nome))`)
        .order('nome');
      if (error) throw error;
      return data as UserRole[];
    },
  });

  const { data: historicoAcesso = [], isLoading: isLoadingHistorico } = useQuery({
    queryKey: ['historico_acesso'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_acesso')
        .select('*')
        .order('data_acesso', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: activeTab === 'historico',
  });

  const createUserMutation = useMutation({
    mutationFn: async ({ nome, email, senha, setoresIds, permissoes, tiposNotificacao }: {
      nome: string; email: string; senha: string; setoresIds: string[]; permissoes: Permissoes; tiposNotificacao: string[];
    }) => {
      const { pode_visualizar_integracoes, pode_editar_integracoes, ...permissoesRestritas } = permissoes;
      
      // Inserir usuário com senha temporária (será substituída pelo hash)
      const { data: createResult, error: createError } = await supabase.functions.invoke('auth-handler', {
        body: {
          action: 'admin_create_user',
          admin_id: usuarioAtual.id,
          nome,
          email,
          setoresIds,
          permissoes: permissoesRestritas,
          tiposNotificacao,
          tempoInatividade,
        },
      });
      if (createError || createResult?.error) throw createError || new Error(createResult.error);
      const roleData = createResult.user;

      // Hashear a senha real via Edge Function
      const senhaReal = senha || '123456';
      const { data: hashResult, error: hashError } = await supabase.functions.invoke('auth-handler', {
        body: { action: 'admin_reset_password', user_id: roleData.id, nova_senha: senhaReal, admin_id: usuarioAtual.id },
      });
      if (hashError || hashResult?.error) {
        console.error('Erro ao hashear senha:', hashError || hashResult?.error);
      }

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      toast.success('Usuário criado com senha protegida!');
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => toast.error('Erro ao criar usuário: ' + error.message),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, nome, email, senha, setoresIds, permissoes, ativo, tempoInatividade, tiposNotificacao }: {
      id: string; nome: string; email: string; senha?: string;
      setoresIds: string[]; permissoes: Permissoes; ativo: boolean; tempoInatividade: number; tiposNotificacao: string[];
    }) => {
      const { pode_visualizar_integracoes, pode_editar_integracoes, ...permissoesRestritas } = permissoes;
      const { data: updateResult, error: updateError } = await supabase.functions.invoke('auth-handler', {
        body: {
          action: 'admin_update_user',
          admin_id: usuarioAtual.id,
          user_id: id,
          nome,
          email,
          setoresIds,
          permissoes: permissoesRestritas,
          ativo,
          tempoInatividade,
          tiposNotificacao,
        },
      });
      if (updateError || updateResult?.error) throw updateError || new Error(updateResult.error);

      if (senha && senha.trim() !== '') {
        const { data: hashResult, error: hashError } = await supabase.functions.invoke('auth-handler', {
          body: { action: 'admin_reset_password', user_id: id, nova_senha: senha, admin_id: usuarioAtual.id },
        });
        if (hashError || hashResult?.error) {
          toast.error('Erro ao atualizar senha: ' + (hashResult?.error || 'erro desconhecido'));
        }
      }

      if (id === usuarioAtual.id) {
        const { data: usuarioAtualizado } = await supabase
          .from('user_roles')
          .select(`${USER_ROLE_SELECT}, user_roles_setores(setor_id)`)
          .eq('id', id)
          .single();
        if (usuarioAtualizado) setUsuarioAtual(montarUsuarioLocal(usuarioAtualizado));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      toast.success('Usuário atualizado!');
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast.error('Erro ao atualizar usuário'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('auth-handler', {
        body: { action: 'admin_delete_user', admin_id: usuarioAtual.id, user_id: id },
      });
      if (error || data?.error) throw error || new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      toast.success('Usuário excluído!');
    },
    onError: () => toast.error('Erro ao excluir usuário'),
  });

  const resetForm = () => {
    setNome(''); setEmail(''); setSenha(''); setMostrarSenha(false);
    setSetoresIds([]); setPermissoes(DEFAULT_PERMISSOES);
    setTiposNotificacao(TIPOS_NOTIFICACAO.map(t => t.value));
    setAtivo(true); setTempoInatividade(4); setEditingUser(null);
    setTipoAcesso('visualizacao');
  };

  const handleTipoAcessoChange = (tipo: 'admin' | 'rh' | 'gestor' | 'visualizacao') => {
    setTipoAcesso(tipo);
    if (tipo === 'admin') {
      setPermissoes({
        pode_visualizar_funcionarios: true, pode_editar_funcionarios: true,
        pode_visualizar_previsao: true, pode_editar_previsao: true,
        pode_visualizar_coberturas: true, pode_editar_coberturas: true,
        pode_visualizar_faltas: true, pode_editar_faltas: true,
        pode_visualizar_demissoes: true, pode_editar_demissoes: true,
        pode_visualizar_homologacoes: true, pode_editar_homologacoes: true,
        pode_visualizar_divergencias: true, pode_criar_divergencias: true,
        pode_visualizar_troca_turno: true, pode_editar_troca_turno: true,
        pode_visualizar_armarios: true, pode_editar_armarios: true,
        pode_visualizar_integracoes: true, pode_editar_integracoes: true,
        pode_exportar_excel: true, acesso_admin: true, recebe_notificacoes: true,
      });
    } else if (tipo === 'rh') {
      setPermissoes({
        pode_visualizar_funcionarios: true, pode_editar_funcionarios: true,
        pode_visualizar_previsao: true, pode_editar_previsao: true,
        pode_visualizar_coberturas: true, pode_editar_coberturas: true,
        pode_visualizar_faltas: true, pode_editar_faltas: true,
        pode_visualizar_demissoes: true, pode_editar_demissoes: true,
        pode_visualizar_homologacoes: true, pode_editar_homologacoes: true,
        pode_visualizar_divergencias: true, pode_criar_divergencias: true,
        pode_visualizar_troca_turno: true, pode_editar_troca_turno: true,
        pode_visualizar_armarios: true, pode_editar_armarios: true,
        pode_visualizar_integracoes: true, pode_editar_integracoes: true,
        pode_exportar_excel: true, acesso_admin: false, recebe_notificacoes: true,
      });
    } else if (tipo === 'gestor') {
      setPermissoes({
        pode_visualizar_funcionarios: true, pode_editar_funcionarios: false,
        pode_visualizar_previsao: true, pode_editar_previsao: false,
        pode_visualizar_coberturas: true, pode_editar_coberturas: false,
        pode_visualizar_faltas: true, pode_editar_faltas: true,
        pode_visualizar_demissoes: false, pode_editar_demissoes: false,
        pode_visualizar_homologacoes: false, pode_editar_homologacoes: false,
        pode_visualizar_divergencias: false, pode_criar_divergencias: false,
        pode_visualizar_troca_turno: true, pode_editar_troca_turno: true,
        pode_visualizar_armarios: false, pode_editar_armarios: false,
        pode_visualizar_integracoes: true, pode_editar_integracoes: false,
        pode_exportar_excel: true, acesso_admin: false, recebe_notificacoes: true,
      });
    } else {
      setPermissoes(DEFAULT_PERMISSOES);
    }
  };

  const detectTipoAcesso = (user: UserRole): 'admin' | 'rh' | 'gestor' | 'visualizacao' => {
    if (user.acesso_admin) return 'admin';
    if (user.pode_editar_demissoes || user.pode_editar_homologacoes || user.pode_editar_funcionarios) return 'rh';
    if (user.pode_editar_faltas) return 'gestor';
    return 'visualizacao';
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (user: UserRole) => {
    setEditingUser(user);
    setNome(user.nome);
    setEmail(user.email || '');
    setAtivo(user.ativo);
    const userSetores = user.user_roles_setores?.map(s => s.setor_id) || [];
    if (user.setor_id && !userSetores.includes(user.setor_id)) userSetores.unshift(user.setor_id);
    setSetoresIds(userSetores);
    setPermissoes({
      pode_visualizar_funcionarios: user.pode_visualizar_funcionarios,
      pode_editar_funcionarios: user.pode_editar_funcionarios,
      pode_visualizar_previsao: (user as any).pode_visualizar_previsao ?? user.pode_visualizar_funcionarios,
      pode_editar_previsao: (user as any).pode_editar_previsao ?? user.pode_editar_funcionarios,
      pode_visualizar_coberturas: (user as any).pode_visualizar_coberturas ?? user.pode_visualizar_funcionarios,
      pode_editar_coberturas: (user as any).pode_editar_coberturas ?? user.pode_editar_funcionarios,
      pode_visualizar_faltas: (user as any).pode_visualizar_faltas ?? user.pode_editar_faltas,
      pode_editar_faltas: user.pode_editar_faltas,
      pode_visualizar_demissoes: (user as any).pode_visualizar_demissoes ?? user.pode_editar_demissoes,
      pode_editar_demissoes: user.pode_editar_demissoes,
      pode_visualizar_homologacoes: (user as any).pode_visualizar_homologacoes ?? user.pode_editar_homologacoes,
      pode_editar_homologacoes: user.pode_editar_homologacoes,
      pode_visualizar_divergencias: (user as any).pode_visualizar_divergencias ?? user.pode_criar_divergencias,
      pode_criar_divergencias: user.pode_criar_divergencias,
      pode_visualizar_troca_turno: (user as any).pode_visualizar_troca_turno ?? true,
      pode_editar_troca_turno: (user as any).pode_editar_troca_turno ?? true,
      pode_visualizar_armarios: (user as any).pode_visualizar_armarios ?? false,
      pode_editar_armarios: (user as any).pode_editar_armarios ?? false,
      pode_visualizar_integracoes: (user as any).pode_visualizar_integracao ?? (user as any).pode_visualizar_integracoes ?? true,
      pode_editar_integracoes: (user as any).pode_editar_integracao ?? (user as any).pode_editar_integracoes ?? false,
      pode_exportar_excel: user.pode_exportar_excel,
      acesso_admin: user.acesso_admin,
      recebe_notificacoes: user.recebe_notificacoes ?? true,
    });
    setTempoInatividade(user.tempo_inatividade ?? 4);
    setTiposNotificacao(user.tipos_notificacao?.length ? user.tipos_notificacao : TIPOS_NOTIFICACAO.map(t => t.value));
    setTipoAcesso(detectTipoAcesso(user));
    setDialogOpen(true);
  };

  const handleTipoNotificacaoToggle = (tipo: string) => {
    setTiposNotificacao(prev =>
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    );
  };

  const handleSetorToggle = (setorId: string) =>
    setSetoresIds(prev => prev.includes(setorId) ? prev.filter(id => id !== setorId) : [...prev, setorId]);

  const handleSelectAllSetores = (selectAll: boolean) =>
    setSetoresIds(selectAll ? setores.map(s => s.id) : []);

  const todosSetoresSelecionados = setores.length > 0 && setoresIds.length === setores.length;

  const getUserSetoresDisplay = (user: UserRole) => {
    const allSetores: string[] = [];
    if (user.setor?.nome) allSetores.push(user.setor.nome.toUpperCase());
    user.user_roles_setores?.forEach(s => {
      if (s.setor?.nome && !allSetores.includes(s.setor.nome.toUpperCase()))
        allSetores.push(s.setor.nome.toUpperCase());
    });
    if (allSetores.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
    if (allSetores.length <= 2) return <span className="text-xs">{allSetores.join(', ')}</span>;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs cursor-help border-b border-dashed border-muted-foreground">
              {allSetores.slice(0, 2).join(', ')} <span className="text-muted-foreground">+{allSetores.length - 2}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent><p className="text-xs">{allSetores.join(', ')}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) { toast.error('Informe o nome do usuário'); return; }
    if (editingUser) {
      await updateUserMutation.mutateAsync({ id: editingUser.id, nome, email, senha, setoresIds, permissoes, ativo, tempoInatividade, tiposNotificacao });
    } else {
      await createUserMutation.mutateAsync({ nome, email, senha, setoresIds, permissoes, tiposNotificacao });
    }
  };

  // Agrupar usuários por tipo
  const admins = usuarios.filter(u => u.acesso_admin);
  const gestores = usuarios.filter(u => !u.acesso_admin && u.pode_editar_faltas);
  const rhUsers = usuarios.filter(u => !u.acesso_admin && !u.pode_editar_faltas && (u.pode_editar_demissoes || u.pode_editar_homologacoes || u.pode_editar_funcionarios));
  const outros = usuarios.filter(u => !u.acesso_admin && !u.pode_editar_faltas && !u.pode_editar_demissoes && !u.pode_editar_homologacoes && !u.pode_editar_funcionarios);

  if (!isAdmin) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Acesso restrito a administradores</p>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const renderGroup = (title: string, icon: React.ReactNode, users: UserRole[], colorClass: string) => {
    if (users.length === 0) return null;
    return (
      <div className="space-y-1">
        <div className={cn("flex items-center gap-2 px-1 py-1.5 text-xs font-semibold tracking-wider", colorClass)}>
          {icon}
          {title}
          <span className="ml-1 font-normal text-muted-foreground">({users.length})</span>
        </div>
        {users.map((user) => {
          const isLuciano = user.nome.toUpperCase() === 'LUCIANO';
          const tipo = getTipoUsuario(user);
          return (
            <div
              key={user.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors group"
            >
              {/* Nome + badges */}
              <div className="flex items-center gap-2 min-w-[140px]">
                <span className="font-semibold text-sm">{user.nome.toUpperCase()}</span>
                {isLuciano && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5 border-warning/50 text-warning">
                    <Star className="h-2.5 w-2.5" /> MESTRE
                  </Badge>
                )}
                {!user.ativo && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">INATIVO</Badge>
                )}
              </div>

              {/* Email */}
              <div className="flex-1 text-xs text-muted-foreground truncate hidden sm:block">
                {user.email || <span className="italic">sem email</span>}
              </div>

              {/* Setores */}
              <div className="min-w-[120px] hidden md:block">
                {getUserSetoresDisplay(user)}
              </div>

              {/* Permissões */}
              <div className="flex items-center gap-1">
                {user.acesso_admin ? (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">ADMIN TOTAL</Badge>
                ) : (
                  <TooltipProvider>
                    <div className="flex gap-1">
                      {PERM_ICONS.map(({ key, label, icon: pIcon }) =>
                        user[key] ? (
                          <Tooltip key={key}>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-primary/10 text-primary border border-primary/20 cursor-default">
                                {pIcon}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p className="text-xs">{label}</p></TooltipContent>
                          </Tooltip>
                        ) : null
                      )}
                      {!user.pode_editar_demissoes && !user.pode_editar_homologacoes && !user.pode_editar_faltas && !user.pode_editar_funcionarios && (
                        <span className="text-xs text-muted-foreground italic">Só visualiza</span>
                      )}
                    </div>
                  </TooltipProvider>
                )}
              </div>

              {/* Inatividade */}
              <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground min-w-[60px]">
                <Timer className="h-3 w-3" />
                {user.tempo_inatividade === 0 ? '∞' : `${user.tempo_inatividade}min`}
              </div>

              {/* Ações */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isMaster && !isLuciano && user.ativo && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-primary hover:text-primary"
                          onClick={() => acessarComoUsuario(user.id, user.nome)}
                        >
                          <LogIn className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">Acessar como {user.nome.toUpperCase()}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(user)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {!isLuciano && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir <strong>{user.nome}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteUserMutation.mutate(user.id)}
                          className="bg-destructive text-destructive-foreground"
                        >Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">USUÁRIOS</h1>
          <p className="page-description">Gerenciar usuários e permissões do sistema</p>
        </div>
        {activeTab === 'usuarios' && (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            NOVO USUÁRIO
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" />
            USUÁRIOS
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            HISTÓRICO DE ACESSO
          </TabsTrigger>
          {usuarioAtual.nome.toUpperCase() === 'LUCIANO' && (
            <TabsTrigger value="sistema" className="gap-2">
              <Shield className="h-4 w-4" />
              SISTEMA
            </TabsTrigger>
          )}
        </TabsList>

        {/* Aba: Lista de Usuários */}
        <TabsContent value="usuarios" className="space-y-4 mt-4">
          {renderGroup('Administradores', <ShieldCheck className="h-3.5 w-3.5" />, admins, 'text-destructive')}
          {renderGroup('RH', <UserCheck className="h-3.5 w-3.5" />, rhUsers, 'text-success')}
          {renderGroup('Gestores de Setor', <UserCog className="h-3.5 w-3.5" />, gestores, 'text-primary')}
          {renderGroup('Outros / Externos', <Eye className="h-3.5 w-3.5" />, outros, 'text-muted-foreground')}
        </TabsContent>

        {/* Aba: Histórico de Acesso */}
        <TabsContent value="historico" className="mt-4">
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-sm">REGISTRO DE ACESSOS</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {historicoAcesso.length} registro(s) — últimos 500 acessos
              </p>
            </div>

            {isLoadingHistorico ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : historicoAcesso.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                <History className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhum acesso registrado ainda</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>USUÁRIO</TableHead>
                    <TableHead>DATA / HORA</TableHead>
                    <TableHead>DISPOSITIVO</TableHead>
                    <TableHead className="hidden lg:table-cell">NAVEGADOR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoAcesso.map((acesso: any) => {
                    const data = new Date(acesso.data_acesso);
                    const isMobile = acesso.dispositivo === 'MOBILE';
                    const ua = acesso.navegador || '';
                    let browser = 'Desconhecido';
                    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
                    else if (ua.includes('Firefox')) browser = 'Firefox';
                    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
                    else if (ua.includes('Edg')) browser = 'Edge';
                    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

                    return (
                      <TableRow key={acesso.id}>
                        <TableCell className="font-medium">
                          {acesso.nome_usuario?.toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(data, "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(data, "HH:mm:ss", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {isMobile ? (
                              <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="text-xs">{isMobile ? 'Mobile' : 'Desktop'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline" className="text-xs font-normal">
                            {browser}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Aba: Controle do Sistema (somente LUCIANO) */}
        {usuarioAtual.nome.toUpperCase() === 'LUCIANO' && (
          <TabsContent value="sistema" className="mt-4">
            <SistemaValidadeConfig />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'EDITAR USUÁRIO' : 'NOVO USUÁRIO'}</DialogTitle>
            <DialogDescription>Configure o nome, setores e permissões do usuário</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} placeholder="Nome do usuário" required />
            </div>

            {/* Email */}
            {/* Senha */}
            <div className="space-y-2">
              <Label>{editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}</Label>
              <div className="relative">
                <Input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder={editingUser ? 'Deixe em branco para manter' : 'Senha do usuário (padrão: 123456)'}
                  className="pr-10"
                />
                <Button
                  type="button" variant="ghost" size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
              {!editingUser && <p className="text-xs text-muted-foreground">Se não informar, a senha padrão será "123456"</p>}
            </div>

            {/* Tipo de Acesso */}
            <div className="space-y-2">
              <Label>Tipo de Acesso</Label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { value: 'admin' as const, label: 'ADMIN', icon: <ShieldCheck className="h-4 w-4" />, desc: 'Acesso total', color: 'border-destructive/50 bg-destructive/10 text-destructive' },
                  { value: 'rh' as const, label: 'RH', icon: <UserCheck className="h-4 w-4" />, desc: 'Gestão completa', color: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400' },
                  { value: 'gestor' as const, label: 'GESTOR', icon: <UserCog className="h-4 w-4" />, desc: 'Por setor', color: 'border-primary/50 bg-primary/10 text-primary' },
                  { value: 'visualizacao' as const, label: 'VISUALIZAÇÃO', icon: <Eye className="h-4 w-4" />, desc: 'Somente leitura', color: 'border-muted-foreground/30 bg-muted/30 text-muted-foreground' },
                ]).map(tipo => (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => handleTipoAcessoChange(tipo.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center',
                      tipoAcesso === tipo.value
                        ? tipo.color + ' ring-2 ring-offset-1 ring-offset-background ' + (tipo.value === 'admin' ? 'ring-destructive/30' : tipo.value === 'rh' ? 'ring-green-500/30' : tipo.value === 'gestor' ? 'ring-primary/30' : 'ring-muted-foreground/20')
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {tipo.icon}
                    <span className="text-[11px] font-bold">{tipo.label}</span>
                    <span className="text-[9px] opacity-70">{tipo.desc}</span>
                  </button>
                ))}
              </div>
              {tipoAcesso === 'gestor' && (
                <p className="text-xs text-primary font-medium">⚠ Selecione os setores abaixo para definir o acesso do gestor</p>
              )}
            </div>


            {editingUser && editingUser.nome.toUpperCase() !== 'LUCIANO' && (
              <div className="flex items-center justify-between">
                <div>
                  <Label>Status do Usuário</Label>
                  <p className="text-xs text-muted-foreground">Usuário inativo não consegue acessar o sistema</p>
                </div>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>
            )}
            {editingUser && editingUser.nome.toUpperCase() === 'LUCIANO' && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div>
                  <Label className="text-muted-foreground">Status do Usuário</Label>
                  <p className="text-xs text-muted-foreground">LUCIANO é o admin mestre e não pode ser desativado</p>
                </div>
                <Badge>ATIVO</Badge>
              </div>
            )}

            {/* Tempo de Inatividade */}
            <div className="space-y-2">
              <Label>Tempo de Inatividade (minutos)</Label>
              <Input type="number" min={0} value={tempoInatividade} onChange={(e) => setTempoInatividade(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">
                {tempoInatividade === 0 ? 'Sessão ilimitada (sem desconexão automática)' : `Desconecta após ${tempoInatividade} minuto(s) de inatividade`}
              </p>
            </div>

            {/* Setores */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Setores Vinculados</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox id="selecionar-todos" checked={todosSetoresSelecionados} onCheckedChange={(checked) => handleSelectAllSetores(!!checked)} />
                  <label htmlFor="selecionar-todos" className="text-xs font-medium leading-none cursor-pointer text-muted-foreground">
                    Selecionar Todos
                  </label>
                </div>
              </div>
              <div className="border rounded-lg p-3 max-h-36 overflow-y-auto space-y-2">
                {setores.map((setor) => (
                  <div key={setor.id} className="flex items-center space-x-2">
                    <Checkbox id={`setor-${setor.id}`} checked={setoresIds.includes(setor.id)} onCheckedChange={() => handleSetorToggle(setor.id)} />
                    <label htmlFor={`setor-${setor.id}`} className="text-sm font-medium leading-none cursor-pointer">{setor.nome.toUpperCase()}</label>
                  </div>
                ))}
              </div>
              {setoresIds.length > 0 && <p className="text-xs text-muted-foreground">{setoresIds.length} setor(es) selecionado(s)</p>}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tipos de Notificação</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notificacoes-todas"
                    checked={tiposNotificacao.length === TIPOS_NOTIFICACAO.length}
                    onCheckedChange={(checked) => setTiposNotificacao(checked ? TIPOS_NOTIFICACAO.map(t => t.value) : [])}
                  />
                  <label htmlFor="notificacoes-todas" className="text-xs font-medium leading-none cursor-pointer text-muted-foreground">
                    Selecionar Todas
                  </label>
                </div>
              </div>
              <div className="border rounded-lg p-3 grid grid-cols-2 gap-2">
                {TIPOS_NOTIFICACAO.map((tipo) => (
                  <div key={tipo.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`notif-${tipo.value}`}
                      checked={tiposNotificacao.includes(tipo.value)}
                      onCheckedChange={() => handleTipoNotificacaoToggle(tipo.value)}
                    />
                    <label htmlFor={`notif-${tipo.value}`} className="text-xs font-medium leading-none cursor-pointer">
                      {tipo.label}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                O usuário só verá na central os tipos marcados aqui.
              </p>
            </div>

            {/* Permissões */}
            <div className="space-y-3">
              <Label>Permissões</Label>
              <div className="border rounded-lg p-4">
                <PermissoesCheckboxes permissoes={permissoes} onChange={setPermissoes} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createUserMutation.isPending || updateUserMutation.isPending}>
                {editingUser ? 'Salvar' : 'Criar Usuário'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

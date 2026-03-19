import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { EventoSistema } from '@/hooks/useEventosSistema';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, CheckSquare, Square, Eye, EyeOff, Bell, UserMinus, AlertTriangle, UserPlus, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIPO_OPTIONS = [
  { value: 'admissao', label: 'ADMISSÃO' },
  { value: 'demissao', label: 'DEMISSÃO' },
  { value: 'pedido_demissao', label: 'PED. DEMISSÃO' },
  { value: 'transferencia', label: 'TRANSFERÊNCIA' },
  { value: 'previsao_admissao', label: 'PREVISÃO DE ADMISSÃO' },
  { value: 'evento_sistema_modal', label: 'COMUNICADO GERAL' },
];

const TIPO_PREVIEW_CONFIG: Record<string, { icon: typeof Bell; badgeLabel: string; badgeClass: string; bgColor: string; borderColor: string; iconColor: string }> = {
  admissao: { icon: UserPlus, badgeLabel: 'ADMISSÃO', badgeClass: 'bg-emerald-600 text-white', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', borderColor: 'border-emerald-200 dark:border-emerald-800', iconColor: 'text-emerald-600' },
  demissao: { icon: UserMinus, badgeLabel: 'DEMISSÃO', badgeClass: 'bg-red-600 text-white', bgColor: 'bg-red-50 dark:bg-red-950/30', borderColor: 'border-red-200 dark:border-red-800', iconColor: 'text-destructive' },
  pedido_demissao: { icon: AlertTriangle, badgeLabel: 'PED. DEMISSÃO', badgeClass: 'bg-amber-600 text-white', bgColor: 'bg-amber-50 dark:bg-amber-950/30', borderColor: 'border-amber-200 dark:border-amber-800', iconColor: 'text-amber-600' },
  transferencia: { icon: ArrowRightLeft, badgeLabel: 'TRANSFERÊNCIA', badgeClass: 'bg-blue-600 text-white', bgColor: 'bg-blue-50 dark:bg-blue-950/30', borderColor: 'border-blue-200 dark:border-blue-800', iconColor: 'text-blue-600' },
  previsao_admissao: { icon: UserPlus, badgeLabel: 'PREVISÃO ADMISSÃO', badgeClass: 'bg-purple-600 text-white', bgColor: 'bg-purple-50 dark:bg-purple-950/30', borderColor: 'border-purple-200 dark:border-purple-800', iconColor: 'text-purple-600' },
  cobertura_treinamento: { icon: Users, badgeLabel: 'COB. FÉRIAS / TREINAMENTO', badgeClass: 'bg-orange-600 text-white', bgColor: 'bg-orange-50 dark:bg-orange-950/30', borderColor: 'border-orange-200 dark:border-orange-800', iconColor: 'text-orange-600' },
  evento_sistema_modal: { icon: Bell, badgeLabel: 'AVISO RH', badgeClass: 'bg-primary text-primary-foreground', bgColor: 'bg-primary/5', borderColor: 'border-primary/20', iconColor: 'text-primary' },
};

function NotificationPreviewCard({ tipo, mensagem }: { tipo: string; mensagem: string }) {
  const config = TIPO_PREVIEW_CONFIG[tipo] || TIPO_PREVIEW_CONFIG.evento_sistema_modal;
  const Icon = config.icon;
  const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prévia — como o gestor verá:</p>
      <div className={cn('rounded-lg border p-4 space-y-3', config.bgColor, config.borderColor)}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn('mt-0.5 shrink-0', config.iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border-0', config.badgeClass)}>
                {config.badgeLabel}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{now}</span>
            </div>
            <p className="text-xs font-semibold text-foreground">
              {config.badgeLabel} — Evento manual
            </p>
          </div>
        </div>
        {/* Mensagem */}
        <div className="pl-8">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {mensagem || <span className="text-muted-foreground italic">Sua mensagem aparecerá aqui...</span>}
          </p>
        </div>
        {/* Footer simulado */}
        <div className="pl-8 pt-1">
          <div className="flex gap-2">
            <div className="h-8 px-4 rounded-md bg-primary/10 text-primary text-xs font-medium flex items-center">
              CIENTE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PERFIL_LABELS: Record<string, string> = {
  admin: 'ADMIN',
  rh_completo: 'RH COMPLETO',
  rh_demissoes: 'RH DEMISSÕES',
  gestor_setor: 'GESTOR',
  visualizacao: 'VISUALIZAÇÃO',
};

const PERFIL_COLORS: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  rh_completo: 'bg-blue-500/10 text-blue-600 border-blue-200',
  rh_demissoes: 'bg-purple-500/10 text-purple-600 border-purple-200',
  gestor_setor: 'bg-green-500/10 text-green-600 border-green-200',
  visualizacao: 'bg-muted text-muted-foreground border-border',
};

interface UserRoleDestinatario {
  id: string;
  nome: string;
  perfil: string;
  setor_nome?: string;
}

export interface EventoFormSaveData {
  tipo: string;
  descricao: string;
  funcionario_nome: string | null;
  setor_id: string | null;
  setor_nome: string | null;
  turma: string | null;
  mensagem_personalizada?: string | null;
  destinatarios?: string[];
}

interface EventoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento?: EventoSistema | null;
  onSave: (data: EventoFormSaveData) => void;
  isSaving?: boolean;
}

export function EventoFormDialog({ open, onOpenChange, evento, onSave, isSaving }: EventoFormDialogProps) {
  const [tipo, setTipo] = useState('admissao');
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState('');
  const [destinatariosSelecionados, setDestinatariosSelecionados] = useState<Set<string>>(new Set());
  const [modoDestinatario, setModoDestinatario] = useState<'todos' | 'selecionar'>('todos');
  const [buscaDestinatario, setBuscaDestinatario] = useState('');
  const [previewMsg, setPreviewMsg] = useState(false);

  const isEdit = !!evento;

  // Buscar usuários ativos para seleção de destinatários
  const { data: todosUsuarios = [] } = useQuery({
    queryKey: ['user-roles-destinatarios'],
    queryFn: async () => {
      const { data: urs, error } = await supabase
        .from('user_roles')
        .select('id, nome, perfil, setor_id')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;

      const { data: setoresData } = await supabase
        .from('setores')
        .select('id, nome');

      return (urs || []).map(ur => ({
        id: ur.id,
        nome: ur.nome,
        perfil: ur.perfil,
        setor_nome: setoresData?.find(s => s.id === ur.setor_id)?.nome,
      })) as UserRoleDestinatario[];
    },
    enabled: open,
  });

  // Filtrar destinatários
  const destinatariosFiltrados = useMemo(() => {
    if (!buscaDestinatario.trim()) return todosUsuarios;
    const termo = buscaDestinatario.toUpperCase();
    return todosUsuarios.filter(u =>
      u.nome.toUpperCase().includes(termo) ||
      (u.setor_nome || '').toUpperCase().includes(termo)
    );
  }, [todosUsuarios, buscaDestinatario]);

  useEffect(() => {
    if (evento) {
      setTipo(evento.tipo);
      setMensagemPersonalizada('');
      setDestinatariosSelecionados(new Set());
      setModoDestinatario('todos');
    } else {
      setTipo('admissao');
      setMensagemPersonalizada('');
      setDestinatariosSelecionados(new Set());
      setModoDestinatario('todos');
    }
    setBuscaDestinatario('');
  }, [evento, open]);

  const toggleDestinatario = (id: string) => {
    setDestinatariosSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selecionarTodosDestinatarios = () => {
    if (destinatariosSelecionados.size === todosUsuarios.length) {
      setDestinatariosSelecionados(new Set());
    } else {
      setDestinatariosSelecionados(new Set(todosUsuarios.map(u => u.id)));
    }
  };

  const handleSubmit = () => {
    const tipoLabel = TIPO_OPTIONS.find(t => t.value === tipo)?.label || tipo;
    onSave({
      tipo,
      descricao: `${tipoLabel} — Evento manual`,
      funcionario_nome: null,
      setor_id: null,
      setor_nome: null,
      turma: null,
      mensagem_personalizada: mensagemPersonalizada.trim() || null,
      destinatarios: modoDestinatario === 'selecionar' && destinatariosSelecionados.size > 0
        ? Array.from(destinatariosSelecionados)
        : undefined,
    });
  };

  // Agrupar destinatários por perfil
  const destinatariosPorPerfil = useMemo(() => {
    const grupos: Record<string, UserRoleDestinatario[]> = {};
    destinatariosFiltrados.forEach(u => {
      if (!grupos[u.perfil]) grupos[u.perfil] = [];
      grupos[u.perfil].push(u);
    });
    return grupos;
  }, [destinatariosFiltrados]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? 'EDITAR EVENTO' : 'NOVO EVENTO MANUAL'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo de Notificação *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mensagem personalizada */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  Mensagem
                  <span className="text-xs text-muted-foreground font-normal">(será exibida na notificação)</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 text-xs"
                  onClick={() => setPreviewMsg(!previewMsg)}
                  disabled={!mensagemPersonalizada.trim()}
                >
                  {previewMsg ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {previewMsg ? 'EDITAR' : 'VISUALIZAR'}
                </Button>
              </div>
              {previewMsg ? (
                <NotificationPreviewCard tipo={tipo} mensagem={mensagemPersonalizada} />
              ) : (
                <Textarea
                  value={mensagemPersonalizada}
                  onChange={e => setMensagemPersonalizada(e.target.value)}
                  placeholder="Digite a mensagem que aparecerá na notificação para os usuários..."
                  rows={4}
                  className="resize-none text-sm"
                />
              )}
            </div>

            <Separator />

            {/* Seção de Destinatários */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Destinatários
              </Label>

              {/* Toggle todos / selecionar */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={modoDestinatario === 'todos' ? 'default' : 'outline'}
                  className="flex-1 text-xs"
                  onClick={() => { setModoDestinatario('todos'); setDestinatariosSelecionados(new Set()); }}
                >
                  TODOS OS USUÁRIOS
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={modoDestinatario === 'selecionar' ? 'default' : 'outline'}
                  className="flex-1 text-xs gap-1"
                  onClick={() => setModoDestinatario('selecionar')}
                >
                  SELECIONAR ESPECÍFICOS
                  {modoDestinatario === 'selecionar' && destinatariosSelecionados.size > 0 && (
                    <Badge className="h-4 px-1.5 text-[10px] ml-1">{destinatariosSelecionados.size}</Badge>
                  )}
                </Button>
              </div>

              {/* Lista de destinatários (sempre visível quando no modo selecionar) */}
              {modoDestinatario === 'selecionar' && (
                <div className="border rounded-lg overflow-hidden">
                  {/* Busca + selecionar todos */}
                  <div className="p-2 border-b bg-muted/30 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={buscaDestinatario}
                        onChange={e => setBuscaDestinatario(e.target.value)}
                        placeholder="Buscar por nome ou setor..."
                        className="pl-8 h-8 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={selecionarTodosDestinatarios}
                    >
                      {destinatariosSelecionados.size === todosUsuarios.length
                        ? <CheckSquare className="h-3.5 w-3.5" />
                        : <Square className="h-3.5 w-3.5" />
                      }
                      {destinatariosSelecionados.size === todosUsuarios.length ? 'DESMARCAR TODOS' : 'SELECIONAR TODOS'}
                    </button>
                  </div>

                  {/* Lista agrupada por perfil */}
                  <div className="max-h-[280px] overflow-y-auto p-1">
                    {Object.entries(destinatariosPorPerfil).map(([perfil, usuarios]) => (
                      <div key={perfil}>
                        <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide sticky top-0 bg-background border-b">
                          {PERFIL_LABELS[perfil] || perfil} ({usuarios.length})
                        </div>
                        {usuarios.map(usuario => (
                          <label
                            key={usuario.id}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors',
                              destinatariosSelecionados.has(usuario.id) && 'bg-primary/5'
                            )}
                          >
                            <Checkbox
                              checked={destinatariosSelecionados.has(usuario.id)}
                              onCheckedChange={() => toggleDestinatario(usuario.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{usuario.nome}</div>
                              {usuario.setor_nome && (
                                <div className="text-xs text-muted-foreground">{usuario.setor_nome}</div>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn('text-[9px] shrink-0', PERFIL_COLORS[perfil])}
                            >
                              {PERFIL_LABELS[perfil] || perfil}
                            </Badge>
                          </label>
                        ))}
                      </div>
                    ))}

                    {destinatariosFiltrados.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nenhum usuário encontrado
                      </div>
                    )}
                  </div>
                </div>
              )}

              {modoDestinatario === 'selecionar' && destinatariosSelecionados.size === 0 && (
                <p className="text-xs text-amber-600 bg-amber-500/10 rounded px-3 py-2 border border-amber-500/20">
                  ⚠️ Selecione ao menos um destinatário para enviar a notificação.
                </p>
              )}

              {modoDestinatario === 'todos' && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                  A notificação será enviada para todos os usuários ativos do sistema.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !mensagemPersonalizada.trim()}>
            {isEdit ? 'Salvar Alterações' : 'Criar Evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

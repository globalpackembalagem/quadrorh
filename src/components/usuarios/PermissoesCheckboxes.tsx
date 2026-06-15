import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Clock, UserMinus, CalendarCheck,
  AlertTriangle, UserPlus, UserCheck, RefreshCw, Bell, Download,
  ShieldCheck, Lock, Settings, Database, ClipboardCheck, LayoutList,
  History, Lightbulb, Building2, FileCog,
} from 'lucide-react';

export interface Permissoes {
  pode_visualizar_funcionarios: boolean;
  pode_editar_funcionarios: boolean;
  pode_visualizar_previsao: boolean;
  pode_editar_previsao: boolean;
  pode_visualizar_coberturas: boolean;
  pode_editar_coberturas: boolean;
  pode_visualizar_faltas: boolean;
  pode_editar_faltas: boolean;
  pode_visualizar_demissoes: boolean;
  pode_editar_demissoes: boolean;
  pode_visualizar_homologacoes: boolean;
  pode_editar_homologacoes: boolean;
  pode_visualizar_divergencias: boolean;
  pode_criar_divergencias: boolean;
  pode_visualizar_troca_turno: boolean;
  pode_editar_troca_turno: boolean;
  pode_visualizar_armarios: boolean;
  pode_editar_armarios: boolean;
  pode_visualizar_integracoes: boolean;
  pode_editar_integracoes: boolean;
  pode_exportar_excel: boolean;
  acesso_admin: boolean;
  recebe_notificacoes: boolean;
}

interface PermissoesCheckboxesProps {
  permissoes: Permissoes;
  onChange: (permissoes: Permissoes) => void;
  disabled?: boolean;
}

interface MenuDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  tipo: 'sempre' | 'tres_niveis' | 'sim_nao';
  flagVisualizar?: keyof Permissoes;
  flagEditar?: keyof Permissoes;
  // para sim_nao
  flag?: keyof Permissoes;
  descricao?: string;
}

const MENUS: MenuDef[] = [
  {
    id: 'dashboard',
    label: 'Quadro de Funcionários',
    icon: <LayoutDashboard className="h-4 w-4" />,
    tipo: 'sempre',
    descricao: 'Sempre disponível',
  },
  {
    id: 'funcionarios',
    label: 'Funcionários',
    icon: <Users className="h-4 w-4" />,
    tipo: 'tres_niveis',
    flagVisualizar: 'pode_visualizar_funcionarios',
    flagEditar: 'pode_editar_funcionarios',
  },
  {
    id: 'previsao',
    label: 'Previsão de Admissão',
    icon: <UserPlus className="h-4 w-4" />,
    tipo: 'tres_niveis',
    flagVisualizar: 'pode_visualizar_previsao',
    flagEditar: 'pode_editar_previsao',
  },
  {
    id: 'coberturas',
    label: 'Cob. Férias / Treinamento',
    icon: <UserCheck className="h-4 w-4" />,
    tipo: 'tres_niveis',
    flagVisualizar: 'pode_visualizar_coberturas',
    flagEditar: 'pode_editar_coberturas',
  },
  {
    id: 'faltas',
    label: 'Controle de Faltas',
    icon: <Clock className="h-4 w-4" />,
    tipo: 'tres_niveis',
    flagVisualizar: 'pode_visualizar_faltas',
    flagEditar: 'pode_editar_faltas',
  },
  {
    id: 'demissoes',
    label: 'Demissões',
    icon: <UserMinus className="h-4 w-4" />,
    tipo: 'tres_niveis',
    flagVisualizar: 'pode_visualizar_demissoes',
    flagEditar: 'pode_editar_demissoes',
  },
  {
    id: 'homologacoes',
    label: 'Homologações',
    icon: <CalendarCheck className="h-4 w-4" />,
    tipo: 'tres_niveis',
    flagVisualizar: 'pode_visualizar_homologacoes',
    flagEditar: 'pode_editar_homologacoes',
  },
  {
    id: 'divergencias',
    label: 'Divergências',
    icon: <AlertTriangle className="h-4 w-4" />,
    tipo: 'tres_niveis',
    flagVisualizar: 'pode_visualizar_divergencias',
    flagEditar: 'pode_criar_divergencias',
  },
  {
    id: 'troca',
    label: 'Troca de Turno',
    icon: <RefreshCw className="h-4 w-4" />,
    tipo: 'tres_niveis',
    flagVisualizar: 'pode_visualizar_troca_turno',
    flagEditar: 'pode_editar_troca_turno',
  },
  {
    id: 'armarios',
    label: 'Armários Feminino',
    icon: <Lock className="h-4 w-4" />,
    tipo: 'tres_niveis',
    flagVisualizar: 'pode_visualizar_armarios',
    flagEditar: 'pode_editar_armarios',
  },
  {
    id: 'integracoes',
    label: 'Integrações (Portaria)',
    icon: <CalendarCheck className="h-4 w-4" />,
    tipo: 'tres_niveis',
    flagVisualizar: 'pode_visualizar_integracoes',
    flagEditar: 'pode_editar_integracoes',
  },
];

const EXTRAS: MenuDef[] = [
  {
    id: 'excel',
    label: 'Exportar Excel',
    icon: <Download className="h-4 w-4" />,
    tipo: 'sim_nao',
    flag: 'pode_exportar_excel',
  },
  {
    id: 'notificacoes',
    label: 'Central de Notificações',
    icon: <Bell className="h-4 w-4" />,
    tipo: 'sim_nao',
    flag: 'recebe_notificacoes',
    descricao: 'Recebe alertas e avisos do sistema',
  },
];

const ADMIN_MENUS: MenuDef[] = [
  { id: 'notificacoes-admin', label: 'Admin: Notificações', icon: <Bell className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'usuarios-admin', label: 'Admin: Usuários', icon: <Users className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'setores-admin', label: 'Admin: Setores', icon: <Building2 className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'situacoes-admin', label: 'Admin: Situações', icon: <FileCog className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'periodos-admin', label: 'Admin: Períodos de Faltas', icon: <Clock className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'tipos-desligamento-admin', label: 'Admin: Tipos de Desligamento', icon: <UserMinus className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'conferencia-admin', label: 'Admin: Conferência Gestor', icon: <ClipboardCheck className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'comparar-admin', label: 'Admin: Conciliação de Dados', icon: <ClipboardCheck className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'simulacao-admin', label: 'Admin: Simulação', icon: <LayoutList className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'auditoria-admin', label: 'Admin: Auditoria', icon: <History className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'historico-acesso-admin', label: 'Admin: Histórico de Acesso', icon: <History className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'backup-admin', label: 'Admin: Backup', icon: <Database className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'referencia-admin', label: 'Admin: Referência Visual', icon: <Lightbulb className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
  { id: 'sistema-admin', label: 'Admin: Controle do Sistema', icon: <Settings className="h-4 w-4" />, tipo: 'sempre', descricao: 'Admin Total' },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function getTresNiveis(menu: MenuDef, p: Permissoes): 'sem_acesso' | 'visualizar' | 'editar' {
  if (menu.flagEditar && p[menu.flagEditar]) return 'editar';
  if (menu.flagVisualizar && p[menu.flagVisualizar]) return 'visualizar';
  return 'sem_acesso';
}

function applyTresNiveis(
  menu: MenuDef,
  valor: 'sem_acesso' | 'visualizar' | 'editar',
  p: Permissoes
): Permissoes {
  const nova = { ...p };
  if (menu.flagVisualizar) nova[menu.flagVisualizar] = false;
  if (menu.flagEditar) nova[menu.flagEditar] = false;
  if (valor === 'visualizar' && menu.flagVisualizar) nova[menu.flagVisualizar] = true;
  if (valor === 'editar') {
    if (menu.flagVisualizar) nova[menu.flagVisualizar] = true;
    if (menu.flagEditar) nova[menu.flagEditar] = true;
  }
  return nova;
}

// ─── Row component ────────────────────────────────────────────────────────────

function MenuRow({ menu, permissoes, onChange, disabled }: {
  menu: MenuDef;
  permissoes: Permissoes;
  onChange: (p: Permissoes) => void;
  disabled?: boolean;
}) {
  if (menu.tipo === 'sempre') {
    return (
      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{menu.icon}</span>
          <span className="text-sm font-medium">{menu.label}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>{menu.descricao}</span>
        </div>
      </div>
    );
  }

  if (menu.tipo === 'tres_niveis') {
    const valor = getTresNiveis(menu, permissoes);
    const opcoes: { v: 'sem_acesso' | 'visualizar' | 'editar'; label: string }[] = [
      { v: 'sem_acesso', label: 'SEM ACESSO' },
      { v: 'visualizar', label: 'VISUALIZAR' },
      { v: 'editar', label: 'EDITAR' },
    ];
    return (
      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{menu.icon}</span>
          <span className="text-sm font-medium">{menu.label}</span>
        </div>
        <div className="flex rounded-md border border-border overflow-hidden shrink-0">
          {opcoes.map((op, i) => (
            <button
              key={op.v}
              type="button"
              disabled={disabled}
              onClick={() => onChange(applyTresNiveis(menu, op.v, permissoes))}
              className={cn(
                'px-2.5 py-1.5 text-[10px] font-bold transition-all',
                i < opcoes.length - 1 && 'border-r border-border',
                valor === op.v
                  ? op.v === 'sem_acesso'
                    ? 'bg-destructive/15 text-destructive'
                    : op.v === 'visualizar'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-primary/25 text-primary'
                  : 'bg-background text-muted-foreground hover:bg-muted',
                disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // sim_nao
  if (menu.tipo === 'sim_nao') {
    const ativo = !!(menu.flag && permissoes[menu.flag]);
    return (
      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{menu.icon}</span>
          <div>
            <span className="text-sm font-medium">{menu.label}</span>
            {menu.descricao && (
              <p className="text-[10px] text-muted-foreground">{menu.descricao}</p>
            )}
          </div>
        </div>
        <div className="flex rounded-md border border-border overflow-hidden shrink-0">
          {[{ val: false, label: 'NÃO' }, { val: true, label: 'SIM' }].map((op, i) => (
            <button
              key={String(op.val)}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!menu.flag) return;
                onChange({ ...permissoes, [menu.flag]: op.val });
              }}
              className={cn(
                'px-3 py-1.5 text-[10px] font-bold transition-all',
                i === 0 && 'border-r border-border',
                ativo === op.val
                  ? op.val === false
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-primary/10 text-primary'
                  : 'bg-background text-muted-foreground hover:bg-muted',
                disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PermissoesCheckboxes({ permissoes, onChange, disabled }: PermissoesCheckboxesProps) {
  const handleAdminToggle = (ativo: boolean) => {
    if (ativo) {
      onChange({
        pode_visualizar_funcionarios: true,
        pode_editar_funcionarios: true,
        pode_visualizar_previsao: true,
        pode_editar_previsao: true,
        pode_visualizar_coberturas: true,
        pode_editar_coberturas: true,
        pode_visualizar_faltas: true,
        pode_editar_faltas: true,
        pode_visualizar_demissoes: true,
        pode_editar_demissoes: true,
        pode_visualizar_homologacoes: true,
        pode_editar_homologacoes: true,
        pode_visualizar_divergencias: true,
        pode_criar_divergencias: true,
        pode_visualizar_troca_turno: true,
        pode_editar_troca_turno: true,
        pode_visualizar_armarios: true,
        pode_editar_armarios: true,
        pode_visualizar_integracoes: true,
        pode_editar_integracoes: true,
        pode_exportar_excel: true,
        acesso_admin: true,
        recebe_notificacoes: true,
      });
    } else {
      onChange({ ...permissoes, acesso_admin: false });
    }
  };

  return (
    <div className="space-y-4">
      {/* Admin total */}
      <div className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-colors',
        permissoes.acesso_admin
          ? 'border-destructive/40 bg-destructive/10'
          : 'border-border bg-muted/10'
      )}>
        <div className="flex items-center gap-2">
          <ShieldCheck className={cn('h-4 w-4', permissoes.acesso_admin ? 'text-destructive' : 'text-muted-foreground')} />
          <div>
            <p className="text-sm font-semibold">Acesso Admin Total</p>
            <p className="text-[10px] text-muted-foreground">Libera tudo automaticamente, sem restrições</p>
          </div>
        </div>
        <div className="flex rounded-md border border-border overflow-hidden shrink-0">
          {[{ val: false, label: 'NÃO' }, { val: true, label: 'SIM' }].map((op, i) => (
            <button
              key={String(op.val)}
              type="button"
              disabled={disabled}
              onClick={() => handleAdminToggle(op.val)}
              className={cn(
                'px-3 py-1.5 text-[10px] font-bold transition-all',
                i === 0 && 'border-r border-border',
                permissoes.acesso_admin === op.val
                  ? op.val === false
                    ? 'bg-muted text-foreground'
                    : 'bg-destructive/20 text-destructive'
                  : 'bg-background text-muted-foreground hover:bg-muted',
                disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menus */}
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1 pb-1.5">
          Menus do Sistema
        </p>
        {MENUS.map(menu => (
          <MenuRow
            key={menu.id}
            menu={menu}
            permissoes={permissoes}
            onChange={onChange}
            disabled={disabled || permissoes.acesso_admin}
          />
        ))}
      </div>

      {/* Extras */}
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1 pb-1.5">
          Recursos Extras
        </p>
        {EXTRAS.map(menu => (
          <MenuRow
            key={menu.id}
            menu={menu}
            permissoes={permissoes}
            onChange={onChange}
            disabled={disabled || permissoes.acesso_admin}
          />
        ))}
      </div>

      {/* Admin */}
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1 pb-1.5">
          Funções Administrativas
        </p>
        <div className="grid gap-1 sm:grid-cols-2">
          {ADMIN_MENUS.map(menu => (
            <div
              key={menu.id}
              className={cn(
                'flex items-center justify-between py-2.5 px-3 rounded-lg border',
                permissoes.acesso_admin
                  ? 'bg-destructive/10 border-destructive/25'
                  : 'bg-muted/20 border-border opacity-70'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={permissoes.acesso_admin ? 'text-destructive' : 'text-muted-foreground'}>{menu.icon}</span>
                <span className="text-sm font-medium truncate">{menu.label}</span>
              </div>
              <span className={cn(
                'text-[10px] font-bold shrink-0',
                permissoes.acesso_admin ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {permissoes.acesso_admin ? 'LIBERADO' : 'BLOQUEADO'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

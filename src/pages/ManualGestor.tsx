import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, LayoutDashboard, Clock, AlertTriangle, RefreshCw,
  CheckCircle2, Info, Eye, Users, ArrowRight, Lock,
  BarChart3, FileText, MessageSquare, UserPlus, UserCheck, Briefcase,
  ChevronRight, ChevronDown, Zap, Play,
  Bell, X, Check, HelpCircle, Calendar, Filter, Search, Edit,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Seções do manual ─────────────────────────────────────────
const SECOES = [
  { id: 'sobre', label: 'O que é o Sistema', icon: Info },
  { id: 'inicio', label: 'O que você pode fazer', icon: Zap },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'escalas', label: 'Escalas de Trabalho', icon: Calendar },
  { id: 'experiencia', label: 'Experiência Geral', icon: Users },
  { id: 'coberturas', label: 'Coberturas / Treinamentos', icon: UserCheck },
  { id: 'faltas', label: 'Controle de Faltas', icon: Clock },
  { id: 'divergencias', label: 'Divergências', icon: AlertTriangle },
  { id: 'troca-turno', label: 'Troca de Turno', icon: RefreshCw },
  { id: 'previsao', label: 'Previsão de Admissão', icon: UserPlus },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'permissoes', label: 'Suas Permissões', icon: Lock },
];

// ─── Helpers visuais ──────────────────────────────────────────
function InfoBox({ tipo, children }: { tipo: 'info' | 'aviso' | 'dica'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300',
    aviso: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-800 dark:text-yellow-300',
    dica: 'bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-300',
  };
  const icons = { info: Info, aviso: AlertTriangle, dica: CheckCircle2 };
  const Icon = icons[tipo];
  const labels = { info: 'INFO', aviso: 'ATENÇÃO', dica: 'DICA' };
  return (
    <div className={cn('flex gap-3 p-4 rounded-lg border', styles[tipo])}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="text-sm">
        <span className="font-bold text-xs">{labels[tipo]}: </span>
        {children}
      </div>
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div>
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function TelaSimulada({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border-2 border-border overflow-hidden shadow-lg', className)}>
      <div className="bg-sidebar px-4 py-2.5 flex items-center gap-2 border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
          <div className="w-3 h-3 rounded-full bg-green-400/70" />
        </div>
        <span className="text-xs font-mono text-muted-foreground ml-2">📍 {titulo}</span>
      </div>
      <div className="bg-background p-4">{children}</div>
    </div>
  );
}

// Simulação interativa do ponto (P/F/A/FE)
function SimuladorPonto() {
  const tipos = ['P', 'F', 'A', 'FE'] as const;
  type TipoPonto = typeof tipos[number];
  const [celulas, setCelulas] = useState<TipoPonto[]>(['P', 'P', 'F', 'P', 'A']);
  const [clicado, setClicado] = useState<number | null>(null);
  const cores: Record<TipoPonto, string> = {
    P: 'bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/40',
    F: 'bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/40',
    A: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/40',
    FE: 'bg-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-500/40',
  };
  const proxTipo: Record<TipoPonto, TipoPonto> = { P: 'F', F: 'A', A: 'FE', FE: 'P' };
  const dias = ['01', '02', '03', '04', '05'];

  const handleClick = (i: number) => {
    setClicado(i);
    setCelulas(prev => {
      const next = [...prev];
      next[i] = proxTipo[next[i]];
      return next;
    });
    setTimeout(() => setClicado(null), 600);
  };

  return (
    <TelaSimulada titulo="Controle de Faltas – Simulador interativo">
      <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
        <Play className="h-3 w-3" /> <strong>Clique nas células</strong> para alternar entre os tipos: P → F → A → FE
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Funcionário</th>
              {dias.map(d => (
                <th key={d} className="px-2 py-2 text-center text-muted-foreground font-medium">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">JOÃO SILVA</td>
              {celulas.map((tipo, i) => (
                <td key={i} className="px-2 py-2 text-center">
                  <button
                    onClick={() => handleClick(i)}
                    className={cn(
                      'inline-flex w-8 h-8 rounded text-xs font-bold items-center justify-center transition-all cursor-pointer',
                      cores[tipo],
                      clicado === i && 'scale-125 shadow-md'
                    )}
                  >
                    {tipo}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {Object.entries(cores).map(([k, c]) => (
          <span key={k} className={cn('inline-flex items-center gap-1 px-2 py-1 rounded font-bold', c.split('hover:')[0])}>
            {k} = {k === 'P' ? 'Presente' : k === 'F' ? 'Falta' : k === 'A' ? 'Ausência' : 'Férias'}
          </span>
        ))}
      </div>
    </TelaSimulada>
  );
}

// Simulação de filtros
function SimuladorFiltros() {
  const [grupo, setGrupo] = useState<'TODOS' | 'SOPRO' | 'DECORAÇÃO'>('TODOS');
  const [turma, setTurma] = useState('TODOS');

  const turmasPorGrupo: Record<string, string[]> = {
    TODOS: ['TODOS', 'A', 'B', 'C', 'DIA T1', 'DIA T2', 'NOITE T1', 'NOITE T2'],
    SOPRO: ['TODOS', 'A', 'B', 'C'],
    DECORAÇÃO: ['TODOS', 'DIA T1', 'DIA T2', 'NOITE T1', 'NOITE T2'],
  };

  const handleGrupo = (g: typeof grupo) => { setGrupo(g); setTurma('TODOS'); };

  return (
    <TelaSimulada titulo="Funcionários – Filtros de Grupo e Turma">
      <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
        <Play className="h-3 w-3" /> <strong>Interaja</strong> com os filtros abaixo
      </p>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground uppercase w-14">GRUPO</span>
          <div className="flex gap-1.5">
            {(['TODOS', 'SOPRO', 'DECORAÇÃO'] as const).map(g => (
              <button
                key={g}
                onClick={() => handleGrupo(g)}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-md border transition-colors',
                  grupo === g
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase w-14">TURMA</span>
          <div className="flex flex-wrap gap-1.5">
            {turmasPorGrupo[grupo].map(t => (
              <button
                key={t}
                onClick={() => setTurma(t)}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-md border transition-colors',
                  turma === t
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 p-2 rounded bg-muted/40 text-xs text-muted-foreground">
        🔍 Mostrando funcionários: <strong>Grupo {grupo}</strong> {turma !== 'TODOS' ? `· Turma ${turma}` : '(todas as turmas)'} — <span className="text-foreground font-semibold">contagem exibe apenas ATIVOS + FÉRIAS</span>
      </div>
    </TelaSimulada>
  );
}

// Quiz interativo
function QuizRapido() {
  const perguntas = [
    {
      pergunta: 'Qual tipo de registro indica que o funcionário trabalhou normalmente?',
      opcoes: ['F', 'A', 'P', 'FE'],
      correta: 2,
      explicacao: '"P" = Presente. O funcionário compareceu normalmente ao trabalho.',
    },
    {
      pergunta: 'Você pode editar faltas de um funcionário de outro gestor?',
      opcoes: ['Sim, sempre', 'Não, nunca', 'Só o RH pode', 'Depende do período'],
      correta: 1,
      explicacao: 'Você só pode editar faltas dos setores atribuídos ao seu usuário. Se precisar mexer em outro setor, fale com o RH.',
    },
    {
      pergunta: 'A contagem nos filtros de Funcionários inclui quais situações?',
      opcoes: ['Todos os funcionários', 'Apenas ATIVOS', 'ATIVOS e FÉRIAS', 'ATIVOS, FÉRIAS e Afastados'],
      correta: 2,
      explicacao: 'Os contadores de GRUPO e TURMA mostram apenas funcionários em situação ATIVO ou FÉRIAS.',
    },
    {
      pergunta: '"FE" no controle de faltas significa o quê?',
      opcoes: ['Falta por Enfermidade', 'Férias', 'Falta Eventual', 'Folga Extra'],
      correta: 1,
      explicacao: '"FE" representa Férias — o funcionário está em período de férias.',
    },
    {
      pergunta: 'O ícone 🛏️ no controle de faltas significa o quê?',
      opcoes: ['Funcionário dormiu no trabalho', 'Folga pela escala (fim de semana)', 'Ausência médica', 'Férias'],
      correta: 1,
      explicacao: '🛏️ indica que a turma está de FOLGA conforme a escala de trabalho. Não é possível lançar falta nesses dias.',
    },
    {
      pergunta: 'Quando você cria uma divergência de SUMIDO, o que acontece?',
      opcoes: ['Nada, fica salvo', 'O RH recebe e resolve', 'O funcionário é demitido', 'O sistema apaga o registro'],
      correta: 1,
      explicacao: 'A divergência vai para a fila do RH, que analisa e resolve. Você recebe uma notificação quando for resolvida.',
    },
  ];

  const [atual, setAtual] = useState(0);
  const [resposta, setResposta] = useState<number | null>(null);
  const [concluido, setConcluido] = useState(false);
  const [acertos, setAcertos] = useState(0);

  const handleResposta = (i: number) => {
    if (resposta !== null) return;
    setResposta(i);
    if (i === perguntas[atual].correta) setAcertos(a => a + 1);
  };

  const proxima = () => {
    if (atual + 1 >= perguntas.length) {
      setConcluido(true);
    } else {
      setAtual(a => a + 1);
      setResposta(null);
    }
  };

  const reiniciar = () => { setAtual(0); setResposta(null); setConcluido(false); setAcertos(0); };

  if (concluido) {
    return (
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 text-center space-y-3">
        <div className="text-4xl">{acertos === perguntas.length ? '🏆' : acertos >= 4 ? '👍' : '📚'}</div>
        <h3 className="font-bold text-lg">Quiz concluído!</h3>
        <p className="text-muted-foreground text-sm">Você acertou <strong className="text-foreground">{acertos} de {perguntas.length}</strong> perguntas</p>
        <button onClick={reiniciar} className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity">
          Repetir Quiz
        </button>
      </div>
    );
  }

  const p = perguntas[atual];
  return (
    <div className="rounded-xl border-2 border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quiz Rápido</span>
        </div>
        <span className="text-xs text-muted-foreground">{atual + 1} / {perguntas.length}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${((atual) / perguntas.length) * 100}%` }} />
      </div>
      <p className="font-semibold text-sm">{p.pergunta}</p>
      <div className="grid grid-cols-2 gap-2">
        {p.opcoes.map((op, i) => {
          const isCorreta = i === p.correta;
          const isSelecionada = i === resposta;
          return (
            <button
              key={i}
              onClick={() => handleResposta(i)}
              className={cn(
                'text-sm font-medium px-3 py-2.5 rounded-lg border-2 text-left transition-all',
                resposta === null
                  ? 'border-border hover:border-primary/50 hover:bg-accent'
                  : isCorreta
                  ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                  : isSelecionada
                  ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                  : 'border-border opacity-50'
              )}
            >
              <span className="flex items-center gap-2">
                {resposta !== null && isCorreta && <Check className="h-3.5 w-3.5 shrink-0" />}
                {resposta !== null && isSelecionada && !isCorreta && <X className="h-3.5 w-3.5 shrink-0" />}
                {op}
              </span>
            </button>
          );
        })}
      </div>
      {resposta !== null && (
        <div className={cn('text-xs p-3 rounded-lg border', resposta === p.correta ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400')}>
          <strong>{resposta === p.correta ? '✓ Correto! ' : '✗ Incorreto. '}</strong>{p.explicacao}
        </div>
      )}
      {resposta !== null && (
        <button onClick={proxima} className="w-full text-xs bg-primary text-primary-foreground py-2 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
          {atual + 1 < perguntas.length ? 'Próxima pergunta' : 'Ver resultado'}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// Accordion
function Accordion({ titulo, children, defaultOpen = false }: { titulo: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-4 py-3 font-semibold text-sm text-left hover:bg-accent transition-colors"
      >
        {titulo}
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 pt-2 text-sm text-muted-foreground space-y-2">{children}</div>}
    </div>
  );
}

// ─── SEÇÃO: O que é o Sistema ─────────────────────────────────
function SecaoSobre() {
  return (
    <section id="sobre" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Info className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">O que é o Sistema Quadro RH?</h2>
          <p className="text-muted-foreground text-sm">Entenda para que serve e como funciona</p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 space-y-4">
        <p className="text-sm">
          O <strong>Quadro RH</strong> é o sistema que controla o <strong>quadro de funcionários</strong> da fábrica. 
          Ele mostra quantos funcionários cada turma tem, quantos precisa, e se está sobrando ou faltando gente.
        </p>
        <p className="text-sm">
          Além disso, ele serve para:
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: Clock, label: 'Controlar faltas', desc: 'Você lança quem veio, quem faltou, quem está de férias' },
            { icon: AlertTriangle, label: 'Informar problemas', desc: 'Funcionário sumiu? Está no setor errado? Você avisa o RH pelo sistema' },
            { icon: RefreshCw, label: 'Trocas de turno', desc: 'Quando o RH precisa mover alguém, você aprova ou recusa pelo sistema' },
            { icon: Bell, label: 'Receber avisos', desc: 'O RH manda comunicados direto pro sistema — aparece na hora pra você' },
            { icon: LayoutDashboard, label: 'Ver o quadro', desc: 'Ver quantos funcionários tem no seu grupo, se está completo ou faltando' },
            { icon: Calendar, label: 'Escalas de folga', desc: 'Ver qual turma trabalha no fim de semana (SOPRO) ou na escala Panamá (DECORAÇÃO)' },
          ].map(item => (
            <div key={item.label} className="flex gap-3 p-3 rounded-lg border bg-card">
              <item.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <InfoBox tipo="info">
        O sistema é usado por <strong>gestores</strong> (você) e pela equipe de <strong>RH</strong>. 
        Cada um vê e faz coisas diferentes — abaixo explicamos exatamente o que você pode fazer.
      </InfoBox>
    </section>
  );
}

// ─── SEÇÃO: O que o gestor pode fazer ─────────────────────────
function SecaoInicio() {
  return (
    <section id="inicio" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Zap className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">O que você pode fazer</h2>
          <p className="text-muted-foreground text-sm">Tudo que está disponível para você como gestor</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { icon: LayoutDashboard, label: 'Ver o Dashboard', desc: 'Ver quantos funcionários tem no seu grupo, se sobra ou falta' },
          { icon: Calendar, label: 'Ver Escalas de Folga', desc: 'Calendário de quem trabalha no fim de semana (SOPRO) ou escala Panamá (DECORAÇÃO)' },
          { icon: Briefcase, label: 'Ver Experiência Geral', desc: 'Acompanhar funcionários em período de experiência e temporários de toda a fábrica' },
          { icon: UserCheck, label: 'Ver Coberturas / Treinamentos', desc: 'Ver quem está cobrindo férias ou treinando em outro setor' },
          { icon: Clock, label: 'Lançar Faltas', desc: 'Marcar P (presente), F (falta), A (ausência) ou FE (férias) para os seus funcionários' },
          { icon: AlertTriangle, label: 'Criar Divergências', desc: 'Avisar o RH quando algo está errado: funcionário sumido, setor errado, etc.' },
          { icon: RefreshCw, label: 'Aprovar Trocas de Turno', desc: 'Quando o RH quer mover um funcionário, você aprova ou recusa' },
          { icon: Eye, label: 'Consultar Funcionários', desc: 'Ver a lista de funcionários do seu grupo (somente leitura)' },
          { icon: Bell, label: 'Responder Notificações', desc: 'Confirmar admissões, decidir sobre experiências, confirmar coberturas — o RH precisa da sua resposta' },
        ].map(item => (
          <div key={item.label} className="flex gap-3 p-4 rounded-xl border bg-card hover:border-primary/40 transition-colors">
            <item.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <InfoBox tipo="dica">
        Use o <strong>botão MENU</strong> no canto superior direito para navegar entre as telas.
      </InfoBox>
    </section>
  );
}

// ─── SEÇÃO: Dashboard ─────────────────────────────────────────
function SecaoDashboard() {
  return (
    <section id="dashboard" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <LayoutDashboard className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Dashboard – Quadro de Funcionários</h2>
          <p className="text-muted-foreground text-sm">Veja a situação do seu grupo de uma vez</p>
        </div>
      </div>

      <TelaSimulada titulo="Dashboard – Exemplo SOPRO">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { turma: 'A', real: 168, nec: 174 },
            { turma: 'B', real: 182, nec: 178 },
            { turma: 'C', real: 155, nec: 155 },
          ].map(t => {
            const ok = t.real >= t.nec;
            return (
              <div key={t.turma} className={cn('rounded-lg border p-3 text-center', ok ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5')}>
                <div className="text-xs font-bold text-muted-foreground mb-1">TURMA {t.turma}</div>
                <div className="text-2xl font-bold">{t.real}</div>
                <div className="text-xs text-muted-foreground">de {t.nec} necessários</div>
                <Badge className={cn('mt-2 text-xs font-bold', ok ? 'bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/20' : 'bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/20')}>
                  {ok ? `SOBRA +${t.real - t.nec}` : `DESFALQUE ${t.real - t.nec}`}
                </Badge>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500/30 inline-block" /> Verde = Tá completo ou sobrando</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500/30 inline-block" /> Vermelho = Tá faltando gente</span>
        </div>
      </TelaSimulada>

      <div className="space-y-2">
        <h3 className="font-bold text-base">Entendendo os números</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { label: 'Quadro Real', desc: 'Quantos funcionários ATIVOS a turma tem hoje', icon: Users },
            { label: 'Quadro Necessário', desc: 'Quantos funcionários a turma PRECISA ter (meta definida pelo RH)', icon: BarChart3 },
            { label: 'SOBRA (verde)', desc: 'Tem mais gente do que precisa. Situação boa.', icon: CheckCircle2 },
            { label: 'DESFALQUE (vermelho)', desc: 'Tá faltando gente. O RH sabe e está trabalhando nisso.', icon: AlertTriangle },
          ].map(item => (
            <div key={item.label} className="flex gap-3 p-3 rounded-lg border bg-muted/30">
              <item.icon className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Accordion titulo="Por que o número do dashboard é diferente do total de funcionários?">
        <p>O dashboard conta apenas funcionários <strong>ATIVOS</strong> no quadro. Afastados, em treinamento ou desligados ficam de fora. Por isso pode parecer diferente do total.</p>
      </Accordion>
    </section>
  );
}

// ─── SEÇÃO: Escalas ───────────────────────────────────────────
function SecaoEscalas() {
  return (
    <section id="escalas" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Escalas de Trabalho</h2>
          <p className="text-muted-foreground text-sm">Quem trabalha quando — SOPRO e DECORAÇÃO</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4 space-y-3 border-green-500/30 bg-green-500/5">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
            Escala SOPRO — Fim de Semana
          </h3>
          <p className="text-sm text-muted-foreground">De segunda a sexta todo mundo trabalha. No <strong>sábado e domingo</strong>, o sistema mostra qual turma está escalada.</p>
          <div className="space-y-1.5 text-xs">
            <p className="font-semibold">Rodízio de 4 semanas (1A, 1B, 2A, 2B):</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-muted/40"><span className="font-bold">Sábado:</span> 2A → 1B → 2B → 1A</div>
              <div className="p-2 rounded bg-muted/40"><span className="font-bold">Domingo:</span> 2B → 1A → 2A → 1B</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-4 space-y-3 border-purple-500/30 bg-purple-500/5">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Escala DECORAÇÃO — Panamá 2-2-3
          </h3>
          <p className="text-sm text-muted-foreground">T1 e T2 se revezam num ciclo de 14 dias. Quando T1 folga, T2 trabalha e vice-versa.</p>
          <div className="text-xs p-2 rounded bg-muted/40 font-mono">
            T1: ✅✅❌❌✅✅✅❌❌✅✅❌❌❌
          </div>
        </div>
      </div>

      <InfoBox tipo="info">
        No <strong>Controle de Faltas</strong>, nos dias em que a turma está de folga aparece o ícone 🛏️ — você não precisa lançar nada nesses dias.
      </InfoBox>
    </section>
  );
}

// Simulação interativa dos filtros de Experiência Geral
function SimuladorFiltrosExperiencia() {
  const [tipo, setTipo] = useState<'EFETIVOS' | 'TEMPORÁRIOS'>('TEMPORÁRIOS');
  const [setor, setSetor] = useState('TODOS');

  const setoresFiltro = ['TODOS', 'SOPRO A', 'SOPRO B', 'SOPRO C', 'DEC. DIA T1', 'DEC. DIA T2', 'DEC. NOITE T1', 'DEC. NOITE T2'];

  const exemplos: Record<string, { nome: string; matricula: string; setor: string; dias: number }[]> = {
    'TODOS': [
      { nome: 'CARLOS MENDES', matricula: 'TEMP-0042', setor: 'SOPRO A', dias: 67 },
      { nome: 'ANA SILVA', matricula: 'TEMP-0051', setor: 'SOPRO B', dias: 45 },
      { nome: 'PEDRO LIMA', matricula: 'TEMP-0038', setor: 'DEC. DIA T1', dias: 82 },
      { nome: 'JULIA COSTA', matricula: 'TEMP-0055', setor: 'SOPRO C', dias: 30 },
      { nome: 'MARCOS SOUZA', matricula: 'TEMP-0060', setor: 'DEC. NOITE T1', dias: 15 },
    ],
    'SOPRO A': [{ nome: 'CARLOS MENDES', matricula: 'TEMP-0042', setor: 'SOPRO A', dias: 67 }],
    'SOPRO B': [{ nome: 'ANA SILVA', matricula: 'TEMP-0051', setor: 'SOPRO B', dias: 45 }],
    'SOPRO C': [{ nome: 'JULIA COSTA', matricula: 'TEMP-0055', setor: 'SOPRO C', dias: 30 }],
    'DEC. DIA T1': [{ nome: 'PEDRO LIMA', matricula: 'TEMP-0038', setor: 'DEC. DIA T1', dias: 82 }],
    'DEC. DIA T2': [],
    'DEC. NOITE T1': [{ nome: 'MARCOS SOUZA', matricula: 'TEMP-0060', setor: 'DEC. NOITE T1', dias: 15 }],
    'DEC. NOITE T2': [],
  };

  const lista = exemplos[setor] || [];

  return (
    <TelaSimulada titulo="Experiência Geral – Filtros por Setor">
      <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
        <Play className="h-3 w-3" /> <strong>Interaja</strong> com os filtros abaixo para ver como funciona
      </p>
      <div className="space-y-3">
        {/* Tipo */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase w-12">TIPO</span>
          <div className="flex gap-1.5">
            {(['EFETIVOS', 'TEMPORÁRIOS'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-md border transition-colors',
                  tipo === t
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {/* Setores */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase w-12">SETOR</span>
          <div className="flex flex-wrap gap-1.5">
            {setoresFiltro.map(s => (
              <button
                key={s}
                onClick={() => setSetor(s)}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors',
                  setor === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                )}
              >
                {s}
                {s !== 'TODOS' && (
                  <span className="ml-1 opacity-70">({(exemplos[s] || []).length})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Resultado */}
      <div className="mt-3 space-y-1.5">
        {lista.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">Nenhum {tipo.toLowerCase()} neste setor</div>
        ) : (
          lista.map((f, i) => {
            const saldo = 90 - f.dias;
            const cor = saldo <= 10 ? 'text-red-600 dark:text-red-400' : saldo <= 30 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400';
            return (
              <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-muted/20 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-muted-foreground">{f.matricula}</span>
                  <span className="font-semibold">{f.nome}</span>
                  <Badge variant="outline" className="text-[10px]">{f.setor}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{f.dias} dias</span>
                  <span className={cn('font-bold', cor)}>{saldo}d restantes</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-3 p-2 rounded bg-muted/40 text-xs text-muted-foreground">
        🔍 Mostrando: <strong>{tipo}</strong> · Setor: <strong>{setor}</strong> — {lista.length} funcionário(s)
      </div>
    </TelaSimulada>
  );
}

// ─── SEÇÃO: Experiência Geral ─────────────────────────────────
function SecaoExperiencia() {
  return (
    <section id="experiencia" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Experiência Geral</h2>
          <p className="text-muted-foreground text-sm">Acompanhe todos os funcionários em experiência e temporários</p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-orange-500/20 bg-orange-500/5 p-6 space-y-4">
        <h3 className="font-bold text-base">O que é?</h3>
        <p className="text-sm text-muted-foreground">
          A tela de <strong>Experiência Geral</strong> lista todos os funcionários que estão em <strong>período de experiência</strong> (menos de 90 dias de admissão) 
          ou são <strong>temporários</strong> (matrícula começando com TEMP). É uma visão consolidada de toda a fábrica.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {[
          { label: 'Efetivos em Experiência', desc: 'Funcionários com matrícula normal que ainda não completaram 90 dias', icon: Users },
          { label: 'Temporários', desc: 'Funcionários com matrícula TEMP — contrato por prazo determinado', icon: Briefcase },
          { label: 'Filtro por Setor', desc: 'Filtre por SOPRO A, B, C ou DECORAÇÃO DIA T1/T2 e NOITE T1/T2', icon: Filter },
          { label: 'Sinalização por Cores', desc: '🔴 Vencendo | 🟡 Atenção | 🟢 Prazo confortável', icon: Eye },
        ].map(item => (
          <div key={item.label} className="flex gap-3 p-3 rounded-lg border bg-muted/30">
            <item.icon className="h-4 w-4 shrink-0 text-orange-500 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Simulador de Filtros de Temporários */}
      <SimuladorFiltrosExperiencia />

      <div className="space-y-3">
        <h3 className="font-bold text-base">Como usar</h3>
        <StepCard number={1} title="Acesse pelo menu EXPERIÊNCIA GERAL" description="Fica no menu lateral. Mostra todos os grupos (SOPRO e DECORAÇÃO)." />
        <StepCard number={2} title="Filtre por tipo: EFETIVO ou TEMPORÁRIO" description="Use as abas no topo para separar funcionários em experiência dos temporários (matrícula TEMP)." />
        <StepCard number={3} title="Filtre por setor usando os botões" description="Clique em SOPRO A, SOPRO B, SOPRO C, DEC. DIA T1, DEC. DIA T2, DEC. NOITE T1 ou DEC. NOITE T2." />
        <StepCard number={4} title="Busque por nome ou matrícula" description="Use o campo de busca para encontrar rapidamente um funcionário específico." />
        <StepCard number={5} title="Acompanhe os prazos" description="Os funcionários são listados por ordem de admissão mais antiga — os mais urgentes aparecem primeiro." />
      </div>

      <InfoBox tipo="dica">
        Os <strong>botões de setor</strong> mostram a contagem de funcionários em cada grupo. Clique para filtrar: SOPRO A, B, C ou DECORAÇÃO DIA/NOITE T1/T2.
      </InfoBox>
    </section>
  );
}

// ─── SEÇÃO: Coberturas / Treinamentos ─────────────────────────
function SecaoCoberturas() {
  return (
    <section id="coberturas" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
          <UserCheck className="h-5 w-5 text-teal-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Coberturas / Treinamentos</h2>
          <p className="text-muted-foreground text-sm">Funcionários temporariamente em outro setor</p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-teal-500/20 bg-teal-500/5 p-6 space-y-4">
        <h3 className="font-bold text-base">O que é?</h3>
        <p className="text-sm text-muted-foreground">
          Esta tela mostra os funcionários que estão em situação de <strong>Cobertura de Férias</strong> ou <strong>Treinamento</strong> em um setor diferente do seu setor original.
          É uma visão centralizada para acompanhar quem está alocado temporariamente em outro local.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {[
          { label: 'Cobertura de Férias', desc: 'Funcionário cobrindo férias de alguém em outro setor', icon: Calendar },
          { label: 'Treinamento', desc: 'Funcionário em treinamento temporário em outro setor', icon: Users },
        ].map(item => (
          <div key={item.label} className="flex gap-3 p-4 rounded-xl border bg-card">
            <item.icon className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <InfoBox tipo="info">
        Como gestor, você pode <strong>visualizar</strong> os funcionários em cobertura/treinamento. Apenas o <strong>RH</strong> pode editar os dados e situações.
      </InfoBox>
    </section>
  );
}

// ─── SEÇÃO: Faltas ────────────────────────────────────────────
function SecaoFaltas() {
  return (
    <section id="faltas" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Clock className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Controle de Faltas</h2>
          <p className="text-muted-foreground text-sm">Como lançar a frequência dos seus funcionários</p>
        </div>
      </div>

      <SimuladorPonto />

      <div className="grid md:grid-cols-4 gap-3">
        {[
          { tipo: 'P', nome: 'PRESENTE', desc: 'Veio trabalhar', cor: 'border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-400' },
          { tipo: 'F', nome: 'FALTA', desc: 'Faltou sem justificativa', cor: 'border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-400' },
          { tipo: 'A', nome: 'AUSÊNCIA', desc: 'Atestado ou folga justificada', cor: 'border-yellow-500/40 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400' },
          { tipo: 'FE', nome: 'FÉRIAS', desc: 'Está de férias', cor: 'border-purple-500/40 bg-purple-500/5 text-purple-700 dark:text-purple-400' },
        ].map(item => (
          <div key={item.tipo} className={cn('p-4 rounded-xl border-2 text-center', item.cor)}>
            <div className="text-3xl font-black mb-1">{item.tipo}</div>
            <div className="font-bold text-xs">{item.nome}</div>
            <div className="text-xs opacity-75 mt-1">{item.desc}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-base">Passo a passo para lançar</h3>
        <div className="space-y-3">
          <StepCard number={1} title="Abra o CONTROLE DE FALTAS no menu" description="Fica no menu lateral esquerdo" />
          <StepCard number={2} title="Escolha o setor e o período" description="Selecione seu setor e o mês correto nos filtros do topo" />
          <StepCard number={3} title="Clique na célula do dia" description="Cada coluna é um dia do mês. Clique no cruzamento do nome do funcionário com o dia" />
          <StepCard number={4} title="Escolha P, F, A ou FE" description="O sistema salva na hora — não precisa clicar em nenhum botão de salvar" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold text-base">Perguntas comuns</h3>
        <Accordion titulo="Por que não consigo lançar falta num dia?">
          <p>Pode ser que a turma esteja de <strong>folga</strong> nesse dia (aparece 🛏️). Ou pode ser que o <strong>período esteja fechado</strong> — nesse caso fale com o RH.</p>
        </Accordion>
        <Accordion titulo="Posso lançar falta para funcionário de outro setor?">
          <p><strong>Não.</strong> Você só consegue lançar nos setores que são seus. Se precisar alterar algo de outro setor, crie uma <strong>divergência</strong>.</p>
        </Accordion>
        <Accordion titulo="Lancei errado, como corrijo?">
          <p>Se o período ainda está <strong>aberto</strong>, é só clicar de novo e mudar. Se já <strong>fechou</strong>, crie uma <strong>divergência</strong> pedindo a correção ao RH.</p>
        </Accordion>
      </div>
    </section>
  );
}

// ─── SEÇÃO: Divergências ──────────────────────────────────────
function SecaoDivergencias() {
  return (
    <section id="divergencias" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Divergências</h2>
          <p className="text-muted-foreground text-sm">Como avisar o RH quando algo está errado</p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-red-500/20 bg-red-500/5 p-6 space-y-4">
        <h3 className="font-bold text-base">O que é uma divergência?</h3>
        <p className="text-sm text-muted-foreground">
          É quando você, gestor, percebe que alguma coisa está <strong>errada</strong> no sistema e precisa avisar o RH. 
          Por exemplo: um funcionário sumiu e precisa ser marcado, uma falta foi lançada errada, ou alguém está no setor errado.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-base">Exemplo: funcionário sumiu</h3>
        <div className="space-y-3">
          <StepCard number={1} title='Vá em "Divergências" no menu' description="Fica no menu lateral esquerdo" />
          <StepCard number={2} title='Clique em "NOVA DIVERGÊNCIA"' description="Botão no canto superior direito da tela" />
          <StepCard number={3} title="Selecione o funcionário e o tipo SUMIDO" description="Escolha o nome do funcionário e marque o tipo como SUMIDO" />
          <StepCard number={4} title="Escreva uma observação se quiser" description='Exemplo: "Não aparece desde segunda-feira"' />
          <StepCard number={5} title="Confirme e pronto!" description="A divergência vai para a fila do RH. Eles analisam e resolvem. Você recebe uma notificação quando for resolvida." />
        </div>
      </div>

      <TelaSimulada titulo="Divergências – Como aparece para você">
        <div className="space-y-2">
          {[
            { func: 'CARLOS PEREIRA', tipo: 'SUMIDO', status: 'pendente', obs: 'Não aparece desde segunda' },
            { func: 'ANA SOUZA', tipo: 'CORREÇÃO FALTA', status: 'resolvido', obs: 'Dia 05 estava de atestado' },
          ].map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-muted/20">
              <div>
                <div className="text-sm font-semibold">{d.func}</div>
                <div className="text-xs text-muted-foreground">{d.tipo} · {d.obs}</div>
              </div>
              <Badge className={d.status === 'pendente' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' : 'bg-green-500/20 text-green-700 dark:text-green-400'}>
                {d.status === 'pendente' ? '⏳ PENDENTE (COM O RH)' : '✅ RESOLVIDO'}
              </Badge>
            </div>
          ))}
        </div>
      </TelaSimulada>

      <InfoBox tipo="dica">
        Depois que o RH resolver sua divergência, você recebe uma <strong>notificação automática</strong> no sistema.
      </InfoBox>
    </section>
  );
}

// ─── SEÇÃO: Troca de Turno ────────────────────────────────────
function SecaoTrocaTurno() {
  return (
    <section id="troca-turno" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 text-purple-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Troca de Turno</h2>
          <p className="text-muted-foreground text-sm">Quando o RH quer mover alguém de setor, você aprova ou recusa</p>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-base mb-3">Como funciona o fluxo</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            { label: 'RH cria a troca', cor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
            { label: '→' },
            { label: 'Gestor que vai PERDER o funcionário aprova', cor: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
            { label: '→' },
            { label: 'Gestor que vai RECEBER o funcionário aprova', cor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30' },
            { label: '→' },
            { label: 'RH efetiva a troca ✓', cor: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30' },
          ].map((step, i) => (
            step.label === '→'
              ? <ChevronRight key={i} className="h-4 w-4 text-muted-foreground" />
              : <span key={i} className={cn('px-3 py-1.5 rounded-lg border font-medium text-xs', step.cor)}>{step.label}</span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-base">Passo a passo para aprovar</h3>
        <StepCard number={1} title='Abra "Troca de Turno" no menu' description="Você vai ver as solicitações que envolvem seus setores" />
        <StepCard number={2} title="Veja os detalhes da troca" description="Quem é o funcionário, de onde vem e pra onde vai" />
        <StepCard number={3} title="Clique em APROVAR ou RECUSAR" description="Se recusar, escreva o motivo. O RH será avisado automaticamente." />
      </div>

      <InfoBox tipo="aviso">
        Quando uma troca envolver seu setor, você recebe uma <strong>notificação automática</strong>. Não precisa ficar entrando pra verificar.
      </InfoBox>
    </section>
  );
}

// ─── SEÇÃO: Previsão de Admissão ──────────────────────────────
function SimuladorPrevisao() {
  const [estado, setEstado] = useState<'pergunta' | 'sim' | 'nao'>('pergunta');
  const [animando, setAnimando] = useState(false);

  const handleResposta = (resp: 'sim' | 'nao') => {
    setAnimando(true);
    setTimeout(() => {
      setEstado(resp);
      setAnimando(false);
    }, 500);
  };

  const resetar = () => {
    setAnimando(true);
    setTimeout(() => {
      setEstado('pergunta');
      setAnimando(false);
    }, 300);
  };

  return (
    <TelaSimulada titulo="Central de Avisos – Previsão de Admissão (Simulador)">
      <div className={cn('transition-all duration-500', animando && 'opacity-0 scale-95')}>
        {estado === 'pergunta' && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-xl border-2 p-4 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30">
              <div className="rounded-full p-2.5 shrink-0 bg-card border border-purple-200 dark:border-purple-800">
                <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-purple-600 text-white">
                    PREVISÃO — INICIOU?
                  </span>
                </div>
                <p className="font-bold text-sm text-purple-600 dark:text-purple-400">PREVISÃO — SOPRO A</p>
                <p className="text-sm text-foreground mt-1 whitespace-pre-line leading-relaxed">
                  O funcionário <strong>MARIA SANTOS</strong> iniciou?{'\n\n'}Setor: SOPRO A{'\n'}Turma: A
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => handleResposta('sim')}
                    className="inline-flex items-center gap-1.5 text-xs h-8 px-4 rounded-md font-bold bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-105 animate-pulse"
                  >
                    👍 SIM, INICIOU
                  </button>
                  <button
                    onClick={() => handleResposta('nao')}
                    className="inline-flex items-center gap-1.5 text-xs h-8 px-4 rounded-md font-bold bg-destructive hover:bg-destructive/90 text-white transition-all hover:scale-105"
                  >
                    👎 NÃO INICIOU
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center animate-bounce">
              👆 Clique em um dos botões acima para ver o que acontece!
            </p>
          </div>
        )}

        {estado === 'sim' && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-xl border-2 border-green-500/40 bg-green-500/10 p-6 text-center space-y-3">
              <div className="text-5xl animate-scale-in">✅</div>
              <h3 className="font-bold text-lg text-green-700 dark:text-green-400">MARIA SANTOS → ATIVO!</h3>
              <p className="text-sm text-muted-foreground">
                O sistema <strong>automaticamente</strong> mudou a situação de PREVISÃO para <strong className="text-green-600">ATIVO</strong>.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 rounded bg-muted">PREVISÃO</span>
                <ChevronRight className="h-4 w-4" />
                <span className="px-2 py-1 rounded bg-green-500/20 text-green-700 dark:text-green-400 font-bold">ATIVO</span>
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs font-bold text-muted-foreground mb-1">📨 O que acontece depois:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• O <strong>administrador</strong> recebe uma notificação: <em>"Gestor LEILA respondeu: ✅ INICIOU — MARIA SANTOS foi movida para ATIVO"</em></p>
                <p>• O funcionário aparece no <strong>Quadro Real</strong> do dashboard</p>
                <p>• O número do quadro é atualizado <strong>em tempo real</strong></p>
              </div>
            </div>
            <button onClick={resetar} className="w-full text-xs bg-primary text-primary-foreground py-2 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
              🔄 Simular novamente
            </button>
          </div>
        )}

        {estado === 'nao' && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-xl border-2 border-red-500/40 bg-red-500/10 p-6 text-center space-y-3">
              <div className="text-5xl animate-scale-in">❌</div>
              <h3 className="font-bold text-lg text-red-700 dark:text-red-400">MARIA SANTOS — NÃO INICIOU</h3>
              <p className="text-sm text-muted-foreground">
                O funcionário <strong>permanece</strong> com situação <strong className="text-amber-600">PREVISÃO</strong>.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold">PREVISÃO (mantido)</span>
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs font-bold text-muted-foreground mb-1">📨 O que acontece depois:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• O <strong>administrador</strong> recebe uma notificação: <em>"Gestor LEILA respondeu: ❌ NÃO INICIOU — MARIA SANTOS permanece em PREVISÃO"</em></p>
                <p>• O RH decide os próximos passos (reagendar, cancelar, etc.)</p>
                <p>• O funcionário <strong>não aparece</strong> no Quadro Real</p>
              </div>
            </div>
            <button onClick={resetar} className="w-full text-xs bg-primary text-primary-foreground py-2 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
              🔄 Simular novamente
            </button>
          </div>
        )}
      </div>
    </TelaSimulada>
  );
}

function SecaoPrevisao() {
  return (
    <section id="previsao" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <UserPlus className="h-5 w-5 text-purple-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Previsão de Admissão</h2>
          <p className="text-muted-foreground text-sm">Quando chega um funcionário novo, o sistema pergunta se ele apareceu</p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-purple-500/20 bg-purple-500/5 p-6 space-y-4">
        <h3 className="font-bold text-base">Como funciona?</h3>
        <p className="text-sm text-muted-foreground">
          Quando o RH cadastra um <strong>novo funcionário</strong> com situação <strong>"PREVISÃO"</strong>, 
          o sistema envia automaticamente uma notificação para você no horário programado, perguntando: 
          <strong className="text-purple-600 dark:text-purple-400"> "O funcionário FULANO iniciou?"</strong>
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-base">Fluxo passo a passo</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            { label: 'RH cadastra com PREVISÃO', cor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
            { label: '→' },
            { label: 'Notificação automática para GESTOR', cor: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30' },
            { label: '→' },
            { label: 'Gestor responde SIM ou NÃO', cor: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
            { label: '→' },
            { label: 'Admin é notificado ✓', cor: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30' },
          ].map((step, i) => (
            step.label === '→'
              ? <ChevronRight key={i} className="h-4 w-4 text-muted-foreground" />
              : <span key={i} className={cn('px-3 py-1.5 rounded-lg border font-medium text-xs', step.cor)}>{step.label}</span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-base">O que fazer quando receber a notificação</h3>
        <StepCard number={1} title="Aparece o modal na tela automaticamente" description='O sistema mostra: "O funcionário MARIA SANTOS iniciou?" com dois botões' />
        <StepCard number={2} title='Se INICIOU → clique em "SIM, INICIOU" (verde)' description="O funcionário muda automaticamente de PREVISÃO para ATIVO e entra no quadro real" />
        <StepCard number={3} title='Se NÃO INICIOU → clique em "NÃO INICIOU" (vermelho)' description="O funcionário permanece em PREVISÃO. O RH decide o que fazer depois" />
        <StepCard number={4} title="O administrador é avisado" description="Em ambos os casos, o admin recebe uma notificação dizendo o que você respondeu" />
      </div>

      <SimuladorPrevisao />

      <InfoBox tipo="aviso">
        <strong>IMPORTANTE:</strong> A notificação chega no horário programado pelo RH (ex: 08:00 para turma A). 
        Se você não responder, o funcionário permanece em PREVISÃO até alguém confirmar.
      </InfoBox>

      <InfoBox tipo="dica">
        Só <strong>gestores</strong> recebem essa pergunta. Administradores recebem apenas a <strong>resposta</strong> do gestor.
      </InfoBox>
    </section>
  );
}

// ─── SEÇÃO: Notificações ──────────────────────────────────────
function SecaoNotificacoes() {
  return (
    <section id="notificacoes" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Bell className="h-5 w-5 text-indigo-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Notificações e Avisos do RH</h2>
          <p className="text-muted-foreground text-sm">Tipos de notificação, o que fazer com cada uma e regras importantes</p>
        </div>
      </div>

      {/* Regra geral */}
      <InfoBox tipo="info">
        Você recebe notificações <strong>apenas dos seus setores</strong>. Exceção: transferências e trocas de turno enviam para os <strong>2 gestores</strong> (origem e destino). Suas respostas vão automaticamente para o <strong>Admin + RH</strong>.
      </InfoBox>

      {/* Tipos que EXIGEM resposta */}
      <div className="rounded-2xl border-2 border-red-500/20 bg-red-500/5 p-6 space-y-4">
        <h3 className="font-bold text-base text-red-700 dark:text-red-400">🔒 Notificações que EXIGEM resposta (não somem até você responder)</h3>
        <div className="space-y-3">
          {[
            {
              tipo: '✅ ADMISSÃO — INICIOU?',
              cor: 'border-emerald-500/30 bg-emerald-500/5',
              desc: 'O RH cadastrou um novo funcionário e quer saber se ele apareceu no setor.',
              botoes: '👍 SIM, INICIOU | 👎 NÃO INICIOU',
              acao: 'SIM → funcionário muda para ATIVO automaticamente. NÃO → permanece em PREVISÃO.',
            },
            {
              tipo: '👤 PREVISÃO — INICIOU?',
              cor: 'border-purple-500/30 bg-purple-500/5',
              desc: 'Notificação automática enviada no horário programado para confirmar se o funcionário em PREVISÃO chegou.',
              botoes: '👍 SIM, INICIOU | 👎 NÃO INICIOU',
              acao: 'SIM → muda para ATIVO. NÃO → permanece em PREVISÃO. Admin + RH são notificados.',
            },
            {
              tipo: '⚖️ EXPERIÊNCIA — DECISÃO',
              cor: 'border-amber-500/30 bg-amber-500/5',
              desc: 'O RH pede sua decisão sobre um funcionário em período de experiência (90 dias).',
              botoes: '✅ EFETIVAR | ❌ DESLIGAR',
              acao: 'Sua decisão é registrada na tabela de experiência, gera log de auditoria e notifica Admin + RH.',
            },
            {
              tipo: '📋 COB/TREINAMENTO — CONFIRMAR',
              cor: 'border-orange-500/30 bg-orange-500/5',
              desc: 'O RH quer saber se o funcionário em cobertura/treinamento está efetivamente presente no setor.',
              botoes: '✅ SIM, ESTÁ | ❌ NÃO ESTÁ | 🔄 JÁ RETORNOU',
              acao: 'SIM → confirmação. NÃO → cria divergência automática. JÁ RETORNOU → muda situação para ATIVO e limpa cobertura.',
            },
          ].map((item, i) => (
            <div key={i} className={`rounded-xl border p-4 space-y-2 ${item.cor}`}>
              <p className="font-bold text-sm">{item.tipo}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {item.botoes.split(' | ').map((b, j) => (
                  <span key={j} className="text-[10px] font-bold px-2 py-1 rounded bg-card border">{b}</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic">→ {item.acao}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tipos com CIENTE */}
      <div className="rounded-2xl border-2 border-green-500/20 bg-green-500/5 p-6 space-y-4">
        <h3 className="font-bold text-base text-green-700 dark:text-green-400">✅ Notificações de ciência (botão CIENTE — somem ao clicar)</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { tipo: '🚪 DEMISSÃO', desc: 'Funcionário do seu setor foi desligado. Apenas ciência.' },
            { tipo: '📝 PEDIDO DE DEMISSÃO', desc: 'Funcionário pediu demissão. Apenas ciência.' },
            { tipo: '🔄 TRANSFERÊNCIA', desc: 'Funcionário transferido para/do seu setor. Enviado para 2 gestores.' },
            { tipo: '🔄 TROCA DE TURNO', desc: 'Nova solicitação de troca de turno envolvendo seu setor.' },
            { tipo: '⚠️ DIVERGÊNCIA NOVA', desc: 'Nova divergência criada no seu setor.' },
            { tipo: '↩️ DIVERGÊNCIA RETORNO', desc: 'Divergência reenviada por não ter sido resolvida.' },
            { tipo: '💬 DIVERGÊNCIA FEEDBACK', desc: 'O RH deu feedback em uma divergência do seu setor.' },
            { tipo: '📢 AVISO DO RH', desc: 'Comunicado geral enviado pelo RH via Central.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border bg-card">
              <div>
                <p className="font-semibold text-xs">{item.tipo}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regra do botão X e CIENTE DE TODOS */}
      <InfoBox tipo="aviso">
        <strong>REGRA IMPORTANTE:</strong> Ao clicar em <strong>"CIENTE DE TODOS"</strong> ou no <strong>"X"</strong> para fechar o modal, apenas as notificações de ciência são marcadas como lidas. As que exigem resposta (Admissão, Previsão, Experiência, Cobertura) <strong>permanecem abertas</strong> até você responder. O sistema avisa: <em>"X notificação(ões) exigem resposta antes de fechar!"</em>
      </InfoBox>

      {/* Visual dos badges */}
      <Accordion titulo="Cores e animações dos badges de notificação">
        <div className="grid grid-cols-2 gap-2">
          {[
            { tipo: 'DEMISSÃO', cor: '🔴 Vermelho', pulsa: 'Não' },
            { tipo: 'PED. DEMISSÃO', cor: '🟡 Âmbar', pulsa: 'Não' },
            { tipo: 'TRANSFERÊNCIA', cor: '🔵 Azul', pulsa: '✅ Sim (pulsante)' },
            { tipo: 'ADMISSÃO — INICIOU?', cor: '🟢 Esmeralda', pulsa: '✅ Sim (pulsante)' },
            { tipo: 'EXPERIÊNCIA — DECISÃO', cor: '🟡 Âmbar', pulsa: '✅ Sim (pulsante)' },
            { tipo: 'COB/TREIN. — CONFIRMAR', cor: '🟠 Laranja', pulsa: '✅ Sim (pulsante)' },
            { tipo: 'DIVERGÊNCIA', cor: '🟠 Laranja', pulsa: 'Não' },
            { tipo: 'AVISO RH', cor: '🔵 Primary', pulsa: 'Não' },
          ].map((item, i) => (
            <div key={i} className="text-xs flex items-center justify-between p-2 rounded border">
              <span className="font-semibold">{item.tipo}</span>
              <span className="text-muted-foreground">{item.cor} · {item.pulsa}</span>
            </div>
          ))}
        </div>
      </Accordion>

      <Accordion titulo="Para quem vão minhas respostas?">
        <p>Todas as suas respostas (Admissão, Previsão, Experiência, Cobertura/Treinamento) são enviadas automaticamente para o <strong>Administrador</strong> e para o <strong>RH</strong> (perfis rh_completo e rh_demissões). Eles recebem pelo <strong>sino</strong> (notificação lateral).</p>
      </Accordion>
    </section>
  );
}

// ─── SEÇÃO: Permissões ────────────────────────────────────────
function SecaoPermissoes() {
  return (
    <section id="permissoes" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Suas Permissões</h2>
          <p className="text-muted-foreground text-sm">O que você pode e o que não pode fazer</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4 space-y-3 border-green-500/30 bg-green-500/5">
          <h3 className="font-bold text-sm text-green-700 dark:text-green-400">✅ Você PODE</h3>
          <div className="space-y-1.5">
            {[
              'Ver o dashboard do seu grupo',
              'Lançar faltas dos seus setores',
              'Criar divergências (avisar o RH)',
              'Aprovar ou recusar trocas de turno',
              'Ver as escalas de folga',
              'Consultar funcionários (somente leitura)',
              'Ver previsão de admissão (somente leitura)',
              'Ver experiência geral (temporários e em experiência)',
              'Ver coberturas e treinamentos (somente leitura)',
              'Responder se funcionário INICIOU (admissão/previsão)',
              'Decidir EFETIVAR ou DESLIGAR (experiência)',
              'Confirmar presença em cobertura/treinamento',
              'Alterar TURMA dos seus funcionários',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <Check className="h-3 w-3 text-green-500 shrink-0" /> {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-4 space-y-3 border-red-500/30 bg-red-500/5">
          <h3 className="font-bold text-sm text-red-700 dark:text-red-400">❌ Você NÃO pode</h3>
          <div className="space-y-1.5">
            {[
              'Editar dados dos funcionários (nome, setor, situação)',
              'Lançar faltas de setores que não são seus',
              'Acessar demissões ou homologações',
              'Criar ou gerenciar usuários',
              'Editar o quadro necessário (meta)',
              'Acessar as telas de configuração',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <X className="h-3 w-3 text-red-500 shrink-0" /> {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl border bg-muted/30">
        <h3 className="font-bold text-sm mb-3">Gestores e seus setores</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Gestor</th>
                <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Grupo</th>
                <th className="text-left py-2 font-semibold text-muted-foreground">Setores que pode mexer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { nome: 'LEILA', grupo: 'SOPRO', setores: 'MOD-SOPRO A + G+P A' },
                { nome: 'ALEX', grupo: 'SOPRO', setores: 'MOD-SOPRO B + G+P B' },
                { nome: 'AMILTON', grupo: 'SOPRO', setores: 'MOD-SOPRO C + G+P C' },
                { nome: 'SILVIA', grupo: 'DECORAÇÃO', setores: 'DIA T1, DIA T2, NOITE T1, NOITE T2' },
              ].map(g => (
                <tr key={g.nome}>
                  <td className="py-2 pr-4 font-semibold">{g.nome}</td>
                  <td className="py-2 pr-4"><Badge variant="outline" className="text-xs">{g.grupo}</Badge></td>
                  <td className="py-2 text-muted-foreground text-xs">{g.setores}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InfoBox tipo="aviso">
        Se não está vendo algo que deveria ter acesso, fale com o <strong>RH</strong> para verificar suas permissões.
      </InfoBox>
    </section>
  );
}

// ─── Componente principal ─────────────────────────────────────
export default function ManualGestor() {
  const [secaoAtiva, setSecaoAtiva] = useState('sobre');

  const scrollTo = (id: string) => {
    setSecaoAtiva(id);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/80 sticky top-0 z-40 backdrop-blur">
        <div className="container py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">Manual do Gestor</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Tudo que você precisa saber para usar o sistema</p>
            </div>
          </div>
          <Link to="/home" className="text-sm text-primary flex items-center gap-1 hover:underline shrink-0">
            <ArrowRight className="h-3 w-3 rotate-180" /> Voltar
          </Link>
        </div>
      </div>

      <div className="container py-6">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-20 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">Seções</p>
              {SECOES.map(s => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={cn(
                      'flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left',
                      secaoAtiva === s.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {s.label}
                  </button>
                );
              })}

              {/* Quiz na sidebar */}
              <div className="pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">Teste seus conhecimentos</p>
                <QuizRapido />
              </div>
            </div>
          </aside>

          {/* Conteúdo */}
          <main className="flex-1 min-w-0 space-y-16">
            <SecaoSobre />
            <SecaoInicio />
            <SecaoDashboard />
            <SecaoEscalas />
            <SecaoExperiencia />
            <SecaoCoberturas />
            <SecaoFaltas />
            <SecaoDivergencias />
            <SecaoTrocaTurno />
            <SecaoPrevisao />
            <SecaoNotificacoes />
            <SecaoPermissoes />

            {/* Quiz mobile */}
            <section className="lg:hidden">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" /> Teste seus conhecimentos
              </h2>
              <QuizRapido />
            </section>

            <div className="pt-4 pb-8">
              <InfoBox tipo="dica">
                Dúvidas que não estão aqui? Fale com o <strong>RH</strong> — estamos aqui pra ajudar!
              </InfoBox>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Printer, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useFuncionarios } from '@/hooks/useFuncionarios';
import { useSituacoesAtivas } from '@/hooks/useSituacoes';
import { useCreateDemissao } from '@/hooks/useDemissoes';
import { useAuth } from '@/hooks/useAuth';
import { useTiposDesligamentoAtivos, TipoDesligamento } from '@/hooks/useTiposDesligamento';
import { toast } from 'sonner';
import logoGlobalpack from '@/assets/logo-globalpack-new.png';
import { cn } from '@/lib/utils';

// ── Gerador de texto de carta por tipo (usa template do banco) ────────────────
function gerarTextoCarta(
  tipo: TipoDesligamento,
  nome: string,
  matricula: string,
  cargo: string,
  cidade: string,
  dataDesligamento: string,
  dataExame: string,
  horaExame: string,
  dataHomologacao: string,
  horaHomologacao: string,
  alineaClt: string,
): string {
  const fmt = (d: string) => d ? format(parseISO(d), "dd/MM/yyyy") : '___/___/______';
  const fmtLong = (d: string) => d ? format(parseISO(d), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '____ de __________ de ______';

  const templateBase = tipo.template_texto ||
    `Por não mais convir a esta empresa mantê-lo(a) em nosso quadro de funcionários, vimos comunicar-lhe a rescisão de seu contrato de trabalho a partir desta data.

Solicitamos seu comparecimento ao setor de enfermaria no dia {DATA_EXAME} às {HORA_EXAME}h para se dar cumprimento às formalidades legais como exame demissional, e devolução dos EPIs fornecidos.

Informamos ainda que, no dia {DATA_HOMOLOGACAO} às {HORA_HOMOLOGACAO}h deverá comparecer no RH para entrega da documentação referente ao saque do FGTS e guias do seguro desemprego, bem como o TRCT e comprovante de pagamento, na forma do disposto no artigo 477, § 6°, da CLT.

Qualquer dúvida, entrar em contato com a área de Recursos Humanos (telefone 19 3856-9267).`;

  const texto = templateBase
    .replace(/{NOME}/g, nome.toUpperCase())
    .replace(/{MATRICULA}/g, matricula || '-')
    .replace(/{CARGO}/g, cargo || '-')
    .replace(/{CIDADE}/g, cidade || 'Vinhedo')
    .replace(/{DATA_DESLIGAMENTO}/g, fmtLong(dataDesligamento))
    .replace(/{DATA_DESLIGAMENTO_CURTA}/g, fmt(dataDesligamento))
    .replace(/{DATA_EXAME}/g, dataExame ? fmt(dataExame) : '___/___/______')
    .replace(/{HORA_EXAME}/g, horaExame || '__:__')
    .replace(/{DATA_HOMOLOGACAO}/g, dataHomologacao ? fmt(dataHomologacao) : '___/___/______')
    .replace(/{HORA_HOMOLOGACAO}/g, horaHomologacao || '__:__')
    .replace(/{ALINEA_CLT}/g, alineaClt || '____');

  return texto;
}


// ── Componente principal ──────────────────────────────────────────────────────
export default function CartaDesligamento() {
  // Etapas: 1 = tipo | 2 = dados | 3 = preview
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);

  // Step 1
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoDesligamento | null>(null);

  // Step 2 – funcionário
  const [searchTerm, setSearchTerm] = useState('');
  const [funcionarioId, setFuncionarioId] = useState('');
  const [cpf, setCpf] = useState('');

  // Step 2 – datas e horas
  const [dataDesligamento, setDataDesligamento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [alineaClt, setAlineaClt] = useState('');
  const [usaExame, setUsaExame] = useState(false);
  const [dataExame, setDataExame] = useState('');
  const [horaExame, setHoraExame] = useState('');
  const [usaHomologacao, setUsaHomologacao] = useState(false);
  const [dataHomologacao, setDataHomologacao] = useState('');
  const [horaHomologacao, setHoraHomologacao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Confirmação cadastro
  const [showConfirmDemissao, setShowConfirmDemissao] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const { data: funcionarios = [] } = useFuncionarios();
  const { data: situacoes = [] } = useSituacoesAtivas();
  const { data: tiposDesligamento = [] } = useTiposDesligamentoAtivos();
  const createDemissao = useCreateDemissao();
  const { userRole } = useAuth();

  const situacaoPedidoDemissao = situacoes.find(s => s.nome.toUpperCase() === 'PED. DEMISSÃO');

  const funcionariosFiltrados = funcionarios.filter((f) => {
    const termo = searchTerm.toLowerCase();
    return (
      f.nome_completo.toLowerCase().includes(termo) ||
      (f.matricula && f.matricula.toLowerCase().includes(termo))
    );
  });

  const funcionarioSelecionado = funcionarios.find(f => f.id === funcionarioId);

  const selecionarFuncionario = (f: typeof funcionarios[number]) => {
    setFuncionarioId(f.id);
    setSearchTerm(f.nome_completo);
  };

  // ── Navegar para etapa 2 após escolha do tipo ─────────────────────────────
  const selecionarTipo = (tipo: TipoDesligamento) => {
    setTipoSelecionado(tipo);
    setUsaExame(tipo.tem_exame_demissional);
    setUsaHomologacao(tipo.tem_homologacao);
    setEtapa(2);
  };

  // ── Validar e ir para preview ─────────────────────────────────────────────
  const irParaPreview = () => {
    if (!funcionarioId) { toast.error('Selecione o funcionário.'); return; }
    // Se o template usa {ALINEA_CLT}, exigir preenchimento
    const usaAlinea = tipoSelecionado?.template_texto?.includes('{ALINEA_CLT}');
    if (usaAlinea && !alineaClt.trim()) { toast.error('Preencha o motivo (alínea da CLT). Campo obrigatório.'); return; }
    setEtapa(3);
  };

  // ── Impressão ─────────────────────────────────────────────────────────────
  const handleImprimir = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Permita pop-ups para imprimir.'); return; }

    printWindow.document.write(`
      <!DOCTYPE html><html><head>
      <title>Carta de Desligamento</title>
      <style>
        @page { margin: 2cm; size: A4; }
        body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.7; color: #000; margin: 0; padding: 0; }
        .carta-container { max-width: 700px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #222; padding-bottom: 15px; }
        .header img { max-height: 60px; margin-bottom: 10px; }
        .header h1 { font-size: 15pt; margin: 5px 0; text-transform: uppercase; letter-spacing: 1px; }
        .header p { font-size: 10pt; color: #555; margin: 2px 0; }
        .dados-section { margin: 20px 0; }
        .dados-section h2 { font-size: 11pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .dados-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
        .dado-label { font-weight: bold; font-size: 9pt; color: #555; text-transform: uppercase; }
        .dado-valor { font-size: 11pt; margin-bottom: 4px; }
        .corpo { margin: 25px 0; font-size: 12pt; text-align: justify; white-space: pre-line; }
        .datas-section { margin: 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .data-box { border: 1px solid #ccc; border-radius: 4px; padding: 10px 14px; }
        .data-box .label { font-size: 9pt; font-weight: bold; color: #555; text-transform: uppercase; }
        .data-box .valor { font-size: 12pt; font-weight: bold; }
        .data-local { margin-top: 30px; text-align: right; font-size: 11pt; }
        .assinaturas { margin-top: 70px; display: flex; justify-content: space-between; }
        .assinatura-box { text-align: center; width: 44%; }
        .assinatura-linha { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 10pt; }
        .obs { margin-top: 20px; font-size: 10pt; color: #444; border-top: 1px dashed #ccc; padding-top: 10px; }
      </style>
      </head><body>${printContent.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    setTimeout(() => setShowConfirmDemissao(true), 1000);
  };

  // ── Cadastrar demissão após imprimir ─────────────────────────────────────
  const handleCadastrarDemissao = async () => {
    if (!funcionarioSelecionado || !tipoSelecionado) return;
    try {
      const situacaoNome = funcionarioSelecionado.situacao?.nome?.toUpperCase() || '';
      const jaDesligado = situacaoNome === 'DEMISSÃO' || situacaoNome === 'PED. DEMISSÃO';
      await createDemissao.mutateAsync({
        funcionario_id: funcionarioId,
        tipo_desligamento: tipoSelecionado.nome,
        data_prevista: dataDesligamento,
        situacaoPedidoDemissaoId: situacaoPedidoDemissao?.id,
        setor_nome: funcionarioSelecionado.setor?.nome || undefined,
        criado_por_nome: userRole?.nome || 'Sistema',
        funcionario_nome: funcionarioSelecionado.nome_completo || undefined,
        setor_id: funcionarioSelecionado.setor?.id || undefined,
        turma: funcionarioSelecionado.turma || undefined,
        skipSituacaoUpdate: jaDesligado,
      });
      toast.success('Demissão cadastrada com sucesso!');
      setShowConfirmDemissao(false);
      resetForm();
    } catch {
      toast.error('Erro ao cadastrar demissão.');
    }
  };

  const resetForm = () => {
    setEtapa(1);
    setTipoSelecionado(null);
    setFuncionarioId('');
    setSearchTerm('');
    setAlineaClt('');
    setCpf('');
    setDataDesligamento(format(new Date(), 'yyyy-MM-dd'));
    setUsaExame(false);
    setDataExame('');
    setHoraExame('');
    setUsaHomologacao(false);
    setDataHomologacao('');
    setHoraHomologacao('');
    setObservacoes('');
    setShowConfirmDemissao(false);
  };

  const fmtData = (d: string) => d ? format(parseISO(d), 'dd/MM/yyyy') : '-';
  const fmtDataLong = (d: string) => d ? format(parseISO(d), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '';

  // Texto da carta gerado dinamicamente
  const textoCarta = tipoSelecionado && funcionarioSelecionado
    ? gerarTextoCarta(
        tipoSelecionado,
        funcionarioSelecionado.nome_completo,
        funcionarioSelecionado.matricula || '',
        funcionarioSelecionado.cargo || '',
        'Vinhedo',
        dataDesligamento,
        usaExame ? dataExame : '',
        usaExame ? horaExame : '',
        usaHomologacao ? dataHomologacao : '',
        usaHomologacao ? horaHomologacao : '',
        alineaClt,
      )
    : '';

  // ── Indicador de etapas ──────────────────────────────────────────────────
  const Stepper = () => (
    <div className="flex items-center gap-2 mb-6 text-sm">
      {[
        { n: 1, label: 'TIPO DE CARTA' },
        { n: 2, label: 'DADOS' },
        { n: 3, label: 'PREVIEW' },
      ].map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
            etapa === s.n
              ? 'bg-primary text-primary-foreground'
              : etapa > s.n
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'
          )}>
            {etapa > s.n ? <Check className="h-3 w-3" /> : <span>{s.n}</span>}
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">CARTA DE DESLIGAMENTO</h1>
        <p className="page-description">GERAÇÃO DE CARTA FORMAL POR TIPO DE DESLIGAMENTO</p>
      </div>

      <Stepper />

      {/* ═══════════ ETAPA 1: ESCOLHA DO TIPO ═══════════ */}
      {etapa === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
          {tiposDesligamento.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-3">Carregando tipos de desligamento...</p>
          )}
          {tiposDesligamento.map((tipo) => (
            <button
              key={tipo.id}
              onClick={() => selecionarTipo(tipo)}
              className="text-left border rounded-xl p-5 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="text-3xl mb-3">{tipo.emoji}</div>
              <div className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">
                {tipo.nome.toUpperCase()}
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                {tipo.descricao}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {tipo.tem_exame_demissional && (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                    Exame demissional
                  </span>
                )}
                {tipo.tem_homologacao && (
                  <span className="text-[10px] bg-accent text-accent-foreground px-2 py-0.5 rounded">
                    Homologação
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ═══════════ ETAPA 2: DADOS ═══════════ */}
      {etapa === 2 && tipoSelecionado && (
        <div className="max-w-2xl space-y-4">
          {/* Tipo selecionado */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-2xl">{tipoSelecionado.emoji}</span>
            <div>
              <div className="font-bold text-sm text-primary">{tipoSelecionado.nome.toUpperCase()}</div>
              <button onClick={() => setEtapa(1)} className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2">
                Alterar tipo
              </button>
            </div>
          </div>

          {/* ── DADOS DO FUNCIONÁRIO ── */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Dados do Colaborador
              </div>

              {/* Busca */}
              <div className="space-y-1">
                <Label>Funcionário *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou matrícula..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); if (funcionarioId) setFuncionarioId(''); }}
                    className="pl-10"
                  />
                  {funcionarioSelecionado && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setFuncionarioId(''); setSearchTerm(''); }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2 text-xs">
                      Trocar
                    </Button>
                  )}
                </div>
                {searchTerm && !funcionarioSelecionado && (
                  <div className="max-h-48 overflow-y-auto border rounded-lg bg-background shadow-md z-10">
                    {funcionariosFiltrados.length === 0 ? (
                      <div className="px-3 py-4 text-center text-muted-foreground text-sm">Nenhum funcionário encontrado</div>
                    ) : (
                      funcionariosFiltrados.slice(0, 20).map((f) => (
                        <button key={f.id} type="button" onClick={() => selecionarFuncionario(f)}
                          className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0">
                          <div className="font-medium text-sm">{f.nome_completo}</div>
                          <div className="text-xs text-muted-foreground">{f.matricula} • {f.setor?.nome}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Info do funcionário selecionado */}
              {funcionarioSelecionado && (
                <div className="bg-muted/40 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground text-xs uppercase">Matrícula</span><div className="font-mono font-medium">{funcionarioSelecionado.matricula || '-'}</div></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Admissão</span><div>{funcionarioSelecionado.data_admissao ? fmtData(funcionarioSelecionado.data_admissao) : '-'}</div></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Cargo</span><div>{funcionarioSelecionado.cargo || '-'}</div></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Setor</span><div>{funcionarioSelecionado.setor?.nome || '-'}</div></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Turma</span><div>{funcionarioSelecionado.turma || '-'}</div></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Empresa</span><div>{funcionarioSelecionado.empresa || '-'}</div></div>
                </div>
              )}

              {/* CPF */}
              <div className="space-y-1">
                <Label>CPF do Colaborador</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => {
                    // Formatar CPF automaticamente
                    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
                    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
                    else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, '$1.$2');
                    setCpf(v);
                  }}
                  maxLength={14}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── MOTIVO / ALÍNEA CLT (apenas quando o template exige) ── */}
          {tipoSelecionado.template_texto?.includes('{ALINEA_CLT}') && (
            <Card className="border-orange-300 bg-orange-50/30 dark:bg-orange-950/20">
              <CardContent className="pt-4 space-y-2">
                <div className="font-semibold text-sm uppercase tracking-wide text-orange-600 dark:text-orange-400">
                  Motivo — Obrigatório
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Alínea do Art. 482 da CLT *</Label>
                  <Input
                    placeholder='Ex: "e" (desídia), "b" (mau procedimento)...'
                    value={alineaClt}
                    onChange={(e) => setAlineaClt(e.target.value)}
                    className="border-orange-300 focus:ring-orange-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Informe a alínea que fundamenta a justa causa. Este campo aparecerá no corpo da carta.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── DATAS ── */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Datas e Horários
              </div>

              {/* Data desligamento */}
              <div className="space-y-1">
                <Label>Data do Desligamento</Label>
                <Input type="date" value={dataDesligamento} onChange={(e) => setDataDesligamento(e.target.value)} />
              </div>

              {/* Exame demissional */}
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Exame Demissional</Label>
                  <Switch checked={usaExame} onCheckedChange={setUsaExame} />
                </div>
                {usaExame && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Data</Label>
                      <Input type="date" value={dataExame} onChange={(e) => setDataExame(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Horário</Label>
                      <Input type="time" value={horaExame} onChange={(e) => setHoraExame(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Homologação */}
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Homologação</Label>
                  <Switch checked={usaHomologacao} onCheckedChange={setUsaHomologacao} />
                </div>
                {usaHomologacao && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Data</Label>
                      <Input type="date" value={dataHomologacao} onChange={(e) => setDataHomologacao(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Horário</Label>
                      <Input type="time" value={horaHomologacao} onChange={(e) => setHoraHomologacao(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Observações adicionais */}
              <div className="space-y-1">
                <Label>Observações Adicionais (opcional)</Label>
                <Textarea
                  placeholder="Texto adicional que aparecerá na carta..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setEtapa(1)} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> VOLTAR
            </Button>
            <Button onClick={irParaPreview} className="gap-2">
              VER CARTA <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════ ETAPA 3: PREVIEW ═══════════ */}
      {etapa === 3 && tipoSelecionado && funcionarioSelecionado && (
        <div className="max-w-3xl space-y-4">
          {/* Carta impressível */}
          <div className="border rounded-xl p-8 bg-white text-black shadow-sm" ref={printRef}>
            {/* Cabeçalho — igual ao PDF */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <img src={logoGlobalpack} alt="GLOBALPACK" style={{ maxHeight: '55px', display: 'block', margin: '0 auto 12px' }} />
              <h1 style={{ fontSize: '14pt', margin: '4px 0', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>
                {tipoSelecionado.nome.toUpperCase()}
              </h1>
            </div>

            {/* Data e local (topo direito) */}
            <div style={{ textAlign: 'right', fontSize: '11pt', marginBottom: '20px' }}>
              Vinhedo, {fmtDataLong(dataDesligamento)}.
            </div>

            {/* Destinatário — A/C.: NOME   ID MATRICULA */}
            <div style={{ marginBottom: '20px', fontSize: '12pt' }}>
              <strong>A/C.:</strong> {funcionarioSelecionado.nome_completo.toUpperCase()}
              {funcionarioSelecionado.matricula && (
                <span style={{ marginLeft: '16px', color: '#333' }}>
                  ID {funcionarioSelecionado.matricula}
                </span>
              )}
            </div>

            {/* Corpo da carta */}
            <div style={{ fontSize: '12pt', textAlign: 'justify', lineHeight: '1.8', whiteSpace: 'pre-line' }}>
              {textoCarta}
            </div>

            {/* Observações */}
            {observacoes && (
              <div style={{ marginTop: '20px', fontSize: '10pt', color: '#444', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                <strong>OBS:</strong> {observacoes}
              </div>
            )}

            {/* Assinaturas — layout do PDF */}
            <div style={{ marginTop: '20px', fontSize: '11pt' }}>
              Globalpack Indústria e Comércio Ltda
            </div>
            <div style={{ marginTop: '60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px 30px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '5px', fontSize: '10pt' }}>
                  Empregado
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '5px', fontSize: '10pt' }}>
                  Representante Legal (menor)
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '5px', fontSize: '10pt' }}>
                  Testemunha
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '5px', fontSize: '10pt' }}>
                  Testemunha
                </div>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" onClick={() => setEtapa(2)} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> VOLTAR E EDITAR
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm}>NOVA CARTA</Button>
              <Button onClick={handleImprimir} className="gap-2">
                <Printer className="h-4 w-4" /> IMPRIMIR CARTA
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação cadastrar demissão */}
      <AlertDialog open={showConfirmDemissao} onOpenChange={setShowConfirmDemissao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>CADASTRAR DEMISSÃO?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja registrar esta demissão no sistema? O registro será criado como <strong>agendado</strong>.
              <br /><br />
              <strong>{funcionarioSelecionado?.nome_completo}</strong> — {tipoSelecionado?.nome}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowConfirmDemissao(false); toast.info('Carta impressa sem cadastrar demissão.'); }}>
              NÃO, APENAS A CARTA
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCadastrarDemissao}>
              SIM, CADASTRAR DEMISSÃO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Printer, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useFuncionarios } from '@/hooks/useFuncionarios';
import { useSituacoesAtivas } from '@/hooks/useSituacoes';
import { useCreateDemissao } from '@/hooks/useDemissoes';
import { TIPOS_DESLIGAMENTO } from '@/types/demissao';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import logoGlobalpack from '@/assets/logo-globalpack-carta.jpg';

interface CartaDesligamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartaDesligamentoDialog({ open, onOpenChange }: CartaDesligamentoDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [funcionarioId, setFuncionarioId] = useState('');
  const [tipoDesligamento, setTipoDesligamento] = useState('');
  const [dataPrevista, setDataPrevista] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [motivoTexto, setMotivoTexto] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDemissao, setShowConfirmDemissao] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: funcionarios = [] } = useFuncionarios();
  const { data: situacoes = [] } = useSituacoesAtivas();
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

  const limparFuncionario = () => {
    setFuncionarioId('');
    setSearchTerm('');
  };

  const canGenerateLetter = !!funcionarioId && !!tipoDesligamento && !!dataPrevista;

  const handleGerarCarta = () => {
    if (!canGenerateLetter) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setShowPreview(true);
  };

  const handleImprimir = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Permita pop-ups para imprimir.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Carta de Desligamento</title>
        <style>
          @page { margin: 2cm; size: A4; }
          body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; color: #000; margin: 0; padding: 0; }
          .carta-container { max-width: 700px; margin: 0 auto; }
          .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .header img { max-height: 70px; }
          .header h1 { font-size: 16pt; margin: 5px 0; text-transform: uppercase; }
          .header p { font-size: 10pt; color: #555; margin: 2px 0; }
          .dados-section { margin: 20px 0; }
          .dados-section h2 { font-size: 13pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; }
          .dados-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .dado-item { margin-bottom: 5px; }
          .dado-label { font-weight: bold; font-size: 10pt; color: #555; }
          .dado-valor { font-size: 11pt; }
          .motivo-section { margin: 25px 0; }
          .motivo-section p { text-align: justify; }
          .assinatura-section { margin-top: 60px; display: flex; justify-content: space-between; }
          .assinatura-box { text-align: center; width: 45%; }
          .assinatura-linha { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 10pt; }
          .data-local { margin-top: 30px; text-align: right; font-size: 11pt; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);

    // Após imprimir, perguntar se quer cadastrar a demissão
    setTimeout(() => {
      setShowConfirmDemissao(true);
    }, 1000);
  };

  const handleCadastrarDemissao = async () => {
    if (!funcionarioSelecionado) return;

    try {
      // Verificar situação atual
      const situacaoNome = funcionarioSelecionado.situacao?.nome?.toUpperCase() || '';
      const jaDesligado = situacaoNome === 'DEMISSÃO' || situacaoNome === 'PED. DEMISSÃO';

      await createDemissao.mutateAsync({
        funcionario_id: funcionarioId,
        tipo_desligamento: tipoDesligamento,
        data_prevista: dataPrevista,
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
      onOpenChange(false);
    } catch {
      toast.error('Erro ao cadastrar demissão.');
    }
  };

  const resetForm = () => {
    setFuncionarioId('');
    setSearchTerm('');
    setTipoDesligamento('');
    setDataPrevista(format(new Date(), 'yyyy-MM-dd'));
    setMotivoTexto('');
    setShowPreview(false);
    setShowConfirmDemissao(false);
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const dataFormatada = dataPrevista ? format(parseISO(dataPrevista), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '';

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg uppercase">📄 CARTA DE DESLIGAMENTO</DialogTitle>
          </DialogHeader>

          {!showPreview ? (
            <div className="space-y-4">
              {/* Buscar Funcionário */}
              <div className="space-y-2">
                <Label className="font-medium">Funcionário *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou matrícula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {funcionarioSelecionado && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={limparFuncionario}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2"
                    >
                      Trocar
                    </Button>
                  )}
                </div>

                {searchTerm && !funcionarioSelecionado && (
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    {funcionariosFiltrados.length === 0 ? (
                      <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                        Nenhum funcionário encontrado
                      </div>
                    ) : (
                      funcionariosFiltrados.slice(0, 20).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => selecionarFuncionario(f)}
                          className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                        >
                          <div className="font-medium">{f.nome_completo}</div>
                          <div className="text-sm text-muted-foreground">
                            {f.matricula} • {f.setor?.nome}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Info do funcionário selecionado */}
              {funcionarioSelecionado && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Matrícula:</span> <span className="font-mono">{funcionarioSelecionado.matricula || '-'}</span></div>
                    <div><span className="text-muted-foreground">Admissão:</span> {funcionarioSelecionado.data_admissao ? format(parseISO(funcionarioSelecionado.data_admissao), 'dd/MM/yyyy') : '-'}</div>
                    <div><span className="text-muted-foreground">Cargo:</span> {funcionarioSelecionado.cargo || '-'}</div>
                    <div><span className="text-muted-foreground">Setor:</span> {funcionarioSelecionado.setor?.nome || '-'}</div>
                    <div><span className="text-muted-foreground">Turma:</span> {funcionarioSelecionado.turma || '-'}</div>
                    <div><span className="text-muted-foreground">Empresa:</span> {funcionarioSelecionado.empresa || '-'}</div>
                  </div>
                </div>
              )}

              {/* Tipo de desligamento */}
              <div className="space-y-2">
                <Label className="font-medium">Tipo de Desligamento *</Label>
                <Select value={tipoDesligamento} onValueChange={setTipoDesligamento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DESLIGAMENTO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data prevista */}
              <div className="space-y-2">
                <Label className="font-medium">Data do Desligamento *</Label>
                <Input
                  type="date"
                  value={dataPrevista}
                  onChange={(e) => setDataPrevista(e.target.value)}
                />
              </div>

              {/* Texto livre para motivo */}
              <div className="space-y-2">
                <Label className="font-medium">Observações / Motivo (opcional)</Label>
                <Textarea
                  placeholder="Texto adicional que aparecerá na carta..."
                  value={motivoTexto}
                  onChange={(e) => setMotivoTexto(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => handleClose(false)}>CANCELAR</Button>
                <Button onClick={handleGerarCarta} disabled={!canGenerateLetter} className="gap-2">
                  <Printer className="h-4 w-4" />
                  GERAR CARTA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview da carta */}
              <div className="border rounded-lg p-6 bg-white text-black" ref={printRef}>
                <div className="carta-container">
                  {/* Header */}
                  <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '15px' }}>
                    <div>
                      <h1 style={{ fontSize: '16pt', margin: '5px 0', textTransform: 'uppercase' }}>AVISO PRÉVIO DO EMPREGADOR</h1>
                      <h1 style={{ fontSize: '16pt', margin: '5px 0', textTransform: 'uppercase' }}>INDENIZADO</h1>
                    </div>
                    <img src={logoGlobalpack} alt="GLOBALPACK" style={{ maxHeight: '70px' }} />
                  </div>

                  {/* Dados do funcionário */}
                  <div className="dados-section" style={{ margin: '20px 0' }}>
                    <h2 style={{ fontSize: '13pt', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px', textTransform: 'uppercase' }}>
                      DADOS DO COLABORADOR
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '10pt', color: '#555' }}>NOME</div>
                        <div style={{ fontSize: '11pt' }}>{funcionarioSelecionado?.nome_completo?.toUpperCase() || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '10pt', color: '#555' }}>MATRÍCULA</div>
                        <div style={{ fontSize: '11pt' }}>{funcionarioSelecionado?.matricula || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '10pt', color: '#555' }}>CARGO</div>
                        <div style={{ fontSize: '11pt' }}>{funcionarioSelecionado?.cargo || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '10pt', color: '#555' }}>SETOR</div>
                        <div style={{ fontSize: '11pt' }}>{funcionarioSelecionado?.setor?.nome || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '10pt', color: '#555' }}>TURMA</div>
                        <div style={{ fontSize: '11pt' }}>{funcionarioSelecionado?.turma || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '10pt', color: '#555' }}>DATA DE ADMISSÃO</div>
                        <div style={{ fontSize: '11pt' }}>
                          {funcionarioSelecionado?.data_admissao ? format(parseISO(funcionarioSelecionado.data_admissao), 'dd/MM/yyyy') : '-'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '10pt', color: '#555' }}>EMPRESA</div>
                        <div style={{ fontSize: '11pt' }}>{funcionarioSelecionado?.empresa || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '10pt', color: '#555' }}>DATA DO DESLIGAMENTO</div>
                        <div style={{ fontSize: '11pt' }}>{dataPrevista ? format(parseISO(dataPrevista), 'dd/MM/yyyy') : '-'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Tipo de desligamento */}
                  <div style={{ margin: '20px 0' }}>
                    <h2 style={{ fontSize: '13pt', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px', textTransform: 'uppercase' }}>
                      TIPO DE DESLIGAMENTO
                    </h2>
                    <p style={{ fontSize: '12pt', fontWeight: 'bold' }}>{tipoDesligamento.toUpperCase()}</p>
                  </div>

                  {/* Observações / Motivo */}
                  {motivoTexto && (
                    <div style={{ margin: '25px 0' }}>
                      <h2 style={{ fontSize: '13pt', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px', textTransform: 'uppercase' }}>
                        OBSERVAÇÕES
                      </h2>
                      <p style={{ textAlign: 'justify', fontSize: '11pt' }}>{motivoTexto}</p>
                    </div>
                  )}

                  {/* Data e local */}
                  <div style={{ marginTop: '30px', textAlign: 'right', fontSize: '11pt' }}>
                    Blumenau, {dataFormatada}
                  </div>

                  {/* Assinaturas */}
                  <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ textAlign: 'center', width: '45%' }}>
                      <div style={{ borderTop: '1px solid #333', marginTop: '50px', paddingTop: '5px', fontSize: '10pt' }}>
                        RESPONSÁVEL RH
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', width: '45%' }}>
                      <div style={{ borderTop: '1px solid #333', marginTop: '50px', paddingTop: '5px', fontSize: '10pt' }}>
                        {funcionarioSelecionado?.nome_completo?.toUpperCase() || 'COLABORADOR'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  ← VOLTAR E EDITAR
                </Button>
                <Button onClick={handleImprimir} className="gap-2">
                  <Printer className="h-4 w-4" />
                  IMPRIMIR CARTA
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação para cadastrar demissão */}
      <AlertDialog open={showConfirmDemissao} onOpenChange={setShowConfirmDemissao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>CADASTRAR DEMISSÃO?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja cadastrar esta demissão no sistema? O registro será criado como <strong>agendado</strong> (não realizado).
              <br /><br />
              <strong>{funcionarioSelecionado?.nome_completo}</strong> — {tipoDesligamento}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConfirmDemissao(false);
              toast.info('Carta impressa sem cadastrar demissão.');
            }}>
              NÃO, APENAS A CARTA
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCadastrarDemissao}>
              SIM, CADASTRAR DEMISSÃO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

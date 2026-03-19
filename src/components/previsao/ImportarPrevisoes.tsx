import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, ClipboardPaste, AlertCircle, CheckCircle2, X, Download, HelpCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Setor, Situacao, SexoTipo, EmpresaTipo } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ImportarPrevisoesProps {
  setores: Setor[];
  situacaoPrevisao: Situacao | undefined;
}

interface PrevisaoImport {
  linha: number;
  nome_completo: string;
  sexo: SexoTipo;
  setor_nome: string;
  setor_original: string;
  empresa?: string;
  matricula?: string;
  data_admissao?: string;
  cargo?: string;
  turma?: string;
  observacoes?: string;
  avisos: string[];
  errosCriticos: string[];
  setor_id: string;
}

// Colunas para previsão: Nome | Sexo | Setor | Empresa | Matrícula | Data Prevista | Cargo | Turma | Observações
const COLUNAS_PREVISAO = [
  'Nome Completo',
  'Sexo (M/F)',
  'Setor',
  'Empresa',
  'Matrícula',
  'Data Prevista',
  'Cargo',
  'Turma',
  'Observações',
];

export function ImportarPrevisoes({ setores, situacaoPrevisao }: ImportarPrevisoesProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dados, setDados] = useState<PrevisaoImport[]>([]);
  const [textoColado, setTextoColado] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importTab, setImportTab] = useState<'colar' | 'excel'>('colar');

  const normalizarTexto = (texto: string): string => {
    return texto?.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
  };

  const encontrarSetor = (nome: string): { setor: Setor | undefined; aviso?: string } => {
    const nomeNorm = normalizarTexto(nome);
    
    const exato = setores.find(s => normalizarTexto(s.nome) === nomeNorm);
    if (exato) return { setor: exato };
    
    if (nomeNorm.includes('decoracao')) {
      if (nomeNorm.includes('noite')) {
        const setorNoite = setores.find(s => normalizarTexto(s.nome) === 'decoracao mod noite');
        if (setorNoite) return { setor: setorNoite, aviso: `Setor "${nome}" → ${setorNoite.nome}` };
      }
      const setorDia = setores.find(s => normalizarTexto(s.nome) === 'decoracao mod dia');
      if (setorDia) return { setor: setorDia, aviso: nomeNorm !== 'decoracao mod dia' ? `Setor "${nome}" → ${setorDia.nome}` : undefined };
    }
    
    if (nomeNorm.includes('sopro')) {
      const turmaMatch = nomeNorm.match(/\b([abc])\s*$/);
      if (turmaMatch) {
        const turmaLetra = turmaMatch[1].toLowerCase();
        const setorSopro = setores.find(s => normalizarTexto(s.nome).includes('sopro') && normalizarTexto(s.nome).endsWith(turmaLetra));
        if (setorSopro) return { setor: setorSopro, aviso: `Setor "${nome}" → ${setorSopro.nome}` };
      }
    }
    
    return { setor: undefined };
  };

  const parseSexo = (valor: string): SexoTipo | null => {
    const v = valor?.toString().trim().toLowerCase();
    if (v === 'm' || v === 'masculino' || v === 'masc') return 'masculino';
    if (v === 'f' || v === 'feminino' || v === 'fem') return 'feminino';
    return null;
  };

  const parseEmpresa = (valor: string): EmpresaTipo => {
    const v = valor?.toString().trim().toUpperCase();
    if (v === 'G+P' || v === 'GP') return 'G+P';
    return 'GLOBALPACK';
  };

  const parseData = (valor: string): string | undefined => {
    if (!valor) return undefined;
    
    const str = valor.toString().trim();
    
    // Formato DD/MM/YYYY ou DD-MM-YYYY
    const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      const [, dia, mes, ano] = match;
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    
    // Formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    
    // Formato de número do Excel (dias desde 1900)
    const numValue = parseFloat(str);
    if (!isNaN(numValue) && numValue > 40000 && numValue < 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    return undefined;
  };

  const processarDados = useCallback((linhas: string[][]) => {
    if (!situacaoPrevisao) {
      toast.error('Situação PREVISÃO não encontrada no sistema');
      return;
    }

    // Pular linhas vazias e cabeçalho
    const dadosFiltrados = linhas.filter((linha, index) => {
      if (index === 0) {
        const primeiroValor = linha[0]?.toString().toLowerCase().trim();
        if (primeiroValor === 'nome' || primeiroValor === 'nome completo') {
          return false;
        }
      }
      return linha.some(cell => cell && cell.toString().trim() !== '');
    });

    const setorPadrao = setores.find(s => s.conta_no_quadro) || setores[0];
    
    const dadosProcessados: PrevisaoImport[] = dadosFiltrados.map((linha, index) => {
      const avisos: string[] = [];
      const errosCriticos: string[] = [];
      
      // Ordem: Nome | Sexo | Setor | Empresa | Matrícula | Data Prevista | Cargo | Turma | Observações
      const [nome, sexoStr, setorStr, empresaStr, matricula, dataAdmStr, cargo, turma, obs] = linha;
      
      // Nome (obrigatório)
      const nomeCompleto = nome?.toString().trim().toUpperCase();
      if (!nomeCompleto) {
        errosCriticos.push('Nome é obrigatório');
      }
      
      // Sexo
      let sexo = parseSexo(sexoStr || '');
      if (!sexo) {
        avisos.push('Sexo inválido → Masculino');
        sexo = 'masculino';
      }
      
      // Setor
      const setorOriginal = setorStr?.toString().trim() || '';
      const setorResult = encontrarSetor(setorOriginal);
      let setor = setorResult.setor;
      let setorNome = setor?.nome || '';
      let setorId = setor?.id || '';
      
      if (setorResult.aviso) {
        avisos.push(setorResult.aviso);
      }
      
      if (!setor && setorPadrao) {
        avisos.push(`Setor não encontrado → ${setorPadrao.nome}`);
        setorNome = setorPadrao.nome;
        setorId = setorPadrao.id;
      } else if (!setor) {
        errosCriticos.push('Setor não encontrado e sem padrão');
      }
      
      // Empresa
      const empresa = parseEmpresa(empresaStr || '');
      
      // Data de admissão
      const dataAdmissao = parseData(dataAdmStr || '');
      
      return {
        linha: index + 1,
        nome_completo: nomeCompleto || '',
        sexo,
        setor_nome: setorNome,
        setor_original: setorOriginal,
        empresa,
        matricula: matricula?.toString().trim() || undefined,
        data_admissao: dataAdmissao,
        cargo: cargo?.toString().trim() || undefined,
        turma: turma?.toString().trim() || undefined,
        observacoes: obs?.toString().trim() || undefined,
        avisos,
        errosCriticos,
        setor_id: setorId,
      };
    });
    
    setDados(dadosProcessados);
    
    const totalErros = dadosProcessados.filter(d => d.errosCriticos.length > 0).length;
    const totalAvisos = dadosProcessados.filter(d => d.avisos.length > 0).length;
    
    if (totalErros > 0) {
      toast.warning(`${dadosProcessados.length} registros. ${totalErros} com erros.`);
    } else if (totalAvisos > 0) {
      toast.success(`${dadosProcessados.length} registros. ${totalAvisos} com ajustes.`);
    } else {
      toast.success(`${dadosProcessados.length} registros carregados!`);
    }
  }, [setores, situacaoPrevisao]);

  const processarTextoColado = () => {
    if (!textoColado.trim()) {
      toast.error('Cole os dados do Excel primeiro');
      return;
    }
    
    const linhas = textoColado.trim().split('\n').map(linha => linha.split('\t'));
    processarDados(linhas);
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx-js-style');
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
        
        processarDados(jsonData);
      } catch (error: any) {
        console.error('Erro ao processar Excel:', error);
        toast.error(`Erro ao ler arquivo: ${error.message}`);
      }
    };
    
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  }, [processarDados]);

  const downloadModelo = async () => {
    const XLSX = await import('xlsx-js-style');
    // Aba principal com exemplo preenchido
    const wsModelo = XLSX.utils.aoa_to_sheet([
      COLUNAS_PREVISAO,
      ['JOÃO SILVA', 'M', setores[0]?.nome || 'NOME DO SETOR', 'GLOBALPACK', '', '01/03/2026', 'AUXILIAR DE PRODUÇÃO', 'T1', ''],
      ['MARIA SANTOS', 'F', setores[1]?.nome || 'NOME DO SETOR', 'G+P', '', '05/03/2026', 'AUXILIAR DE PRODUÇÃO', 'T2', ''],
    ]);

    // Aba de referência com setores cadastrados
    const setoresRef: string[][] = [
      ['SETORES CADASTRADOS (use exatamente como está abaixo)'],
      [''],
      ...setores.filter(s => s.ativo).map(s => [s.nome]),
    ];
    const wsSetores = XLSX.utils.aoa_to_sheet(setoresRef);

    // Aba de referência geral
    const wsRef = XLSX.utils.aoa_to_sheet([
      ['CAMPO', 'VALORES ACEITOS'],
      ['Sexo', 'M ou F'],
      ['Empresa', 'GLOBALPACK ou G+P'],
      ['Turma', 'T1, T2 (ou deixar em branco)'],
      ['Data Prevista', 'DD/MM/AAAA (ou deixar em branco)'],
      ['Matrícula', 'Número ou TEMP (ou deixar em branco)'],
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsModelo, 'Previsões');
    XLSX.utils.book_append_sheet(wb, wsSetores, 'Setores');
    XLSX.utils.book_append_sheet(wb, wsRef, 'Referência');
    XLSX.writeFile(wb, 'modelo_importacao_previsoes.xlsx');
  };

  const importarDados = async () => {
    if (!situacaoPrevisao) {
      toast.error('Situação PREVISÃO não encontrada');
      return;
    }

    const paraImportar = dados.filter(d => d.errosCriticos.length === 0 && d.setor_id);
    
    if (paraImportar.length === 0) {
      toast.error('Nenhum registro válido para importar');
      return;
    }
    
    setIsImporting(true);
    
    try {
      const registros = paraImportar.map(d => ({
        nome_completo: d.nome_completo,
        sexo: d.sexo,
        setor_id: d.setor_id,
        situacao_id: situacaoPrevisao.id, // Sempre PREVISÃO
        empresa: d.empresa || 'GLOBALPACK',
        matricula: d.matricula || null,
        data_admissao: d.data_admissao || null,
        cargo: d.cargo || null,
        turma: d.turma || null,
        observacoes: d.observacoes || null,
      }));
      
      // Importar em lotes de 500
      const BATCH_SIZE = 500;
      let importados = 0;
      
      for (let i = 0; i < registros.length; i += BATCH_SIZE) {
        const lote = registros.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('funcionarios')
          .insert(lote);
        
        if (error) throw error;
        importados += lote.length;
      }
      
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      
      toast.success(`${importados} previsões importadas com sucesso!`);
      setDados([]);
      setTextoColado('');
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast.error(`Erro ao importar: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const limparDados = () => {
    setDados([]);
    setTextoColado('');
  };

  const registrosValidos = dados.filter(d => d.errosCriticos.length === 0);
  const registrosComErro = dados.filter(d => d.errosCriticos.length > 0);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          IMPORTAR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            IMPORTAR PREVISÕES DE ADMISSÃO
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Instruções */}
          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>Ordem das Colunas</AlertTitle>
            <AlertDescription className="text-xs">
              Nome | Sexo (M/F) | Setor | Empresa | Matrícula | Data Prevista | Cargo | Turma | Observações
              <br />
              <strong>Todos serão importados com situação PREVISÃO</strong>
            </AlertDescription>
          </Alert>

          <Tabs value={importTab} onValueChange={(v) => setImportTab(v as 'colar' | 'excel')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="colar" className="gap-2">
                <ClipboardPaste className="h-4 w-4" />
                COLAR DO EXCEL
              </TabsTrigger>
              <TabsTrigger value="excel" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                ENVIAR ARQUIVO
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colar" className="space-y-3">
              <Textarea
                placeholder="Cole aqui os dados copiados do Excel (Ctrl+V)..."
                value={textoColado}
                onChange={(e) => setTextoColado(e.target.value)}
                className="min-h-[120px] font-mono text-xs"
              />
              <div className="flex gap-2">
                <Button onClick={processarTextoColado} disabled={!textoColado.trim()}>
                  PROCESSAR DADOS
                </Button>
                <Button variant="outline" onClick={downloadModelo}>
                  <Download className="h-4 w-4 mr-2" />
                  BAIXAR MODELO
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="excel" className="space-y-3">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload-previsao"
                />
                <label htmlFor="file-upload-previsao" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Clique para enviar arquivo Excel</p>
                  <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls ou .csv</p>
                </label>
              </div>
              <Button variant="outline" onClick={downloadModelo}>
                <Download className="h-4 w-4 mr-2" />
                BAIXAR MODELO
              </Button>
            </TabsContent>
          </Tabs>

          {/* Preview dos dados */}
          {dados.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {registrosValidos.length} válidos
                  </Badge>
                  {registrosComErro.length > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {registrosComErro.length} com erros
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={limparDados}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>

              <ScrollArea className="h-[250px] border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">NOME</th>
                      <th className="p-2 text-left">SETOR</th>
                      <th className="p-2 text-left">EMPRESA</th>
                      <th className="p-2 text-left">DATA PREVISTA</th>
                      <th className="p-2 text-left">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.map((item) => (
                      <tr
                        key={item.linha}
                        className={item.errosCriticos.length > 0 ? 'bg-destructive/10' : item.avisos.length > 0 ? 'bg-warning/10' : ''}
                      >
                        <td className="p-2">{item.linha}</td>
                        <td className="p-2 font-medium">{item.nome_completo}</td>
                        <td className="p-2">{item.setor_nome}</td>
                        <td className="p-2">{item.empresa}</td>
                        <td className="p-2">{item.data_admissao || '-'}</td>
                        <td className="p-2">
                          {item.errosCriticos.length > 0 ? (
                            <Badge variant="destructive" className="text-[10px]">
                              {item.errosCriticos[0]}
                            </Badge>
                          ) : item.avisos.length > 0 ? (
                            <Badge variant="outline" className="text-[10px] bg-warning/20">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {item.avisos.length} ajuste(s)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-success/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  CANCELAR
                </Button>
                <Button
                  onClick={importarDados}
                  disabled={isImporting || registrosValidos.length === 0}
                >
                  {isImporting ? 'IMPORTANDO...' : `IMPORTAR ${registrosValidos.length} PREVISÕES`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

interface ImportarFuncionariosProps {
  setores: Setor[];
  situacoes: Situacao[];
}

interface FuncionarioImport {
  linha: number;
  nome_completo: string;
  sexo: SexoTipo;
  setor_nome: string;
  setor_original: string;
  situacao_nome: string;
  situacao_original: string;
  empresa?: string;
  matricula?: string;
  data_admissao?: string;
  cargo?: string;
  turma?: string;
  data_demissao?: string;
  observacoes?: string;
  avisos: string[];
  errosCriticos: string[];
  setor_id: string;
  situacao_id: string;
}

const COLUNAS_EXEMPLO = [
  'Nome Completo',
  'Sexo (M/F)',
  'Setor',
  'Situação',
  'Empresa',
  'Matrícula',
  'Data Admissão',
  'Cargo',
  'Turma',
  'Data Demissão',
  'Observações',
];

export function ImportarFuncionarios({ setores, situacoes }: ImportarFuncionariosProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dados, setDados] = useState<FuncionarioImport[]>([]);
  const [textoColado, setTextoColado] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importTab, setImportTab] = useState<'colar' | 'excel'>('colar');

  const normalizarTexto = (texto: string): string => {
    return texto?.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
  };

  const encontrarSetor = (nome: string): { setor: Setor | undefined; aviso?: string } => {
    const nomeNorm = normalizarTexto(nome);
    
    // Match exato primeiro
    const exato = setores.find(s => normalizarTexto(s.nome) === nomeNorm);
    if (exato) return { setor: exato };
    
    // Fuzzy match para DECORAÇÃO
    if (nomeNorm.includes('decoracao')) {
      if (nomeNorm.includes('noite')) {
        const setorNoite = setores.find(s => normalizarTexto(s.nome) === 'decoracao mod noite');
        if (setorNoite) return { setor: setorNoite, aviso: `Setor "${nome}" → ${setorNoite.nome}` };
      }
      // DIA é o padrão para qualquer variação de decoração
      const setorDia = setores.find(s => normalizarTexto(s.nome) === 'decoracao mod dia');
      if (setorDia) return { setor: setorDia, aviso: nomeNorm !== 'decoracao mod dia' ? `Setor "${nome}" → ${setorDia.nome}` : undefined };
    }
    
    // Fuzzy match para SOPRO
    if (nomeNorm.includes('sopro')) {
      // Tentar encontrar pela turma (A/B/C) no nome
      const turmaMatch = nomeNorm.match(/\b([abc])\s*$/);
      if (turmaMatch) {
        const turmaLetra = turmaMatch[1].toUpperCase();
        const setorSopro = setores.find(s => {
          const sn = normalizarTexto(s.nome);
          return sn.includes('sopro') && sn.endsWith(turmaLetra.toLowerCase());
        });
        if (setorSopro) return { setor: setorSopro, aviso: `Setor "${nome}" → ${setorSopro.nome}` };
      }
    }
    
    return { setor: undefined };
  };

  const encontrarSituacao = (nome: string): Situacao | undefined => {
    const nomeNorm = normalizarTexto(nome);
    return situacoes.find(s => normalizarTexto(s.nome) === nomeNorm);
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

  const excelSerialToIsoDate = (serial: number): string | undefined => {
    if (!Number.isFinite(serial) || serial <= 0) return undefined;

    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + Math.floor(serial) * 24 * 60 * 60 * 1000);
    if (Number.isNaN(date.getTime())) return undefined;

    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  };

  const parseData = (valor: string): string | undefined => {
    if (!valor) return undefined;
    
    const str = valor.toString().trim();
    
    const match1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match1) {
      const [, parte1, parte2, anoStr] = match1;
      let ano = parseInt(anoStr);
      if (ano < 100) {
        ano = ano > 50 ? 1900 + ano : 2000 + ano;
      }
      
      let dia: number, mes: number;
      if (parseInt(parte1) > 12) {
        dia = parseInt(parte1);
        mes = parseInt(parte2);
      } else if (parseInt(parte2) > 12) {
        mes = parseInt(parte1);
        dia = parseInt(parte2);
      } else {
        mes = parseInt(parte1);
        dia = parseInt(parte2);
      }
      
      return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }
    
    const match2 = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match2) {
      return str;
    }
    
    const num = parseFloat(str);
    if (!isNaN(num) && num > 1000 && num < 100000) {
      return excelSerialToIsoDate(num);
    }
    
    return undefined;
  };

  const getSetorPadrao = (): Setor | undefined => {
    return setores.find(s => s.ativo) || setores[0];
  };

  const getSituacaoPadrao = (): Situacao | undefined => {
    return situacoes.find(s => normalizarTexto(s.nome) === 'ativo' && s.ativa) 
      || situacoes.find(s => s.ativa) 
      || situacoes[0];
  };

  const processarLinha = (colunas: string[], numeroLinha: number): FuncionarioImport | null => {
    if (!colunas[0] || colunas[0].toLowerCase().includes('nome')) return null;
    
    const avisos: string[] = [];
    const errosCriticos: string[] = [];
    
    const nome_completo = colunas[0]?.toString().trim() || '';
    if (!nome_completo) {
      errosCriticos.push('Nome é obrigatório');
    }
    
    const sexoRaw = colunas[1]?.toString().trim() || '';
    let sexo = parseSexo(sexoRaw);
    if (!sexo) {
      sexo = 'masculino';
      if (sexoRaw) {
        avisos.push(`Sexo "${sexoRaw}" → Masculino`);
      }
    }
    
    const setor_original = colunas[2]?.toString().trim() || '';
    const setorResult = encontrarSetor(setor_original);
    let setor = setorResult.setor;
    let setor_nome = setor?.nome || setor_original;
    
    if (setorResult.aviso) {
      avisos.push(setorResult.aviso);
    }
    
    if (!setor) {
      const setorPadrao = getSetorPadrao();
      if (setorPadrao) {
        setor = setorPadrao;
        setor_nome = setorPadrao.nome;
        if (setor_original) {
          avisos.push(`Setor "${setor_original}" → ${setorPadrao.nome}`);
        }
      } else {
        errosCriticos.push('Nenhum setor cadastrado');
      }
    }
    
    const situacao_original = colunas[3]?.toString().trim() || '';
    let situacao = encontrarSituacao(situacao_original);
    let situacao_nome = situacao_original;
    
    if (!situacao) {
      const situacaoPadrao = getSituacaoPadrao();
      if (situacaoPadrao) {
        situacao = situacaoPadrao;
        situacao_nome = situacaoPadrao.nome;
        if (situacao_original) {
          avisos.push(`Situação "${situacao_original}" → ${situacaoPadrao.nome}`);
        }
      } else {
        errosCriticos.push('Nenhuma situação cadastrada');
      }
    }

    const dataAdmissaoRaw = colunas[6]?.toString().trim() || '';
    let dataAdmissao = parseData(dataAdmissaoRaw);
    if (dataAdmissaoRaw && !dataAdmissao) {
      avisos.push(`Data admissão "${dataAdmissaoRaw}" ignorada`);
    }

    const dataDemissaoRaw = colunas[9]?.toString().trim() || '';
    let dataDemissao = parseData(dataDemissaoRaw);
    if (dataDemissaoRaw && !dataDemissao) {
      avisos.push(`Data demissão "${dataDemissaoRaw}" ignorada`);
    }
    
    return {
      linha: numeroLinha,
      nome_completo,
      sexo,
      setor_nome,
      setor_original,
      situacao_nome,
      situacao_original,
      empresa: parseEmpresa(colunas[4] || ''),
      matricula: colunas[5]?.toString().trim() || undefined,
      data_admissao: dataAdmissao,
      cargo: colunas[7]?.toString().trim() || undefined,
      turma: colunas[8]?.toString().trim() || undefined,
      data_demissao: dataDemissao,
      observacoes: colunas[10]?.toString().trim() || undefined,
      avisos,
      errosCriticos,
      setor_id: setor?.id || '',
      situacao_id: situacao?.id || '',
    };
  };

  const processarTextoColado = () => {
    const linhas = textoColado.split('\n').filter(l => l.trim());
    const dadosProcessados: FuncionarioImport[] = [];
    
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      const colunas = linha.includes('\t') ? linha.split('\t') : linha.split(';');
      const resultado = processarLinha(colunas, i + 1);
      if (resultado) {
        dadosProcessados.push(resultado);
      }
    }
    
    setDados(dadosProcessados);
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
        
        if (jsonData.length === 0) {
          toast.error('Planilha vazia');
          return;
        }

        if (setores.length === 0) {
          toast.error('Nenhum setor cadastrado. Configure os setores antes de importar.');
          return;
        }
        
        if (situacoes.length === 0) {
          toast.error('Nenhuma situação cadastrada. Configure as situações antes de importar.');
          return;
        }
        
        const dadosProcessados: FuncionarioImport[] = [];
        
        for (let i = 0; i < jsonData.length; i++) {
          const resultado = processarLinha(jsonData[i], i + 1);
          if (resultado) {
            dadosProcessados.push(resultado);
          }
        }
        
        if (dadosProcessados.length === 0) {
          toast.error('Nenhum registro processado');
          return;
        }
        
        const totalErrosCriticos = dadosProcessados.filter(d => d.errosCriticos.length > 0).length;
        const totalComAvisos = dadosProcessados.filter(d => d.avisos.length > 0).length;
        
        setDados(dadosProcessados);
        
        if (totalErrosCriticos > 0) {
          toast.warning(`${dadosProcessados.length} registros. ${totalErrosCriticos} com erros críticos.`);
        } else if (totalComAvisos > 0) {
          toast.success(`${dadosProcessados.length} registros. ${totalComAvisos} com ajustes automáticos.`);
        } else {
          toast.success(`${dadosProcessados.length} registros carregados!`);
        }
      } catch (error: any) {
        console.error('Erro ao processar Excel:', error);
        toast.error(`Erro ao ler arquivo: ${error.message}`);
      }
    };
    
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  }, [setores, situacoes]);

  const downloadModelo = async () => {
    const XLSX = await import('xlsx-js-style');
    const ws = XLSX.utils.aoa_to_sheet([
      ['João Silva', 'M', 'SOPRO', 'Ativo', 'GLOBALPACK', '12345', '01/01/2024', 'Auxiliar', 'T1', '', ''],
      ['Maria Santos', 'F', 'DECORAÇÃO', 'Ativo', 'G+P', 'TEMP', '15/03/2024', 'Operador', 'T2', '', 'Exemplo'],
    ]);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Funcionários');
    XLSX.writeFile(wb, 'modelo_importacao_funcionarios.xlsx');
  };

  const exportarConfirmacao = async (registros: FuncionarioImport[]) => {
    const XLSX = await import('xlsx-js-style');
    const dadosExport = registros.map(item => ({
      'Nome': item.nome_completo,
      'Sexo': item.sexo === 'masculino' ? 'M' : 'F',
      'Setor Original': item.setor_original || '(vazio)',
      'Setor Usado': item.setor_nome,
      'Situação Original': item.situacao_original || '(vazio)',
      'Situação Usada': item.situacao_nome,
      'Empresa': item.empresa || '',
      'Matrícula': item.matricula || '',
      'Admissão': item.data_admissao || '',
      'Cargo': item.cargo || '',
      'Turma': item.turma || '',
      'Status': item.avisos.length > 0 ? 'AJUSTADO' : 'OK',
      'Ajustes': item.avisos.join(' | ') || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Importados');
    
    const dataHora = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
    XLSX.writeFile(wb, `Confirmacao_Importacao_${dataHora}.xlsx`);
  };

  const importarDados = async () => {
    const paraImportar = dados.filter(d => d.errosCriticos.length === 0 && d.setor_id && d.situacao_id);
    
    if (paraImportar.length === 0) {
      toast.error('Nenhum registro válido para importar');
      return;
    }
    
    setIsImporting(true);
    
    const registrosComAvisos = paraImportar.filter(d => d.avisos.length > 0);
    
    try {
      const registros = paraImportar.map(d => ({
        nome_completo: d.nome_completo,
        sexo: d.sexo,
        setor_id: d.setor_id,
        situacao_id: d.situacao_id,
        empresa: d.empresa || 'GLOBALPACK',
        matricula: d.matricula || null,
        data_admissao: d.data_admissao || null,
        cargo: d.cargo || null,
        turma: d.turma || null,
        data_demissao: d.data_demissao || null,
        observacoes: d.observacoes || null,
      }));
      
      // Importar em lotes de 500 para evitar limites do Supabase
      const BATCH_SIZE = 500;
      let importados = 0;
      
      for (let i = 0; i < registros.length; i += BATCH_SIZE) {
        const lote = registros.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('funcionarios')
          .insert(lote);
        
        if (error) throw error;
        importados += lote.length;
        
        // Mostrar progresso se houver muitos registros
        if (registros.length > BATCH_SIZE) {
          toast.info(`Importando... ${importados}/${registros.length}`);
        }
      }
      
      // Sempre gera planilha de confirmação com todos os registros
      exportarConfirmacao(paraImportar);
      
      if (registrosComAvisos.length > 0) {
        toast.success(`${paraImportar.length} importados! ${registrosComAvisos.length} com ajustes. Planilha gerada.`);
      } else {
        toast.success(`${paraImportar.length} funcionários importados! Planilha de confirmação gerada.`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      setDialogOpen(false);
      setDados([]);
      setTextoColado('');
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast.error(`Erro ao importar: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const totalImportaveis = dados.filter(d => d.errosCriticos.length === 0 && d.setor_id && d.situacao_id).length;
  const totalErrosCriticos = dados.filter(d => d.errosCriticos.length > 0).length;
  const totalComAvisos = dados.filter(d => d.avisos.length > 0 && d.errosCriticos.length === 0).length;
  const dadosComErroCritico = dados.filter(d => d.errosCriticos.length > 0);

  const exportarErrosCriticos = async () => {
    if (dadosComErroCritico.length === 0) {
      toast.info('Nenhum erro crítico');
      return;
    }

    const XLSX = await import('xlsx-js-style');
    const dadosExport = dadosComErroCritico.map(item => ({
      'Linha': item.linha,
      'Nome': item.nome_completo || '(vazio)',
      'Setor Informado': item.setor_original,
      'Situação Informada': item.situacao_original,
      'Erros': item.errosCriticos.join(' | '),
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Erros Críticos');
    
    const dataHora = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
    XLSX.writeFile(wb, `Erros_Criticos_${dataHora}.xlsx`);
    toast.success(`${dadosComErroCritico.length} erros exportados`);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Funcionários
          </DialogTitle>
        </DialogHeader>

        <Tabs value={importTab} onValueChange={(v) => setImportTab(v as 'colar' | 'excel')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="colar" className="flex items-center gap-2">
              <ClipboardPaste className="h-4 w-4" />
              Copiar e Colar
            </TabsTrigger>
            <TabsTrigger value="excel" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Arquivo Excel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colar" className="flex-1 flex flex-col space-y-4 min-h-0 mt-4">
            <Alert className="shrink-0">
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>Como copiar do Excel</AlertTitle>
              <AlertDescription className="text-sm">
                <ol className="list-decimal ml-4 mt-2 space-y-1">
                  <li>Selecione as células no Excel (sem o cabeçalho)</li>
                  <li>Copie (Ctrl+C)</li>
                  <li>Cole no campo abaixo (Ctrl+V)</li>
                  <li>Clique em "Processar Dados"</li>
                </ol>
                <div className="mt-3 p-2 bg-muted rounded text-xs font-mono">
                  <strong>Ordem:</strong> Nome | Sexo | Setor | Situação | Empresa | Matrícula | Admissão | Cargo | Turma | Demissão | Obs
                </div>
              </AlertDescription>
            </Alert>

            <Textarea
              placeholder="Cole os dados aqui..."
              value={textoColado}
              onChange={(e) => setTextoColado(e.target.value)}
              className="flex-1 min-h-[120px] font-mono text-sm resize-none"
            />

            <Button onClick={processarTextoColado} disabled={!textoColado.trim()} className="shrink-0">
              Processar Dados
            </Button>
          </TabsContent>

          <TabsContent value="excel" className="flex-1 flex flex-col space-y-4 min-h-0 mt-4">
            <Alert className="shrink-0">
              <FileSpreadsheet className="h-4 w-4" />
              <AlertTitle>Importação via Excel</AlertTitle>
              <AlertDescription>
                <p className="mt-2">Baixe o modelo e preencha com os dados.</p>
                <Button variant="link" className="h-auto p-0 mt-2" onClick={downloadModelo}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar modelo Excel
                </Button>
              </AlertDescription>
            </Alert>

            <div className="flex-1 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Clique para selecionar arquivo</p>
                <p className="text-sm text-muted-foreground">Aceita .xlsx ou .xls</p>
              </label>
            </div>
          </TabsContent>
        </Tabs>

        {dados.length > 0 && (
          <div className="border-t pt-4 flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between shrink-0 mb-4">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold">Pré-visualização</h3>
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  {totalImportaveis} prontos
                </Badge>
                {totalComAvisos > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    {totalComAvisos} com ajustes
                  </Badge>
                )}
                {totalErrosCriticos > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {totalErrosCriticos} com erros
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {totalErrosCriticos > 0 && (
                  <Button variant="outline" size="sm" onClick={exportarErrosCriticos} className="gap-1 text-destructive hover:text-destructive">
                    <Download className="h-4 w-4" />
                    Exportar Erros
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setDados([])}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 border rounded-lg min-h-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted z-10">
                  <tr>
                    <th className="text-left p-2 border-b w-12">Linha</th>
                    <th className="text-left p-2 border-b w-12">Status</th>
                    <th className="text-left p-2 border-b">Nome</th>
                    <th className="text-left p-2 border-b">Setor</th>
                    <th className="text-left p-2 border-b">Situação</th>
                    <th className="text-left p-2 border-b">Empresa</th>
                    <th className="text-left p-2 border-b min-w-[200px]">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((item, index) => {
                    const temErroCritico = item.errosCriticos.length > 0;
                    const temAviso = item.avisos.length > 0;
                    
                    return (
                      <tr 
                        key={index} 
                        className={temErroCritico ? 'bg-destructive/10' : temAviso ? 'bg-amber-50' : ''}
                      >
                        <td className="p-2 border-b text-muted-foreground text-center">{item.linha}</td>
                        <td className="p-2 border-b">
                          {temErroCritico ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : temAviso ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </td>
                        <td className="p-2 border-b font-medium">
                          {item.nome_completo || <span className="text-muted-foreground italic">Sem nome</span>}
                        </td>
                        <td className="p-2 border-b">{item.setor_nome || '-'}</td>
                        <td className="p-2 border-b">{item.situacao_nome || '-'}</td>
                        <td className="p-2 border-b">{item.empresa || '-'}</td>
                        <td className="p-2 border-b">
                          {temErroCritico ? (
                            <div className="space-y-1">
                              {item.errosCriticos.map((erro, i) => (
                                <div key={i} className="text-destructive text-xs">• {erro}</div>
                              ))}
                            </div>
                          ) : temAviso ? (
                            <div className="space-y-1">
                              {item.avisos.map((aviso, i) => (
                                <div key={i} className="text-amber-600 text-xs">• {aviso}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-green-600 text-xs">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>

            <div className="flex justify-end gap-3 pt-4 shrink-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={importarDados} 
                disabled={totalImportaveis === 0 || isImporting}
              >
                {isImporting ? 'Importando...' : `Importar ${totalImportaveis} funcionários`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

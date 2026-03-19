import { useState } from 'react';
import { GitCompare, FileSpreadsheet, ClipboardPaste, Download, HelpCircle, CheckCircle2, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface RegistroPlanilha {
  linha: number;
  nome: string;
  sexo: string;
  matricula: string;
  setor: string;
  situacao: string;
  empresa: string;
  turma: string;
  cargo: string;
  dataAdmissao: string;
  raw: string[];
}

type CampoComparavel = 'nome' | 'sexo' | 'setor' | 'situacao' | 'empresa' | 'turma' | 'cargo' | 'dataAdmissao';

const CAMPOS_DISPONIVEIS: { key: CampoComparavel; label: string }[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'sexo', label: 'Sexo' },
  { key: 'setor', label: 'Setor' },
  { key: 'situacao', label: 'Situação' },
  { key: 'empresa', label: 'Empresa' },
  { key: 'turma', label: 'Turma' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'dataAdmissao', label: 'Data Admissão' },
];

const CAMPO_TO_DB: Record<CampoComparavel, string> = {
  nome: 'nome_completo',
  sexo: 'sexo',
  setor: 'setor_id',
  situacao: 'situacao_id',
  empresa: 'empresa',
  turma: 'turma',
  cargo: 'cargo',
  dataAdmissao: 'data_admissao',
};

interface DiferencaCampo {
  chave: string;
  nome: string;
  matricula: string;
  valorSistema: string;
  valorApdata: string;
}

interface RegistroCorreto {
  chave: string;
  nome: string;
  matricula: string;
  valor: string;
}

interface ResultadoComparacao {
  camposDiferentes: Record<CampoComparavel, DiferencaCampo[]>;
  camposCorretos: Record<CampoComparavel, RegistroCorreto[]>;
  apenasNoSistema: RegistroPlanilha[];
  apenasNaApdata: RegistroPlanilha[];
}

export default function CompararPlanilhas() {
  const [textoPlanilha1, setTextoPlanilha1] = useState('');
  const [textoPlanilha2, setTextoPlanilha2] = useState('');
  const [dadosPlanilha1, setDadosPlanilha1] = useState<RegistroPlanilha[]>([]);
  const [dadosPlanilha2, setDadosPlanilha2] = useState<RegistroPlanilha[]>([]);
  const [resultado, setResultado] = useState<ResultadoComparacao | null>(null);
  const [comparacaoRealizada, setComparacaoRealizada] = useState(false);
  const [modoEntrada, setModoEntrada] = useState<'colar' | 'excel'>('excel');
  const [camposSelecionados, setCamposSelecionados] = useState<CampoComparavel[]>([
    'nome', 'setor', 'empresa', 'turma',
  ]);
  const [abaResultado, setAbaResultado] = useState('resumo');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aplicando, setAplicando] = useState(false);
  const [filtroResultado, setFiltroResultado] = useState<'diferentes' | 'corretos'>('diferentes');

  const normalizarTexto = (texto: string): string => {
    return texto?.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
  };

  // Normaliza para comparação: remove espaços extras, acentos e padroniza caixa
  const normalizarParaComparacao = (texto: string): string => {
    let val = texto?.toString().trim().replace(/\s+/g, ' ') || '';
    // Ignora apenas maiúscula/minúscula, mas MANTÉM acentos como diferença
    val = val.toUpperCase();
    return val;
  };

  const processarLinhas = (linhas: string[][]): RegistroPlanilha[] => {
    const registros: RegistroPlanilha[] = [];
    for (let i = 0; i < linhas.length; i++) {
      const cols = linhas[i];
      const nome = cols[0]?.toString().trim() || '';
      if (!nome || nome.toLowerCase().includes('nome')) continue;
      registros.push({
        linha: i + 1,
        nome,
        sexo: cols[1]?.toString().trim() || '',
        setor: cols[2]?.toString().trim() || '',
        situacao: cols[3]?.toString().trim() || '',
        empresa: cols[4]?.toString().trim() || '',
        matricula: cols[5]?.toString().trim() || '',
        dataAdmissao: cols[6]?.toString().trim() || '',
        cargo: cols[7]?.toString().trim() || '',
        turma: cols[8]?.toString().trim() || '',
        raw: cols.map(c => c?.toString() || ''),
      });
    }
    return registros;
  };

  const processarTexto = (texto: string): RegistroPlanilha[] => {
    const linhas = texto.split('\n').filter(l => l.trim());
    const dados = linhas.map(linha => linha.includes('\t') ? linha.split('\t') : linha.split(';'));
    return processarLinhas(dados);
  };

  const handleFileUpload = (planilhaNum: 1 | 2) => (event: React.ChangeEvent<HTMLInputElement>) => {
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
        const registros = processarLinhas(jsonData);
        if (planilhaNum === 1) {
          setDadosPlanilha1(registros);
          toast.success(`Sistema: ${registros.length} registros carregados`);
        } else {
          setDadosPlanilha2(registros);
          toast.success(`APDATA: ${registros.length} registros carregados`);
        }
        setComparacaoRealizada(false);
        setResultado(null);
        setSelecionados(new Set());
      } catch (error: any) {
        toast.error(`Erro ao ler arquivo: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const processarTextoColado = () => {
    const dados1 = processarTexto(textoPlanilha1);
    const dados2 = processarTexto(textoPlanilha2);
    setDadosPlanilha1(dados1);
    setDadosPlanilha2(dados2);
    if (dados1.length === 0 && dados2.length === 0) {
      toast.error('Cole os dados das duas planilhas');
      return;
    }
    toast.success(`Sistema: ${dados1.length} | APDATA: ${dados2.length} registros`);
    setComparacaoRealizada(false);
    setResultado(null);
    setSelecionados(new Set());
  };

  const gerarChaveRegistro = (reg: RegistroPlanilha): string => {
    if (reg.matricula) return normalizarTexto(reg.matricula);
    return normalizarTexto(reg.nome);
  };

  const toggleCampo = (campo: CampoComparavel) => {
    setCamposSelecionados(prev =>
      prev.includes(campo) ? prev.filter(c => c !== campo) : [...prev, campo]
    );
  };

  const realizarComparacao = () => {
    if (dadosPlanilha1.length === 0 || dadosPlanilha2.length === 0) {
      toast.error('Carregue as duas planilhas primeiro');
      return;
    }
    if (camposSelecionados.length === 0) {
      toast.error('Selecione ao menos um campo para comparar');
      return;
    }

    const mapa1 = new Map<string, RegistroPlanilha>();
    const mapa2 = new Map<string, RegistroPlanilha>();
    dadosPlanilha1.forEach(reg => mapa1.set(gerarChaveRegistro(reg), reg));
    dadosPlanilha2.forEach(reg => mapa2.set(gerarChaveRegistro(reg), reg));

    const camposDiferentes: Record<CampoComparavel, DiferencaCampo[]> = {
      nome: [], sexo: [], setor: [], situacao: [], empresa: [], turma: [], cargo: [], dataAdmissao: [],
    };
    const camposCorretos: Record<CampoComparavel, RegistroCorreto[]> = {
      nome: [], sexo: [], setor: [], situacao: [], empresa: [], turma: [], cargo: [], dataAdmissao: [],
    };
    const apenasNoSistema: RegistroPlanilha[] = [];
    const apenasNaApdata: RegistroPlanilha[] = [];

    mapa1.forEach((reg1, chave) => {
      const reg2 = mapa2.get(chave);
      if (!reg2) {
        apenasNoSistema.push(reg1);
      } else {
        camposSelecionados.forEach(campo => {
          const val1 = normalizarParaComparacao(reg1[campo] || '');
          const val2 = normalizarParaComparacao(reg2[campo] || '');
          if (val1 !== val2) {
            camposDiferentes[campo].push({
              chave,
              nome: reg1.nome || reg2.nome,
              matricula: reg1.matricula || reg2.matricula,
              valorSistema: val1,
              valorApdata: val2,
            });
          } else {
            camposCorretos[campo].push({
              chave,
              nome: reg1.nome || reg2.nome,
              matricula: reg1.matricula || reg2.matricula,
              valor: val1,
            });
          }
        });
      }
    });

    mapa2.forEach((_, chave) => {
      if (!mapa1.has(chave)) {
        apenasNaApdata.push(mapa2.get(chave)!);
      }
    });

    setResultado({ camposDiferentes, camposCorretos, apenasNoSistema, apenasNaApdata });
    setComparacaoRealizada(true);
    setAbaResultado('resumo');
    setSelecionados(new Set());

    const totalDif = camposSelecionados.reduce((acc, c) => acc + camposDiferentes[c].length, 0);
    const totalExclusivos = apenasNoSistema.length + apenasNaApdata.length;
    if (totalDif === 0 && totalExclusivos === 0) {
      toast.success('Planilhas idênticas! Nenhuma diferença encontrada.');
    } else {
      toast.info(`${totalDif} diferença(s) em campos + ${totalExclusivos} exclusivo(s)`);
    }
  };

  const getSelectionKey = (campo: CampoComparavel, chave: string) => `${campo}:${chave}`;

  const toggleSelecao = (campo: CampoComparavel, chave: string) => {
    const key = getSelectionKey(campo, chave);
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selecionarTodosCampo = (campo: CampoComparavel) => {
    if (!resultado) return;
    const difs = resultado.camposDiferentes[campo];
    const keys = difs.map(d => getSelectionKey(campo, d.chave));
    const todosJaSelecionados = keys.every(k => selecionados.has(k));
    setSelecionados(prev => {
      const next = new Set(prev);
      if (todosJaSelecionados) {
        keys.forEach(k => next.delete(k));
      } else {
        keys.forEach(k => next.add(k));
      }
      return next;
    });
  };

  const contarSelecionadosCampo = (campo: CampoComparavel): number => {
    if (!resultado) return 0;
    return resultado.camposDiferentes[campo].filter(d => selecionados.has(getSelectionKey(campo, d.chave))).length;
  };

  const totalSelecionados = selecionados.size;

  const aplicarSelecionados = async () => {
    if (totalSelecionados === 0 || !resultado) {
      toast.error('Selecione ao menos uma diferença para aplicar');
      return;
    }

    setAplicando(true);
    let sucesso = 0;
    let erros = 0;

    try {
      const [setoresRes, situacoesRes] = await Promise.all([
        supabase.from('setores').select('id, nome'),
        supabase.from('situacoes').select('id, nome'),
      ]);
      const setores = setoresRes.data || [];
      const situacoes = situacoesRes.data || [];

      const findSetorId = (nomeSetor: string) => {
        const norm = normalizarTexto(nomeSetor);
        return setores.find(s => normalizarTexto(s.nome) === norm)?.id;
      };
      const findSituacaoId = (nomeSit: string) => {
        const norm = normalizarTexto(nomeSit);
        return situacoes.find(s => normalizarTexto(s.nome) === norm)?.id;
      };

      const updatesByChave = new Map<string, { matricula: string; nome: string; updates: Record<string, any> }>();

      for (const selKey of selecionados) {
        const [campo, chave] = selKey.split(':') as [CampoComparavel, string];
        const dif = resultado.camposDiferentes[campo]?.find(d => d.chave === chave);
        if (!dif) continue;

        if (!updatesByChave.has(chave)) {
          updatesByChave.set(chave, { matricula: dif.matricula, nome: dif.nome, updates: {} });
        }
        const entry = updatesByChave.get(chave)!;

        const dbCol = CAMPO_TO_DB[campo];
        let valor: any = dif.valorApdata;

        if (campo === 'setor') {
          const id = findSetorId(dif.valorApdata);
          if (!id) {
            toast.error(`Setor "${dif.valorApdata}" não encontrado para ${dif.nome}`);
            erros++;
            continue;
          }
          valor = id;
        } else if (campo === 'situacao') {
          const id = findSituacaoId(dif.valorApdata);
          if (!id) {
            toast.error(`Situação "${dif.valorApdata}" não encontrada para ${dif.nome}`);
            erros++;
            continue;
          }
          valor = id;
        } else if (campo === 'sexo') {
          const sexoNorm = normalizarTexto(dif.valorApdata);
          valor = sexoNorm.startsWith('f') ? 'feminino' : 'masculino';
        }

        entry.updates[dbCol] = valor;
      }

      for (const [chave, { matricula, nome, updates }] of updatesByChave) {
        if (Object.keys(updates).length === 0) continue;

        let query = supabase.from('funcionarios').update(updates);
        if (matricula) {
          query = query.eq('matricula', matricula);
        } else {
          query = query.ilike('nome_completo', nome);
        }

        const { error } = await query;
        if (error) {
          console.error(`Erro ao atualizar ${nome}:`, error);
          erros++;
        } else {
          sucesso++;
        }
      }

      if (sucesso > 0) {
        toast.success(`${sucesso} funcionário(s) atualizado(s) com sucesso!`);
        setSelecionados(new Set());
      }
      if (erros > 0) {
        toast.error(`${erros} erro(s) ao aplicar alterações`);
      }
    } catch (err: any) {
      toast.error(`Erro geral: ${err.message}`);
    } finally {
      setAplicando(false);
    }
  };

  const exportarDiferencas = async () => {
    if (!resultado) return;
    const XLSX = await import('xlsx-js-style');
    const wb = XLSX.utils.book_new();

    const resumoData: any[] = [];
    camposSelecionados.forEach(campo => {
      const label = CAMPOS_DISPONIVEIS.find(c => c.key === campo)?.label || campo;
      resultado.camposDiferentes[campo].forEach(dif => {
        resumoData.push({
          'Campo': label,
          'Nome': dif.nome,
          'Matrícula': dif.matricula,
          'Valor Sistema': dif.valorSistema || '(vazio)',
          'Valor APDATA': dif.valorApdata || '(vazio)',
        });
      });
    });
    if (resumoData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumoData), 'Resumo');
    }

    camposSelecionados.forEach(campo => {
      const difs = resultado.camposDiferentes[campo];
      if (difs.length === 0) return;
      const label = CAMPOS_DISPONIVEIS.find(c => c.key === campo)?.label || campo;
      const data = difs.map(d => ({
        'Nome': d.nome,
        'Matrícula': d.matricula,
        [`${label} Sistema`]: d.valorSistema || '(vazio)',
        [`${label} APDATA`]: d.valorApdata || '(vazio)',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), label);
    });

    if (resultado.apenasNoSistema.length > 0) {
      const data = resultado.apenasNoSistema.map(r => ({
        'Nome': r.nome, 'Matrícula': r.matricula, 'Setor': r.setor,
        'Empresa': r.empresa, 'Turma': r.turma, 'Situação': r.situacao,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Só no Sistema');
    }

    if (resultado.apenasNaApdata.length > 0) {
      const data = resultado.apenasNaApdata.map(r => ({
        'Nome': r.nome, 'Matrícula': r.matricula, 'Setor': r.setor,
        'Empresa': r.empresa, 'Turma': r.turma, 'Situação': r.situacao,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Só na APDATA');
    }

    const nomeArquivo = `Comparacao_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
    toast.success(`Exportado com ${wb.SheetNames.length} abas!`);
  };

  const baixarModelo = async () => {
    const XLSX = await import('xlsx-js-style');
    const wb = XLSX.utils.book_new();
    const headers = [['Nome', 'Sexo', 'Setor', 'Situação', 'Empresa', 'Matrícula', 'Data Admissão', 'Cargo', 'Turma']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = [
      { wch: 30 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'Modelo_Comparacao.xlsx');
    toast.success('Modelo baixado!');
  };

  const limparTudo = () => {
    setTextoPlanilha1('');
    setTextoPlanilha2('');
    setDadosPlanilha1([]);
    setDadosPlanilha2([]);
    setResultado(null);
    setComparacaoRealizada(false);
    setSelecionados(new Set());
  };

  const totalDiferencasCampos = resultado
    ? camposSelecionados.reduce((acc, c) => acc + resultado.camposDiferentes[c].length, 0)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <GitCompare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold uppercase">Comparar Planilhas</h1>
            <p className="text-sm text-muted-foreground">Sistema × APDATA — Identifique e corrija divergências</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={baixarModelo} variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            MODELO
          </Button>
          {comparacaoRealizada && resultado && totalDiferencasCampos > 0 && (
            <Button onClick={exportarDiferencas} variant="outline" size="sm" className="gap-1">
              <Download className="h-4 w-4" />
              EXPORTAR
            </Button>
          )}
          {(dadosPlanilha1.length > 0 || dadosPlanilha2.length > 0) && (
            <Button onClick={limparTudo} variant="ghost" size="sm" className="gap-1 text-destructive">
              <Trash2 className="h-4 w-4" />
              LIMPAR
            </Button>
          )}
        </div>
      </div>

      {/* Etapa 1: Carregar dados */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">1</span>
              Carregar Planilhas
            </h2>
            <Tabs value={modoEntrada} onValueChange={(v) => setModoEntrada(v as 'colar' | 'excel')}>
              <TabsList className="h-8">
                <TabsTrigger value="excel" className="text-xs h-6 px-2 gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  Excel
                </TabsTrigger>
                <TabsTrigger value="colar" className="text-xs h-6 px-2 gap-1">
                  <ClipboardPaste className="h-3 w-3" />
                  Colar
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {modoEntrada === 'excel' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase">Sistema</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload(1)} className="hidden" id="file-sistema" />
                  <label htmlFor="file-sistema" className="cursor-pointer">
                    <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Clique para selecionar</p>
                  </label>
                </div>
                {dadosPlanilha1.length > 0 && (
                  <Badge variant="secondary" className="w-full justify-center">
                    <CheckCircle2 className="h-3 w-3 mr-1" />{dadosPlanilha1.length} registros
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase">APDATA</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload(2)} className="hidden" id="file-apdata" />
                  <label htmlFor="file-apdata" className="cursor-pointer">
                    <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Clique para selecionar</p>
                  </label>
                </div>
                {dadosPlanilha2.length > 0 && (
                  <Badge variant="secondary" className="w-full justify-center">
                    <CheckCircle2 className="h-3 w-3 mr-1" />{dadosPlanilha2.length} registros
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Alert className="py-2">
                <HelpCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Cole os dados (mesma ordem de colunas: Nome | Sexo | Setor | Situação | Empresa | Matrícula...)
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="font-semibold text-xs uppercase">Sistema</Label>
                  <Textarea
                    placeholder="Cole os dados do Sistema..."
                    value={textoPlanilha1}
                    onChange={(e) => setTextoPlanilha1(e.target.value)}
                    className="min-h-[100px] font-mono text-xs resize-none"
                  />
                  {dadosPlanilha1.length > 0 && <Badge variant="secondary">{dadosPlanilha1.length} registros</Badge>}
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="font-semibold text-xs uppercase">APDATA</Label>
                  <Textarea
                    placeholder="Cole os dados da APDATA..."
                    value={textoPlanilha2}
                    onChange={(e) => setTextoPlanilha2(e.target.value)}
                    className="min-h-[100px] font-mono text-xs resize-none"
                  />
                  {dadosPlanilha2.length > 0 && <Badge variant="secondary">{dadosPlanilha2.length} registros</Badge>}
                </div>
              </div>
              <Button onClick={processarTextoColado} variant="secondary" size="sm">
                Processar Dados Colados
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Etapa 2: Selecionar campos e comparar */}
      {(dadosPlanilha1.length > 0 || dadosPlanilha2.length > 0) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">2</span>
              Selecionar Campos e Comparar
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {CAMPOS_DISPONIVEIS.map(campo => (
                <div key={campo.key} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`campo-${campo.key}`}
                    checked={camposSelecionados.includes(campo.key)}
                    onCheckedChange={() => toggleCampo(campo.key)}
                  />
                  <label htmlFor={`campo-${campo.key}`} className="text-sm cursor-pointer">{campo.label}</label>
                </div>
              ))}
            </div>
            <Button
              onClick={realizarComparacao}
              disabled={dadosPlanilha1.length === 0 || dadosPlanilha2.length === 0 || camposSelecionados.length === 0}
              className="gap-1"
            >
              <GitCompare className="h-4 w-4" />
              COMPARAR
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Etapa 3: Resultados com abas */}
      {comparacaoRealizada && resultado && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">3</span>
                Resultados — Selecione e Atualize
              </h2>
              {totalSelecionados > 0 && (
                <Button
                  onClick={aplicarSelecionados}
                  disabled={aplicando}
                  className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <RefreshCw className={`h-4 w-4 ${aplicando ? 'animate-spin' : ''}`} />
                  ATUALIZAR SISTEMA ({totalSelecionados})
                </Button>
              )}
            </div>

            <Tabs value={abaResultado} onValueChange={setAbaResultado}>
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="resumo" className="text-xs">
                  Resumo
                </TabsTrigger>
                {camposSelecionados.map(campo => {
                  const countDif = resultado.camposDiferentes[campo].length;
                  const countOk = resultado.camposCorretos[campo].length;
                  const selCount = contarSelecionadosCampo(campo);
                  const label = CAMPOS_DISPONIVEIS.find(c => c.key === campo)?.label || campo;
                  return (
                    <TabsTrigger key={campo} value={campo} className="text-xs gap-1">
                      {label}
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {selCount > 0 ? `${selCount}/` : ''}{countDif}/{countDif + countOk}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
                <TabsTrigger value="so-sistema" className="text-xs gap-1">
                  Só Sistema
                  {resultado.apenasNoSistema.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1">{resultado.apenasNoSistema.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="so-apdata" className="text-xs gap-1">
                  Só APDATA
                  {resultado.apenasNaApdata.length > 0 && (
                    <Badge className="bg-blue-500 text-white text-[10px] h-4 px-1">{resultado.apenasNaApdata.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Aba Resumo */}
              <TabsContent value="resumo" className="mt-3">
                <div className="flex items-center gap-4 flex-wrap">
                  {camposSelecionados.map(campo => {
                    const count = resultado.camposDiferentes[campo].length;
                    const label = CAMPOS_DISPONIVEIS.find(c => c.key === campo)?.label || campo;
                    return (
                      <div key={campo} className="flex items-center gap-1">
                        <Badge variant={count > 0 ? 'default' : 'secondary'} className={count > 0 ? 'bg-amber-500 text-white' : ''}>{count}</Badge>
                        <span className="text-sm">{label}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-1">
                    <Badge variant="destructive">{resultado.apenasNoSistema.length}</Badge>
                    <span className="text-sm">Só Sistema</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className="bg-blue-500 text-white">{resultado.apenasNaApdata.length}</Badge>
                    <span className="text-sm">Só APDATA</span>
                  </div>
                </div>
                {totalDiferencasCampos === 0 && resultado.apenasNoSistema.length === 0 && resultado.apenasNaApdata.length === 0 && (
                  <div className="flex items-center justify-center py-8 text-green-600">
                    <CheckCircle2 className="h-6 w-6 mr-2" />
                    <span className="font-medium">Planilhas idênticas!</span>
                  </div>
                )}
              </TabsContent>

              {/* Abas por campo */}
              {camposSelecionados.map(campo => {
                const difs = resultado.camposDiferentes[campo];
                const corretos = resultado.camposCorretos[campo];
                const label = CAMPOS_DISPONIVEIS.find(c => c.key === campo)?.label || campo;
                const allSelected = difs.length > 0 && difs.every(d => selecionados.has(getSelectionKey(campo, d.chave)));
                const selCount = contarSelecionadosCampo(campo);
                return (
                  <TabsContent key={campo} value={campo} className="mt-3 space-y-3">
                    {/* Filtro Diferentes / Corretos */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant={filtroResultado === 'diferentes' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFiltroResultado('diferentes')}
                        className="gap-1"
                      >
                        <span className="text-xs">❌</span>
                        Diferentes ({difs.length})
                      </Button>
                      <Button
                        variant={filtroResultado === 'corretos' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFiltroResultado('corretos')}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Corretos ({corretos.length})
                      </Button>
                    </div>

                    {filtroResultado === 'diferentes' ? (
                      difs.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-green-600">
                          <CheckCircle2 className="h-6 w-6 mr-2" />
                          <span className="font-medium">Sem diferenças em {label}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => selecionarTodosCampo(campo)}>
                              {allSelected ? 'Desmarcar todos' : `Selecionar todos (${difs.length})`}
                            </Button>
                            {selCount > 0 && (
                              <span className="text-sm text-muted-foreground">{selCount} selecionado(s)</span>
                            )}
                          </div>
                          <div className="h-[400px] border rounded-md overflow-hidden">
                          <ScrollArea className="h-full">
                            <table className="w-full text-sm">
                              <thead className="bg-muted sticky top-0 z-10">
                                <tr>
                                  <th className="p-2 w-10">
                                    <Checkbox checked={allSelected} onCheckedChange={() => selecionarTodosCampo(campo)} />
                                  </th>
                                  <th className="p-2 text-left">Nome</th>
                                  <th className="p-2 text-left">Matrícula</th>
                                  <th className="p-2 text-left">Setor</th>
                                  <th className="p-2 text-left text-red-500">Sistema (atual)</th>
                                  <th className="p-2 text-center w-10">→</th>
                                  <th className="p-2 text-left text-green-600">APDATA (correto)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {difs.map((dif, idx) => {
                                  const isSelected = selecionados.has(getSelectionKey(campo, dif.chave));
                                  return (
                                    <tr key={idx} className={`border-t hover:bg-muted/50 cursor-pointer ${isSelected ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                                      onClick={() => toggleSelecao(campo, dif.chave)}
                                    >
                                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelecao(campo, dif.chave)} />
                                      </td>
                                      <td className="p-2 font-medium">{dif.nome}</td>
                                      <td className="p-2 text-muted-foreground">{dif.matricula || '-'}</td>
                                      <td className="p-2 text-muted-foreground text-xs">
                                        {(() => {
                                          const mapa2Map = new Map<string, RegistroPlanilha>();
                                          dadosPlanilha2.forEach(r => mapa2Map.set(gerarChaveRegistro(r), r));
                                          const reg = mapa2Map.get(dif.chave);
                                          return reg?.setor || '-';
                                        })()}
                                      </td>
                                      <td className="p-2">
                                        <span className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded text-xs font-medium">
                                          {dif.valorSistema || '(vazio)'}
                                        </span>
                                      </td>
                                      <td className="p-2 text-center text-muted-foreground font-bold">→</td>
                                      <td className="p-2">
                                        <span className="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs font-medium">
                                          {dif.valorApdata || '(vazio)'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </ScrollArea>
                          </div>
                        </div>
                      )
                    ) : (
                      corretos.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <span className="font-medium">Nenhum registro correto em {label}</span>
                        </div>
                      ) : (
                        <div className="h-[400px] border rounded-md overflow-hidden">
                        <ScrollArea className="h-full">
                          <table className="w-full text-sm">
                            <thead className="bg-muted sticky top-0 z-10">
                              <tr>
                                <th className="p-2 text-left">Nome</th>
                                <th className="p-2 text-left">Matrícula</th>
                                <th className="p-2 text-left">{label} (igual)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {corretos.map((reg, idx) => (
                                <tr key={idx} className="border-t hover:bg-muted/50">
                                  <td className="p-2 font-medium">{reg.nome}</td>
                                  <td className="p-2 text-muted-foreground">{reg.matricula || '-'}</td>
                                  <td className="p-2">
                                    <span className="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs font-medium">
                                      {reg.valor || '(vazio)'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollArea>
                        </div>
                      )
                    )}
                  </TabsContent>
                );
              })}

              {/* Aba Só no Sistema */}
              <TabsContent value="so-sistema" className="mt-3">
                {resultado.apenasNoSistema.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-green-600">
                    <CheckCircle2 className="h-6 w-6 mr-2" />
                    <span className="font-medium">Todos do Sistema estão na APDATA</span>
                  </div>
                ) : (
                  <div className="h-[400px] border rounded-md overflow-hidden">
                  <ScrollArea className="h-full">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          <th className="p-2 text-left">Nome</th>
                          <th className="p-2 text-left">Matrícula</th>
                          <th className="p-2 text-left">Setor</th>
                          <th className="p-2 text-left">Empresa</th>
                          <th className="p-2 text-left">Turma</th>
                          <th className="p-2 text-left">Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.apenasNoSistema.map((reg, idx) => (
                          <tr key={idx} className="border-t hover:bg-muted/50">
                            <td className="p-2 font-medium">{reg.nome}</td>
                            <td className="p-2 text-muted-foreground">{reg.matricula || '-'}</td>
                            <td className="p-2">{reg.setor}</td>
                            <td className="p-2">{reg.empresa}</td>
                            <td className="p-2">{reg.turma}</td>
                            <td className="p-2">{reg.situacao}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                  </div>
                )}
              </TabsContent>

              {/* Aba Só na APDATA */}
              <TabsContent value="so-apdata" className="mt-3">
                {resultado.apenasNaApdata.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-green-600">
                    <CheckCircle2 className="h-6 w-6 mr-2" />
                    <span className="font-medium">Todos da APDATA estão no Sistema</span>
                  </div>
                ) : (
                  <div className="h-[400px] border rounded-md overflow-hidden">
                  <ScrollArea className="h-full">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          <th className="p-2 text-left">Nome</th>
                          <th className="p-2 text-left">Matrícula</th>
                          <th className="p-2 text-left">Setor</th>
                          <th className="p-2 text-left">Empresa</th>
                          <th className="p-2 text-left">Turma</th>
                          <th className="p-2 text-left">Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.apenasNaApdata.map((reg, idx) => (
                          <tr key={idx} className="border-t hover:bg-muted/50">
                            <td className="p-2 font-medium">{reg.nome}</td>
                            <td className="p-2 text-muted-foreground">{reg.matricula || '-'}</td>
                            <td className="p-2">{reg.setor}</td>
                            <td className="p-2">{reg.empresa}</td>
                            <td className="p-2">{reg.turma}</td>
                            <td className="p-2">{reg.situacao}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Dados carregados */}
      {(dadosPlanilha1.length > 0 || dadosPlanilha2.length > 0) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Dados Carregados
            </h2>
            <Tabs defaultValue="sistema-data">
              <TabsList className="h-8">
                <TabsTrigger value="sistema-data" className="text-xs h-6 px-2">
                  Sistema ({dadosPlanilha1.length})
                </TabsTrigger>
                <TabsTrigger value="apdata-data" className="text-xs h-6 px-2">
                  APDATA ({dadosPlanilha2.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="sistema-data" className="mt-2">
                {dadosPlanilha1.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum dado carregado</p>
                ) : (
                  <div className="h-[300px] border rounded-md overflow-hidden">
                  <ScrollArea className="h-full">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          <th className="p-1.5 text-left">#</th>
                          <th className="p-1.5 text-left">Nome</th>
                          <th className="p-1.5 text-left">Sexo</th>
                          <th className="p-1.5 text-left">Setor</th>
                          <th className="p-1.5 text-left">Situação</th>
                          <th className="p-1.5 text-left">Empresa</th>
                          <th className="p-1.5 text-left">Matrícula</th>
                          <th className="p-1.5 text-left">Turma</th>
                          <th className="p-1.5 text-left">Cargo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dadosPlanilha1.map((reg, idx) => (
                          <tr key={idx} className="border-t hover:bg-muted/50">
                            <td className="p-1.5 text-muted-foreground">{idx + 1}</td>
                            <td className="p-1.5 font-medium">{reg.nome}</td>
                            <td className="p-1.5">{reg.sexo}</td>
                            <td className="p-1.5">{reg.setor}</td>
                            <td className="p-1.5">{reg.situacao}</td>
                            <td className="p-1.5">{reg.empresa}</td>
                            <td className="p-1.5">{reg.matricula}</td>
                            <td className="p-1.5">{reg.turma}</td>
                            <td className="p-1.5">{reg.cargo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="apdata-data" className="mt-2">
                {dadosPlanilha2.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum dado carregado</p>
                ) : (
                  <div className="h-[300px] border rounded-md overflow-hidden">
                  <ScrollArea className="h-full">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          <th className="p-1.5 text-left">#</th>
                          <th className="p-1.5 text-left">Nome</th>
                          <th className="p-1.5 text-left">Sexo</th>
                          <th className="p-1.5 text-left">Setor</th>
                          <th className="p-1.5 text-left">Situação</th>
                          <th className="p-1.5 text-left">Empresa</th>
                          <th className="p-1.5 text-left">Matrícula</th>
                          <th className="p-1.5 text-left">Turma</th>
                          <th className="p-1.5 text-left">Cargo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dadosPlanilha2.map((reg, idx) => (
                          <tr key={idx} className="border-t hover:bg-muted/50">
                            <td className="p-1.5 text-muted-foreground">{idx + 1}</td>
                            <td className="p-1.5 font-medium">{reg.nome}</td>
                            <td className="p-1.5">{reg.sexo}</td>
                            <td className="p-1.5">{reg.setor}</td>
                            <td className="p-1.5">{reg.situacao}</td>
                            <td className="p-1.5">{reg.empresa}</td>
                            <td className="p-1.5">{reg.matricula}</td>
                            <td className="p-1.5">{reg.turma}</td>
                            <td className="p-1.5">{reg.cargo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

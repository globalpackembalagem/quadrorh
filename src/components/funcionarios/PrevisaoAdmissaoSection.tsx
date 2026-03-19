import { useState, useMemo, useCallback } from 'react';
import { UserPlus, Trash2, CheckCircle, Upload, FileSpreadsheet, ClipboardPaste, HelpCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Funcionario, Setor, Situacao, SexoTipo, EmpresaTipo } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { excelSerialToDate } from '@/lib/xlsx';

interface PrevisaoAdmissaoSectionProps {
  funcionarios: Funcionario[];
  setores: Setor[];
  situacoes: Situacao[];
  onEdit: (func: Funcionario) => void;
}

interface FuncionarioImport {
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

export function PrevisaoAdmissaoSection({ 
  funcionarios, 
  setores, 
  situacoes, 
  onEdit 
}: PrevisaoAdmissaoSectionProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dados, setDados] = useState<FuncionarioImport[]>([]);
  const [textoColado, setTextoColado] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importTab, setImportTab] = useState<'colar' | 'excel'>('colar');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Encontrar situação PREVISÃO
  const situacaoPrevisao = useMemo(() => {
    return situacoes.find(s => 
      s.nome.toUpperCase().includes('PREVISÃO') || 
      s.nome.toUpperCase().includes('PREVISAO')
    );
  }, [situacoes]);

  // Filtrar funcionários com situação PREVISÃO
  const funcionariosPrevisao = useMemo(() => {
    if (!situacaoPrevisao) return [];
    return funcionarios.filter(f => f.situacao_id === situacaoPrevisao.id);
  }, [funcionarios, situacaoPrevisao]);

  const normalizarTexto = (texto: string): string => {
    return texto?.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
  };

  const encontrarSetor = (nome: string): Setor | undefined => {
    const nomeNorm = normalizarTexto(nome);
    return setores.find(s => normalizarTexto(s.nome) === nomeNorm);
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
      const date = excelSerialToDate(num);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }
    
    return undefined;
  };

  const getSetorPadrao = (): Setor | undefined => {
    return setores.find(s => s.ativo) || setores[0];
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
    let setor = encontrarSetor(setor_original);
    let setor_nome = setor_original;
    
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

    const dataAdmissaoRaw = colunas[5]?.toString().trim() || '';
    let dataAdmissao = parseData(dataAdmissaoRaw);
    if (dataAdmissaoRaw && !dataAdmissao) {
      avisos.push(`Data admissão "${dataAdmissaoRaw}" ignorada`);
    }
    
    return {
      linha: numeroLinha,
      nome_completo,
      sexo,
      setor_nome,
      setor_original,
      empresa: parseEmpresa(colunas[3] || ''),
      matricula: colunas[4]?.toString().trim() || undefined,
      data_admissao: dataAdmissao,
      cargo: colunas[6]?.toString().trim() || undefined,
      turma: colunas[7]?.toString().trim() || undefined,
      observacoes: colunas[8]?.toString().trim() || undefined,
      avisos,
      errosCriticos,
      setor_id: setor?.id || '',
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
        
        setDados(dadosProcessados);
        toast.success(`${dadosProcessados.length} registros carregados!`);
      } catch (error: any) {
        console.error('Erro ao processar Excel:', error);
        toast.error(`Erro ao ler arquivo: ${error.message}`);
      }
    };
    
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  }, [setores]);

  const importarDados = async () => {
    if (!situacaoPrevisao) {
      toast.error('Situação "PREVISÃO" não encontrada. Configure-a primeiro.');
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
      
      const { error } = await supabase
        .from('funcionarios')
        .insert(registros);
      
      if (error) throw error;
      
      toast.success(`${paraImportar.length} previsões importadas!`);
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

  const excluirPrevisao = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Previsão excluída!');
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
    } catch (error: any) {
      toast.error(`Erro ao excluir: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const totalImportaveis = dados.filter(d => d.errosCriticos.length === 0 && d.setor_id).length;

  if (!situacaoPrevisao) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>Configure a situação "PREVISÃO" em Admin → Situações para usar esta funcionalidade.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Previsão de Admissão</h2>
            <Badge variant="secondary">{funcionariosPrevisao.length}</Badge>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Upload className="h-4 w-4" />
                Importar Previsão
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Importar Previsão de Admissão
                </DialogTitle>
              </DialogHeader>

              <Alert className="shrink-0">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Todos os registros serão importados com situação <strong>PREVISÃO</strong>. 
                  Quando o funcionário iniciar, altere a situação para "Ativo".
                </AlertDescription>
              </Alert>

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
                    <AlertTitle>Ordem das colunas</AlertTitle>
                    <AlertDescription className="text-sm">
                      <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                        Nome | Sexo | Setor | Empresa | Matrícula | Admissão | Cargo | Turma | Obs
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Textarea
                    placeholder="Cole os dados aqui..."
                    value={textoColado}
                    onChange={(e) => setTextoColado(e.target.value)}
                    className="flex-1 min-h-[150px] font-mono text-sm"
                  />
                  
                  <Button onClick={processarTextoColado} disabled={!textoColado.trim()}>
                    Processar Dados
                  </Button>
                </TabsContent>

                <TabsContent value="excel" className="flex-1 flex flex-col space-y-4 min-h-0 mt-4">
                  <Alert className="shrink-0">
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>Ordem das colunas</AlertTitle>
                    <AlertDescription className="text-sm">
                      <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                        Nome | Sexo | Setor | Empresa | Matrícula | Admissão | Cargo | Turma | Obs
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg">
                    <label className="cursor-pointer text-center p-8">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Clique para selecionar arquivo Excel
                      </p>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </TabsContent>
              </Tabs>

              {dados.length > 0 && (
                <div className="shrink-0 space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {totalImportaveis} registros prontos para importar
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setDados([])}>
                        Limpar
                      </Button>
                      <Button 
                        onClick={importarDados} 
                        disabled={totalImportaveis === 0 || isImporting}
                      >
                        {isImporting ? 'Importando...' : `Importar ${totalImportaveis}`}
                      </Button>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[200px] border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted">
                        <tr>
                          <th className="text-left p-2">Nome</th>
                          <th className="text-left p-2">Setor</th>
                          <th className="text-left p-2">Empresa</th>
                          <th className="text-left p-2">Admissão</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{item.nome_completo}</td>
                            <td className="p-2">{item.setor_nome}</td>
                            <td className="p-2">{item.empresa}</td>
                            <td className="p-2">{item.data_admissao || '-'}</td>
                            <td className="p-2">
                              {item.errosCriticos.length > 0 ? (
                                <Badge variant="destructive">Erro</Badge>
                              ) : item.avisos.length > 0 ? (
                                <Badge variant="secondary">Ajustado</Badge>
                              ) : (
                                <Badge variant="default">OK</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {funcionariosPrevisao.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma previsão de admissão</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Nome</th>
                <th>Setor</th>
                <th>Admissão Prevista</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {funcionariosPrevisao.map((func) => (
                <tr key={func.id} className="hover:bg-muted/50">
                  <td>{func.empresa}</td>
                  <td className="font-medium">{func.nome_completo}</td>
                  <td>{func.setor?.nome}</td>
                  <td>
                    {func.data_admissao 
                      ? format(new Date(func.data_admissao), 'dd/MM/yyyy')
                      : '-'
                    }
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(func)}
                        className="h-8 px-2 text-primary"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Ativar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:text-destructive"
                            disabled={deletingId === func.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Previsão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Deseja excluir a previsão de admissão de <strong>{func.nome_completo}</strong>?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => excluirPrevisao(func.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

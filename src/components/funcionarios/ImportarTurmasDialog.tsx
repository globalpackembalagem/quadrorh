import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
// xlsx-js-style loaded dynamically
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useUsuario } from '@/contexts/UserContext';

interface ImportarTurmasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface LinhaImportacao {
  funcId?: string;
  matricula: string;
  turma: string;
  turmaAnterior?: string;
  nome?: string;
  setor?: string;
  status: 'ok' | 'erro' | 'nao_encontrado';
  mensagem?: string;
}

export function ImportarTurmasDialog({ open, onOpenChange, onSuccess }: ImportarTurmasDialogProps) {
  const { usuarioAtual } = useUsuario();
  const [textoColado, setTextoColado] = useState('');
  const [linhasProcessadas, setLinhasProcessadas] = useState<LinhaImportacao[]>([]);
  const [etapa, setEtapa] = useState<'input' | 'preview' | 'resultado'>('input');
  const [processando, setProcessando] = useState(false);

  const resetar = () => {
    setTextoColado('');
    setLinhasProcessadas([]);
    setEtapa('input');
    setProcessando(false);
  };

  const handleClose = (value: boolean) => {
    if (!value) resetar();
    onOpenChange(value);
  };

  // Exportar lista atual para preencher turmas
  const exportarParaPreencher = async () => {
    try {
      const XLSX = await import('xlsx-js-style');
      let allFuncionarios: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('funcionarios')
          .select('nome_completo, matricula, turma, setor:setores!setor_id(nome), situacao:situacoes(nome)')
          .order('nome_completo')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        if (data?.length) {
          allFuncionarios = [...allFuncionarios, ...data];
          hasMore = data.length === pageSize;
          page++;
        } else hasMore = false;
      }

      // Filtrar apenas SOPRO ativos
      const sopro = allFuncionarios.filter(f => {
        const setor = (f.setor as any)?.nome?.toUpperCase() || '';
        const sit = (f.situacao as any)?.nome?.toUpperCase() || '';
        return setor.includes('SOPRO') && (sit === 'ATIVO' || sit === 'FÉRIAS' || sit.includes('ATIVO'));
      });

      const dados = sopro.map(f => ({
        'NOME': f.nome_completo,
        'TURMA_ATUAL': f.turma || '',
        'NOVA_TURMA': '',
        'MATRÍCULA': f.matricula || '',
        'SETOR': (f.setor as any)?.nome || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Turmas');
      XLSX.writeFile(wb, `Turmas_Sopro_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
      toast.success('Planilha exportada! Preencha a coluna NOVA_TURMA e importe de volta.');
    } catch {
      toast.error('Erro ao exportar');
    }
  };

  const buscarTodosFuncionarios = async () => {
    let all: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('id, matricula, nome_completo, turma, setor:setores!setor_id(nome)')
        .order('nome_completo')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      if (data?.length) {
        all = [...all, ...data];
        hasMore = data.length === pageSize;
        page++;
      } else hasMore = false;
    }
    return all;
  };

  const processarTexto = async () => {
    if (!textoColado.trim()) {
      toast.error('Cole os dados da planilha');
      return;
    }

    setProcessando(true);

    try {
      const linhas = textoColado.trim().split('\n').filter(l => l.trim());
      const resultado: LinhaImportacao[] = [];
      const funcionarios = await buscarTodosFuncionarios();

      for (const linha of linhas) {
        const partes = linha.split(/\t|;/).map(p => p.trim()).filter(Boolean);
        
        if (partes.length < 2) {
          resultado.push({ matricula: '-', turma: '', nome: partes[0] || '?', status: 'erro', mensagem: 'Formato inválido (NOME + TURMA)' });
          continue;
        }

        const nome = partes[0].trim().toUpperCase();
        const turma = partes[1].trim().toUpperCase();

        // Buscar por nome (exato, case insensitive)
        const funcsEncontrados = funcionarios.filter(f => f.nome_completo.toUpperCase().trim() === nome);

        if (funcsEncontrados.length === 0) {
          resultado.push({ matricula: '-', turma, nome: partes[0].trim(), status: 'nao_encontrado', mensagem: 'Nome não encontrado' });
          continue;
        }

        for (const func of funcsEncontrados) {
          resultado.push({
            funcId: func.id,
            matricula: func.matricula || 'TEMP',
            turma,
            turmaAnterior: func.turma || '',
            nome: func.nome_completo,
            setor: (func.setor as any)?.nome || '-',
            status: 'ok',
            mensagem: func.turma === turma ? 'Já está nessa turma' : `${func.turma || '(vazio)'} → ${turma}`,
          });
        }
      }

      setLinhasProcessadas(resultado);
      setEtapa('preview');
    } catch {
      toast.error('Erro ao processar dados');
    } finally {
      setProcessando(false);
    }
  };

  const processarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx-js-style');
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Detectar se tem coluna NOVA_TURMA (exportação do sistema)
        const header = rows[0]?.map(h => String(h).toUpperCase().trim()) || [];
        const idxNome = header.indexOf('NOME');
        const idxNovaTurma = header.indexOf('NOVA_TURMA');

        let texto: string;
        if (idxNome >= 0 && idxNovaTurma >= 0) {
          // Formato de re-importação: usa NOME + NOVA_TURMA
          texto = rows.slice(1)
            .filter(row => row[idxNome] && row[idxNovaTurma] && String(row[idxNovaTurma]).trim())
            .map(row => `${row[idxNome]}\t${row[idxNovaTurma]}`)
            .join('\n');
        } else {
          // Formato genérico: primeiras duas colunas
          texto = rows
            .filter(row => row.length >= 2 && row[0])
            .map(row => `${row[0]}\t${row[1]}`)
            .join('\n');
        }

        setTextoColado(texto);
        if (texto) toast.success('Planilha carregada! Clique PROCESSAR.');
        else toast.warning('Nenhuma linha com NOVA_TURMA preenchida encontrada.');
      } catch {
        toast.error('Erro ao ler arquivo');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const aplicarAlteracoes = async () => {
    const linhasValidas = linhasProcessadas.filter(
      l => l.status === 'ok' && !l.mensagem?.startsWith('Já está') && l.funcId
    );

    if (linhasValidas.length === 0) {
      toast.info('Nenhuma alteração a aplicar');
      return;
    }

    setProcessando(true);

    try {
      let atualizados = 0;
      let erros = 0;

      for (const linha of linhasValidas) {
        const { error } = await supabase
          .from('funcionarios')
          .update({ turma: linha.turma })
          .eq('id', linha.funcId!);

        if (error) { erros++; } else { atualizados++; }
      }

      const resultados = linhasProcessadas.map(l => {
        if (l.status === 'ok' && !l.mensagem?.startsWith('Já está') && l.funcId) {
          return { ...l, mensagem: '✓ Atualizado' };
        }
        return l;
      });

      // Registrar histórico de alterações em massa
      const registrosHistorico = linhasValidas
        .map(l => ({
          tabela: 'funcionarios',
          operacao: 'UPDATE',
          registro_id: l.funcId!,
          dados_anteriores: { nome: l.nome, turma: l.turmaAnterior || null },
          dados_novos: { nome: l.nome, turma: l.turma },
          usuario_nome: usuarioAtual.nome,
        }));
      if (registrosHistorico.length > 0) {
        await supabase.from('historico_auditoria').insert(registrosHistorico);
      }

      setLinhasProcessadas(resultados);
      setEtapa('resultado');

      toast.success(`${atualizados} turma(s) atualizada(s)${erros > 0 ? `, ${erros} erro(s)` : ''}`);
      onSuccess();
    } catch {
      toast.error('Erro ao aplicar alterações');
    } finally {
      setProcessando(false);
    }
  };

  const totalOk = linhasProcessadas.filter(l => l.status === 'ok' && !l.mensagem?.startsWith('Já está')).length;
  const totalJaTem = linhasProcessadas.filter(l => l.mensagem?.startsWith('Já está')).length;
  const totalErro = linhasProcessadas.filter(l => l.status !== 'ok').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            ATUALIZAR TURMAS EM MASSA
          </DialogTitle>
          <DialogDescription>
            Exporte a planilha, preencha a coluna NOVA_TURMA e importe de volta
          </DialogDescription>
        </DialogHeader>

        {etapa === 'input' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="default" size="sm" onClick={exportarParaPreencher}>
                <Download className="h-4 w-4 mr-1" />
                EXPORTAR PLANILHA SOPRO
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={processarArquivo} />
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    IMPORTAR EXCEL
                  </span>
                </Button>
              </label>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              <strong>Fluxo:</strong> 1) Exporte a planilha → 2) Preencha NOVA_TURMA → 3) Importe de volta → 4) Confira e aplique
            </div>

            <Textarea
              placeholder={`NOME DO FUNCIONARIO\t1A\nOUTRO FUNCIONARIO\t2B`}
              value={textoColado}
              onChange={e => setTextoColado(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>CANCELAR</Button>
              <Button onClick={processarTexto} disabled={processando || !textoColado.trim()}>
                {processando ? 'PROCESSANDO...' : 'PROCESSAR'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {(etapa === 'preview' || etapa === 'resultado') && (
          <div className="space-y-3 flex-1 min-h-0">
            <div className="flex items-center gap-2 flex-wrap">
              {totalOk > 0 && (
                <Badge className="bg-success/10 text-success border-success/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {totalOk} a atualizar
                </Badge>
              )}
              {totalJaTem > 0 && <Badge variant="secondary">{totalJaTem} já corretos</Badge>}
              {totalErro > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {totalErro} com erro
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">NOME</TableHead>
                    <TableHead className="text-xs">MATRÍCULA</TableHead>
                    <TableHead className="text-xs">SETOR</TableHead>
                    <TableHead className="text-xs">TURMA</TableHead>
                    <TableHead className="text-xs">STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhasProcessadas.map((l, i) => (
                    <TableRow key={i} className={l.status !== 'ok' ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-xs">{l.nome || '-'}</TableCell>
                      <TableCell className="text-xs font-mono">{l.matricula}</TableCell>
                      <TableCell className="text-xs">{l.setor || '-'}</TableCell>
                      <TableCell className="text-xs font-bold">{l.turma}</TableCell>
                      <TableCell className="text-xs">
                        {l.status === 'ok' ? (
                          <span className="text-success">{l.mensagem}</span>
                        ) : (
                          <span className="text-destructive">{l.mensagem}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={resetar}>VOLTAR</Button>
              {etapa === 'preview' && (
                <Button onClick={aplicarAlteracoes} disabled={processando || totalOk === 0}>
                  {processando ? 'APLICANDO...' : `APLICAR ${totalOk} ALTERAÇÃO(ÕES)`}
                </Button>
              )}
              {etapa === 'resultado' && (
                <Button onClick={() => handleClose(false)}>FECHAR</Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

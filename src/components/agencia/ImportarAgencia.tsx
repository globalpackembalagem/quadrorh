import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface RegistroImport {
  linha: number;
  nome_completo: string;
  setor: string;
  funcao: string;
  telefone: string;
  cpf: string;
  sexo: string;
  indicacao: string;
  residencia_fretado: string;
  ponto_referencia: string;
  camisa: string;
  calca: string;
  sapato: string;
  oculos: string;
  data_integracao: string;
}

// Mapeamento das colunas do modelo
const COLUNAS_MAP: { header: string; key: keyof Omit<RegistroImport, 'linha'> }[] = [
  { header: 'NOME COMPLETO', key: 'nome_completo' },
  { header: 'SETOR', key: 'setor' },
  { header: 'FUNÇÃO', key: 'funcao' },
  { header: 'TELEFONE', key: 'telefone' },
  { header: 'CPF', key: 'cpf' },
  { header: 'SEXO', key: 'sexo' },
  { header: 'INDICAÇÃO', key: 'indicacao' },
  { header: 'RESIDÊNCIA (FRETADO)', key: 'residencia_fretado' },
  { header: 'PONTO REFERÊNCIA', key: 'ponto_referencia' },
  { header: 'CAMISA', key: 'camisa' },
  { header: 'CALÇA', key: 'calca' },
  { header: 'SAPATO', key: 'sapato' },
  { header: 'ÓCULOS', key: 'oculos' },
  { header: 'DATA INTEGRAÇÃO', key: 'data_integracao' },
];

interface ImportarAgenciaProps {
  criado_por: string;
}

export function ImportarAgencia({ criado_por }: ImportarAgenciaProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dados, setDados] = useState<RegistroImport[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const excelSerialToIsoDate = (serial: number): string | null => {
    if (!Number.isFinite(serial) || serial <= 0) return null;

    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + Math.floor(serial) * 24 * 60 * 60 * 1000);
    if (Number.isNaN(date.getTime())) return null;

    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  };

  const parseData = (valor: string): string | null => {
    if (!valor) return null;
    const str = valor.toString().trim();

    // dd/MM/yyyy
    const match1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match1) {
      let [, dia, mes, anoStr] = match1;
      let ano = parseInt(anoStr);
      if (ano < 100) ano = 2000 + ano;
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    // yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // Excel serial number
    const num = parseFloat(str);
    if (!isNaN(num) && num > 1000 && num < 100000) {
      return excelSerialToIsoDate(num);
    }
    return null;
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

        if (jsonData.length <= 1) {
          toast({ title: 'PLANILHA VAZIA OU SÓ COM CABEÇALHO', variant: 'destructive' });
          return;
        }

        const registros: RegistroImport[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.every(c => !c?.toString().trim())) continue;

          const reg: RegistroImport = {
            linha: i + 1,
            nome_completo: row[0]?.toString().trim() || '',
            setor: row[1]?.toString().trim() || '',
            funcao: row[2]?.toString().trim() || '',
            telefone: row[3]?.toString().trim() || '',
            cpf: row[4]?.toString().trim() || '',
            sexo: row[5]?.toString().trim() || '',
            indicacao: row[6]?.toString().trim() || '',
            residencia_fretado: row[7]?.toString().trim() || '',
            ponto_referencia: row[8]?.toString().trim() || '',
            camisa: row[9]?.toString().trim() || '',
            calca: row[10]?.toString().trim() || '',
            sapato: row[11]?.toString().trim() || '',
            oculos: row[12]?.toString().trim() || '',
            data_integracao: row[13]?.toString().trim() || '',
          };
          registros.push(reg);
        }

        if (registros.length === 0) {
          toast({ title: 'NENHUM REGISTRO ENCONTRADO', variant: 'destructive' });
          return;
        }

        setDados(registros);
        toast({ title: `${registros.length} REGISTROS CARREGADOS` });
      } catch (error: any) {
        toast({ title: 'ERRO AO LER ARQUIVO', description: error.message, variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  }, []);

  const importarDados = async () => {
    if (dados.length === 0) return;
    setIsImporting(true);

    try {
      const registros = dados.map(d => ({
        nome_completo: d.nome_completo || null,
        setor: d.setor || null,
        funcao: d.funcao || null,
        telefone: d.telefone || null,
        cpf: d.cpf || null,
        sexo: d.sexo || null,
        indicacao: d.indicacao || null,
        residencia_fretado: d.residencia_fretado || null,
        ponto_referencia: d.ponto_referencia || null,
        camisa: d.camisa || null,
        calca: d.calca || null,
        sapato: d.sapato || null,
        oculos: d.oculos || null,
        data_integracao: parseData(d.data_integracao),
        criado_por,
      }));

      const BATCH_SIZE = 500;
      let importados = 0;

      for (let i = 0; i < registros.length; i += BATCH_SIZE) {
        const lote = registros.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('integracoes_agencia').insert(lote);
        if (error) throw error;
        importados += lote.length;
      }

      toast({ title: `${importados} REGISTROS IMPORTADOS COM SUCESSO` });
      queryClient.invalidateQueries({ queryKey: ['integracoes_agencia'] });
      setDialogOpen(false);
      setDados([]);
    } catch (error: any) {
      toast({ title: 'ERRO AO IMPORTAR', description: error.message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setDados([]); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-1" /> IMPORTAR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            IMPORTAR CANDIDATOS
          </DialogTitle>
        </DialogHeader>

        {dados.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="text-center space-y-2">
              <FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
              <p className="text-lg font-medium">SELECIONE UM ARQUIVO EXCEL</p>
              <p className="text-sm text-muted-foreground">
                Use o mesmo layout do modelo (BAIXAR MODELO na tela principal)
              </p>
              <p className="text-xs text-muted-foreground">
                Colunas: NOME COMPLETO, SETOR, FUNÇÃO, TELEFONE, CPF, SEXO, INDICAÇÃO, RESIDÊNCIA, PONTO REF., CAMISA, CALÇA, SAPATO, ÓCULOS, DATA INTEGRAÇÃO
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-2">
                Nenhum campo é obrigatório — linhas em branco serão ignoradas
              </p>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
                <Upload className="h-5 w-5" />
                SELECIONAR ARQUIVO
              </div>
            </label>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Resumo */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {dados.length} registros prontos
              </Badge>
            </div>

            {/* Preview */}
            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>NOME</TableHead>
                    <TableHead>SETOR</TableHead>
                    <TableHead>FUNÇÃO</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>SEXO</TableHead>
                    <TableHead>DATA INT.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.map((d) => (
                    <TableRow key={d.linha}>
                      <TableCell className="text-xs text-muted-foreground">{d.linha}</TableCell>
                      <TableCell className="font-medium">{d.nome_completo || '-'}</TableCell>
                      <TableCell>{d.setor || '-'}</TableCell>
                      <TableCell>{d.funcao || '-'}</TableCell>
                      <TableCell>{d.cpf || '-'}</TableCell>
                      <TableCell>{d.sexo || '-'}</TableCell>
                      <TableCell>{d.data_integracao || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 border-t">
              <Button variant="outline" onClick={() => setDados([])}>
                LIMPAR
              </Button>
              <Button onClick={importarDados} disabled={isImporting}>
                {isImporting ? 'IMPORTANDO...' : `IMPORTAR ${dados.length} REGISTROS`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

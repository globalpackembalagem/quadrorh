import { useState, useMemo } from 'react';
import { useIntegracoes, useMarcarPresenca, useImportIntegracoes, useDeleteIntegracao } from '@/hooks/useIntegracoes';
import { useUsuario } from '@/contexts/UserContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Check, 
  Search, 
  Upload, 
  Trash2, 
  Clock, 
  User, 
  FileSpreadsheet,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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

export default function Integracoes() {
  const { usuarioAtual, isAdmin } = useUsuario();
  const [busca, setBusca] = useState('');
  const [dataFiltro, setDataFiltro] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const { data: integracoes = [], isLoading } = useIntegracoes(dataFiltro);
  const marcarPresenca = useMarcarPresenca();
  const importIntegracoes = useImportIntegracoes();
  const deleteIntegracao = useDeleteIntegracao();

  const filtrados = useMemo(() => {
    return integracoes.filter(i => 
      i.nome_completo.toLowerCase().includes(busca.toLowerCase())
    );
  }, [integracoes, busca]);

  const handleMarcarPresenca = (id: string, atual: boolean) => {
    marcarPresenca.mutate({
      id,
      presente: !atual,
      usuarioNome: usuarioAtual.nome
    });
  };

  const handleImportarExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    // Simulação de leitura de Excel/CSV para demonstração
    // Em um ambiente real, usaríamos a lib 'xlsx'
    toast.info('Lendo arquivo...');
    
    // Por enquanto, vamos pedir ao usuário para colar os nomes ou usar um mock
    // Mas para ser funcional, vamos implementar uma lógica básica de leitura se possível
    // Ou simplesmente mostrar o diálogo de importação.
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim() !== '');
      
      // Assume CSV simples: Nome, Data
      const lista = rows.slice(1).map(row => {
        const [nome, data] = row.split(',').map(s => s.trim());
        return {
          nome_completo: nome,
          data_integracao: data || dataFiltro,
          presente: false
        };
      });

      if (lista.length > 0) {
        importIntegracoes.mutate(lista);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Módulo de Integrações</h1>
          <p className="text-muted-foreground">Controle de presença para novos candidatos e integrações.</p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 relative">
              <Upload className="h-4 w-4" />
              IMPORTAR LISTA
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                accept=".csv"
                onChange={handleFileUpload}
              />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filtros e Busca
              </CardTitle>
              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por nome..." 
                    className="pl-9"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
                <Input 
                  type="date" 
                  className="w-full md:w-44"
                  value={dataFiltro}
                  onChange={(e) => setDataFiltro(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground">Carregando lista...</div>
            ) : filtrados.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed rounded-xl border-muted">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nenhum registro encontrado para esta data.</p>
                {isAdmin && <p className="text-xs mt-1">Importe uma lista em CSV para começar.</p>}
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Candidato</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marcação</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((item) => (
                      <TableRow 
                        key={item.id} 
                        className={cn(
                          "transition-colors",
                          item.presente ? "bg-green-500/5 hover:bg-green-500/10" : "hover:bg-muted/30"
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                              item.presente ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                            )}>
                              {item.nome_completo.charAt(0)}
                            </div>
                            <span className="font-medium">{item.nome_completo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                             {format(parseISO(item.data_integracao), 'dd/MM/yyyy')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.presente ? (
                            <Badge className="bg-green-600 hover:bg-green-700 gap-1 bubble-animation">
                              <Check className="h-3 w-3" /> PRESENTE
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-slate-200 text-slate-500 border-none shadow-none">
                              AGUARDANDO
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.presente && item.marcado_em ? (
                            <div className="flex flex-col text-[10px]">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(item.marcado_em), 'HH:mm')}
                              </span>
                              <span className="text-primary font-semibold flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.marcado_por_nome || 'Sistema'}
                              </span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                             <Button
                              size="sm"
                              variant={item.presente ? "outline" : "default"}
                              className={cn(
                                "h-8 px-4",
                                !item.presente && "bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/20"
                              )}
                              onClick={() => handleMarcarPresenca(item.id, item.presente)}
                              disabled={marcarPresenca.isPending}
                            >
                              {item.presente ? 'Desmarcar' : 'Confirmar Presença'}
                            </Button>
                            
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover registro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      className="bg-destructive hover:bg-destructive/90"
                                      onClick={() => deleteIntegracao.mutate(item.id)}
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumo do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-xl font-bold">{integracoes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Presentes</span>
                  <span className="text-xl font-bold text-green-600">
                    {integracoes.filter(i => i.presente).length}
                  </span>
                </div>
                <div className="pt-2 border-t border-primary/10">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${integracoes.length > 0 ? (integracoes.filter(i => i.presente).length / integracoes.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Instruções</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] text-muted-foreground space-y-2">
              <p>• Use a busca para encontrar o nome rapidamente.</p>
              <p>• Clique em "Confirmar Presença" quando o candidato chegar.</p>
              <p>• A marcação registra automaticamente o horário e o porteiro responsável.</p>
              {isAdmin && (
                 <div className="pt-2 mt-2 border-t italic font-medium">
                  Modo Admin: Você pode importar arquivos CSV (Nome, Data) para popular a lista.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

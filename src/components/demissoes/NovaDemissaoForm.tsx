import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Search, AlertCircle, Info, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useFuncionarios } from '@/hooks/useFuncionarios';
import { useSituacoesAtivas } from '@/hooks/useSituacoes';
import { useCreateDemissao } from '@/hooks/useDemissoes';
import { TIPOS_DESLIGAMENTO } from '@/types/demissao';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { criarEventoSistema } from '@/hooks/useEventosSistema';

const formSchema = z.object({
  funcionario_id: z.string().min(1, 'Selecione um funcionário'),
  tipo_desligamento: z.string().min(1, 'Selecione o tipo de desligamento'),
  data_prevista: z.date({ required_error: 'Data prevista é obrigatória' }),
  data_exame_demissional: z.date().optional().nullable(),
  hora_exame_demissional: z.string().optional(),
  data_homologacao: z.date().optional().nullable(),
  hora_homologacao: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NovaDemissaoFormProps {
  onSuccess: () => void;
}

export function NovaDemissaoForm({ onSuccess }: NovaDemissaoFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchHint, setShowSearchHint] = useState(false);
  const [enviarNotificacao, setEnviarNotificacao] = useState(true);
  
  const { data: funcionarios = [] } = useFuncionarios();
  const { data: situacoes = [] } = useSituacoesAtivas();
  const createDemissao = useCreateDemissao();
  const { userRole } = useAuth();

  // Buscar situação "PED. DEMISSÃO" para usar quando for Pedido de Demissão
  const situacaoPedidoDemissao = situacoes.find(s => 
    s.nome.toUpperCase() === 'PED. DEMISSÃO'
  );

  // Buscar situação "DEMISSÃO" para verificar se já está nessa situação
  const situacaoDemissao = situacoes.find(s => 
    s.nome.toUpperCase() === 'DEMISSÃO'
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange', // Validação em tempo real
    defaultValues: {
      funcionario_id: '',
      tipo_desligamento: '',
      data_prevista: new Date(),
      hora_exame_demissional: '',
      hora_homologacao: '',
    },
  });

  const funcionarioId = form.watch('funcionario_id');
  const tipoDesligamento = form.watch('tipo_desligamento');
  const dataPrevista = form.watch('data_prevista');

  // Campos válidos para habilitar o botão
  const isFormValid = !!funcionarioId && !!tipoDesligamento && !!dataPrevista;

  const funcionariosFiltrados = funcionarios.filter((f) => {
    const termo = searchTerm.toLowerCase();
    return (
      f.nome_completo.toLowerCase().includes(termo) ||
      (f.matricula && f.matricula.toLowerCase().includes(termo))
    );
  });

  const funcionarioSelecionado = funcionarios.find(
    (f) => f.id === funcionarioId
  );

  // Mostrar dica quando digita mas não selecionou
  useEffect(() => {
    if (searchTerm.length > 2 && !funcionarioSelecionado) {
      setShowSearchHint(true);
    } else {
      setShowSearchHint(false);
    }
  }, [searchTerm, funcionarioSelecionado]);

  const selecionarFuncionario = (f: (typeof funcionarios)[number]) => {
    form.setValue('funcionario_id', f.id, { shouldValidate: true, shouldDirty: true });
    setSearchTerm(f.nome_completo);
    setShowSearchHint(false);
  };

  const limparFuncionario = () => {
    form.setValue('funcionario_id', '', { shouldValidate: true, shouldDirty: true });
    setSearchTerm('');
  };

  // Função que realmente cria a demissão
  const criarDemissao = async (data: FormData, skipSituacaoUpdate: boolean) => {
    try {
      await createDemissao.mutateAsync({
        funcionario_id: data.funcionario_id,
        tipo_desligamento: data.tipo_desligamento as any,
        data_prevista: format(data.data_prevista, 'yyyy-MM-dd'),
        data_exame_demissional: data.data_exame_demissional
          ? format(data.data_exame_demissional, 'yyyy-MM-dd')
          : null,
        hora_exame_demissional: data.hora_exame_demissional || null,
        data_homologacao: data.data_homologacao
          ? format(data.data_homologacao, 'yyyy-MM-dd')
          : null,
        hora_homologacao: data.hora_homologacao || null,
        situacaoPedidoDemissaoId: situacaoPedidoDemissao?.id,
        situacaoDemissaoId: situacaoDemissao?.id,
        setor_nome: funcionarioSelecionado?.setor?.nome || undefined,
        criado_por_nome: userRole?.nome || 'Sistema',
        funcionario_nome: funcionarioSelecionado?.nome_completo || undefined,
        setor_id: funcionarioSelecionado?.setor?.id || undefined,
        turma: funcionarioSelecionado?.turma || undefined,
        skipSituacaoUpdate,
      });

      // Enviar para notificações se marcado
      if (enviarNotificacao && funcionarioSelecionado) {
        const tipoEvento = data.tipo_desligamento === 'Pedido de Demissão' ? 'pedido_demissao' : 'demissao';
        const tipoLabel = data.tipo_desligamento === 'Pedido de Demissão' ? 'Pedido de Demissão' : 'Demissão';
        await criarEventoSistema({
          tipo: tipoEvento,
          descricao: `${tipoLabel} — ${funcionarioSelecionado.nome_completo}`,
          funcionario_id: data.funcionario_id,
          funcionario_nome: funcionarioSelecionado.nome_completo,
          setor_id: funcionarioSelecionado.setor?.id || null,
          setor_nome: funcionarioSelecionado.setor?.nome || null,
          turma: funcionarioSelecionado.turma || null,
          criado_por: userRole?.nome || 'Sistema',
        });
      }

      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar demissão.';
      toast.error(message);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Verificar duplicata antes de criar — BLOQUEIA se já existe
      const { data: existente } = await supabase
        .from('demissoes')
        .select('id, realizado, tipo_desligamento')
        .eq('funcionario_id', data.funcionario_id)
        .maybeSingle();

      if (existente) {
        const statusLabel = existente.realizado ? 'realizada' : 'agendada';
        toast.error(`Este funcionário já possui uma demissão ${statusLabel}. Edite ou exclua a existente antes de registrar outra.`);
        return;
      }

      // Sem duplicata - fluxo normal
      // Verificar se funcionário já está na situação correta
      if (funcionarioSelecionado) {
        const situacaoAtualNome = funcionarioSelecionado.situacao?.nome?.toUpperCase() || '';
        const jaEstaNaSituacao = situacaoAtualNome === 'DEMISSÃO' || situacaoAtualNome === 'PED. DEMISSÃO';
        await criarDemissao(data, jaEstaNaSituacao);
      } else {
        await criarDemissao(data, false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar demissão.';
      toast.error(message);
    }
  };

  // Confirmar criação quando situação é diferente

  // Mensagens de validação faltando
  const getMissingFields = () => {
    const missing: string[] = [];
    if (!funcionarioId) missing.push('Funcionário');
    if (!tipoDesligamento) missing.push('Tipo de Desligamento');
    if (!dataPrevista) missing.push('Data Prevista');
    return missing;
  };

  const missingFields = getMissingFields();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Alerta de campos faltando - visível quando formulário foi tocado mas incompleto */}
        {form.formState.isDirty && missingFields.length > 0 && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Falta preencher: {missingFields.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Buscar Funcionário */}
        <FormField
          control={form.control}
          name="funcionario_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Funcionário *</FormLabel>
              {/* Mantém o campo registrado no react-hook-form */}
              <input type="hidden" {...field} />
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou matrícula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      // UX: muita gente digita o nome e aperta Enter esperando selecionar.
                      // Aqui selecionamos o 1º resultado automaticamente (se existir), e evitamos submit prematuro.
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!funcionarioSelecionado && funcionariosFiltrados.length > 0) {
                          selecionarFuncionario(funcionariosFiltrados[0]);
                        }
                      }
                    }}
                    className={cn("pl-10", form.formState.errors.funcionario_id && "border-destructive")}
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
                
                {/* Dica para clicar na lista */}
                {showSearchHint && funcionariosFiltrados.length > 0 && (
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Clique em um nome na lista abaixo para selecionar
                  </p>
                )}
                
                {searchTerm && !funcionarioSelecionado && (
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    {funcionariosFiltrados.length === 0 ? (
                      <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                        Nenhum funcionário encontrado com "{searchTerm}"
                      </div>
                    ) : (
                      <>
                        {funcionariosFiltrados.slice(0, 20).map((f) => {
                          const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
                          const isDesligado = situacaoNome === 'DEMISSÃO' || situacaoNome === 'PED. DEMISSÃO';
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                selecionarFuncionario(f);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 hover:bg-accent transition-colors",
                                isDesligado && "bg-destructive/5"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{f.nome_completo}</span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                                  isDesligado
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-primary/10 text-primary"
                                )}>
                                  {situacaoNome || 'S/ SITUAÇÃO'}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {f.matricula} • {f.setor?.nome}
                              </div>
                            </button>
                          );
                        })}
                        {funcionariosFiltrados.length > 20 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            Mostrando 20 de {funcionariosFiltrados.length}. Continue digitando para refinar.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Info do Funcionário Selecionado */}
        {funcionarioSelecionado && (() => {
          const matricula = funcionarioSelecionado.matricula?.toUpperCase() || '';
          const isNumerico = /^\d+$/.test(matricula);
          const isTemp = matricula.startsWith('TEMP');
          const dataAdm = funcionarioSelecionado.data_admissao ? parseISO(funcionarioSelecionado.data_admissao) : null;
          
          // Calcular vencimentos de experiência
          let experienciaInfo: { label: string; data: Date; dias: number }[] = [];
          if (dataAdm) {
            const hoje = new Date();
            if (isNumerico) {
              // Efetivo: 30 e 60 dias
              const data30 = new Date(dataAdm);
              data30.setDate(data30.getDate() + 30);
              const data60 = new Date(dataAdm);
              data60.setDate(data60.getDate() + 60);
              const dias30 = Math.ceil((data30.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
              const dias60 = Math.ceil((data60.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
              if (dias30 > 0) experienciaInfo.push({ label: '30 dias', data: data30, dias: dias30 });
              if (dias60 > 0) experienciaInfo.push({ label: '60 dias', data: data60, dias: dias60 });
            } else if (isTemp) {
              // Temporário: 90 dias
              const data90 = new Date(dataAdm);
              data90.setDate(data90.getDate() + 90);
              const dias90 = Math.ceil((data90.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
              if (dias90 > 0) experienciaInfo.push({ label: '90 dias', data: data90, dias: dias90 });
            }
          }

          return (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Matrícula:</span>{' '}
                  <span className="font-mono">{funcionarioSelecionado.matricula || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Admissão:</span>{' '}
                  {funcionarioSelecionado.data_admissao
                    ? format(parseISO(funcionarioSelecionado.data_admissao), 'dd/MM/yyyy')
                    : '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">Cargo:</span>{' '}
                  {funcionarioSelecionado.cargo || '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">Setor:</span>{' '}
                  {funcionarioSelecionado.setor?.nome || '-'}
                </div>
              </div>
              {experienciaInfo.length > 0 && (
                <div className="mt-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                    <Info className="h-3.5 w-3.5" />
                    Contrato de Experiência
                  </p>
                  <div className="space-y-1">
                    {experienciaInfo.map((exp) => (
                      <p key={exp.label} className="text-sm text-amber-600 dark:text-amber-300">
                        Vencimento {exp.label}: <span className="font-semibold">{format(exp.data, 'dd/MM/yyyy')}</span>
                        <span className="text-xs ml-1">(faltam {exp.dias} dias)</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Tipo de Desligamento */}
        <FormField
          control={form.control}
          name="tipo_desligamento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Desligamento *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className={cn(form.formState.errors.tipo_desligamento && "border-destructive")}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TIPOS_DESLIGAMENTO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Aviso especial para Pedido de Demissão */}
              {tipoDesligamento === 'Pedido de Demissão' && (
                <p className="text-sm text-blue-600 flex items-center gap-1 mt-1">
                  <Info className="h-3 w-3" />
                  Pedido de Demissão entra direto como Realizada (não aparece em Agendadas)
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Data Prevista */}
        <FormField
          control={form.control}
          name="data_prevista"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data Prevista *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'dd/MM/yyyy') : 'Selecione a data'}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Exame Demissional */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data_exame_demissional"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Exame Demissional</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'dd/MM/yyyy') : 'Data'}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="hora_exame_demissional"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Homologação */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data_homologacao"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Homologação</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'dd/MM/yyyy') : 'Data'}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="hora_homologacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Opção de notificar */}
        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="enviar-notificacao"
            checked={enviarNotificacao}
            onCheckedChange={(checked) => setEnviarNotificacao(checked === true)}
          />
          <label htmlFor="enviar-notificacao" className="text-sm flex items-center gap-1.5 cursor-pointer">
            <Bell className="h-3.5 w-3.5" />
            Enviar para notificações
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button 
            type="submit" 
            disabled={createDemissao.isPending || !isFormValid}
            className={cn(!isFormValid && "opacity-50")}
          >
            {createDemissao.isPending ? 'Salvando...' : 'Agendar Demissão'}
          </Button>
        </div>
        
        {/* Dica final quando botão está desabilitado */}
        {!isFormValid && (
          <p className="text-xs text-muted-foreground text-center">
            Preencha todos os campos obrigatórios (*) para habilitar o botão
          </p>
        )}
      </form>

    </Form>
  );
}

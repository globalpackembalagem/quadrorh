import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useUpdateDemissao } from '@/hooks/useDemissoes';
import { Demissao, TIPOS_DESLIGAMENTO } from '@/types/demissao';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const formSchema = z.object({
  tipo_desligamento: z.string().optional(),
  data_prevista: z.date({ required_error: 'Data prevista é obrigatória' }),
  data_exame_demissional: z.date().optional().nullable(),
  hora_exame_demissional: z.string().optional(),
  data_homologacao: z.date().optional().nullable(),
  hora_homologacao: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditarDemissaoFormProps {
  demissao: Demissao;
  onSuccess: () => void;
}

export function EditarDemissaoForm({ demissao, onSuccess }: EditarDemissaoFormProps) {
  const updateDemissao = useUpdateDemissao();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo_desligamento: demissao.tipo_desligamento || '',
      // parseISO evita o bug de fuso horário do new Date('YYYY-MM-DD') (pode voltar 1 dia)
      data_prevista: parseISO(demissao.data_prevista),
      data_exame_demissional: demissao.data_exame_demissional 
        ? parseISO(demissao.data_exame_demissional) 
        : null,
      hora_exame_demissional: demissao.hora_exame_demissional || '',
      data_homologacao: demissao.data_homologacao 
        ? parseISO(demissao.data_homologacao) 
        : null,
      hora_homologacao: demissao.hora_homologacao || '',
    },
  });

  const onSubmit = async (data: FormData) => {
    const dataAnterior = demissao.data_prevista;
    const novaData = format(data.data_prevista, 'yyyy-MM-dd');
    
    await updateDemissao.mutateAsync({
      id: demissao.id,
      tipo_desligamento: (data.tipo_desligamento as any) || null,
      data_prevista: novaData,
      data_exame_demissional: data.data_exame_demissional 
        ? format(data.data_exame_demissional, 'yyyy-MM-dd') 
        : null,
      hora_exame_demissional: data.hora_exame_demissional || null,
      data_homologacao: data.data_homologacao 
        ? format(data.data_homologacao, 'yyyy-MM-dd') 
        : null,
      hora_homologacao: data.hora_homologacao || null,
    });
    
    // Aviso se mudou o mês (pode sair do filtro atual)
    const mesAnterior = dataAnterior.slice(0, 7);
    const mesNovo = novaData.slice(0, 7);
    if (mesAnterior !== mesNovo) {
      toast.info(`A demissão foi movida para ${format(data.data_prevista, 'MMMM/yyyy', { locale: ptBR })}. Ajuste o filtro de período para visualizá-la.`);
    }
    
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Info do Funcionário */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Funcionário:</span>{' '}
              <span className="font-medium">{demissao.funcionario?.nome_completo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Matrícula:</span>{' '}
              <span className="font-mono">{demissao.funcionario?.matricula || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cargo:</span>{' '}
              {demissao.funcionario?.cargo || '-'}
            </div>
            <div>
              <span className="text-muted-foreground">Setor:</span>{' '}
              {demissao.funcionario?.setor?.nome || '-'}
            </div>
          </div>
        </div>

        {/* Tipo de Desligamento */}
        <FormField
          control={form.control}
          name="tipo_desligamento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Desligamento</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
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
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Data Prevista */}
        <FormField
          control={form.control}
          name="data_prevista"
          render={({ field }) => {
            const [open, setOpen] = React.useState(false);
            return (
              <FormItem className="flex flex-col">
                <FormLabel>Data Prevista *</FormLabel>
                <Popover open={open} onOpenChange={setOpen}>
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
                      onSelect={(date) => {
                        field.onChange(date);
                        setOpen(false);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            );
          }}
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

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={updateDemissao.isPending}>
            {updateDemissao.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

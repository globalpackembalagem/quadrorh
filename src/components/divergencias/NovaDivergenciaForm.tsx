import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useFuncionarios } from '@/hooks/useFuncionarios';
import { useSetores } from '@/hooks/useSetores';
import { useCreateDivergencia } from '@/hooks/useDivergencias';
import { useUsuario } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';

interface NovaDivergenciaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  funcionario_id: string;
  tipo_divergencia: string;
  observacoes: string;
  // Campos específicos por tipo
  cobertura_setor_id: string;
  cobertura_funcionario_id: string;
  treinamento_setor_id: string;
  sumido_desde: string;
}

const TIPOS_DIVERGENCIA = [
  { value: 'COB. FÉRIAS', label: 'COBERTURA DE FÉRIAS' },
  { value: 'TREINAMENTO', label: 'TREINAMENTO' },
  { value: 'SUMIDO', label: 'SUMIDO' },
  { value: 'OUTRO', label: 'OUTRO' },
];

export function NovaDivergenciaForm({ open, onOpenChange }: NovaDivergenciaFormProps) {
  const { data: funcionarios = [] } = useFuncionarios();
  const { data: setores = [] } = useSetores();
  const createDivergencia = useCreateDivergencia();
  const { usuarioAtual } = useUsuario();
  
  const [tipoSelecionado, setTipoSelecionado] = useState('');
  const [sumido7dias, setSumido7dias] = useState<boolean | null>(null);
  
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      funcionario_id: '',
      tipo_divergencia: '',
      observacoes: '',
      cobertura_setor_id: '',
      cobertura_funcionario_id: '',
      treinamento_setor_id: '',
      sumido_desde: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const funcionarioId = watch('funcionario_id');
  const coberturaSetorId = watch('cobertura_setor_id');

  // Funcionários ativos para seleção
  const funcionariosAtivos = funcionarios.filter(f => 
    f.situacao?.nome === 'ATIVO' || f.situacao?.nome === 'FÉRIAS'
  );

  // Funcionários do setor selecionado (para cobertura)
  const funcionariosDoSetor = funcionarios.filter(f => 
    f.setor_id === coberturaSetorId && 
    (f.situacao?.nome === 'FÉRIAS')
  );

  // Setores ativos
  const setoresAtivos = setores.filter(s => s.ativo);

  const onSubmit = async (data: FormData) => {
    // Monta observação detalhada baseada no tipo
    let observacaoCompleta = data.observacoes || '';
    
    if (data.tipo_divergencia === 'COB. FÉRIAS') {
      const setor = setores.find(s => s.id === data.cobertura_setor_id);
      const func = funcionarios.find(f => f.id === data.cobertura_funcionario_id);
      observacaoCompleta = `COBRINDO: ${func?.nome_completo || 'N/A'} | SETOR: ${setor?.nome || 'N/A'}${data.observacoes ? ` | OBS: ${data.observacoes}` : ''}`;
    } else if (data.tipo_divergencia === 'TREINAMENTO') {
      const setor = setores.find(s => s.id === data.treinamento_setor_id);
      observacaoCompleta = `TREINANDO EM: ${setor?.nome || 'N/A'}${data.observacoes ? ` | OBS: ${data.observacoes}` : ''}`;
    } else if (data.tipo_divergencia === 'SUMIDO') {
      observacaoCompleta = `SUMIDO DESDE: ${data.sumido_desde ? format(new Date(data.sumido_desde + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A'}${data.observacoes ? ` | OBS: ${data.observacoes}` : ''}`;
    }

    await createDivergencia.mutateAsync({
      funcionario_id: data.funcionario_id,
      tipo_divergencia: data.tipo_divergencia,
      criado_por: usuarioAtual?.nome || 'N/A',
      observacoes: observacaoCompleta,
    });

    reset();
    setTipoSelecionado('');
    setSumido7dias(null);
    onOpenChange(false);
  };

  const handleTipoChange = (value: string) => {
    setTipoSelecionado(value);
    setValue('tipo_divergencia', value);
  };

  const handleClose = () => {
    reset();
    setTipoSelecionado('');
    setSumido7dias(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>NOVA DIVERGÊNCIA</DialogTitle>
          <DialogDescription>
            REGISTRE UMA DIVERGÊNCIA PARA ANÁLISE DO RH
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Funcionário */}
          <div className="space-y-2">
            <Label>FUNCIONÁRIO *</Label>
            <Select
              value={funcionarioId}
              onValueChange={(value) => setValue('funcionario_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="SELECIONE O FUNCIONÁRIO" />
              </SelectTrigger>
              <SelectContent>
                {funcionariosAtivos.map((func) => (
                  <SelectItem key={func.id} value={func.id}>
                    {func.nome_completo.toUpperCase()} - {func.setor?.nome?.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Divergência */}
          <div className="space-y-2">
            <Label>TIPO DE DIVERGÊNCIA *</Label>
            <Select value={tipoSelecionado} onValueChange={handleTipoChange}>
              <SelectTrigger>
                <SelectValue placeholder="SELECIONE O TIPO" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_DIVERGENCIA.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campos específicos para COB. FÉRIAS */}
          {tipoSelecionado === 'COB. FÉRIAS' && (
            <>
              <div className="space-y-2">
                <Label>SETOR DA COBERTURA *</Label>
                <Select
                  value={coberturaSetorId}
                  onValueChange={(value) => setValue('cobertura_setor_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="SELECIONE O SETOR" />
                  </SelectTrigger>
                  <SelectContent>
                    {setoresAtivos.map((setor) => (
                      <SelectItem key={setor.id} value={setor.id}>
                        {setor.nome.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>FUNCIONÁRIO QUE ESTÁ COBRINDO *</Label>
                <Select
                  value={watch('cobertura_funcionario_id')}
                  onValueChange={(value) => setValue('cobertura_funcionario_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="SELECIONE QUEM ESTÁ DE FÉRIAS" />
                  </SelectTrigger>
                  <SelectContent>
                    {funcionariosDoSetor.length > 0 ? (
                      funcionariosDoSetor.map((func) => (
                        <SelectItem key={func.id} value={func.id}>
                          {func.nome_completo.toUpperCase()}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        NENHUM FUNCIONÁRIO DE FÉRIAS NESTE SETOR
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Campos específicos para TREINAMENTO */}
          {tipoSelecionado === 'TREINAMENTO' && (
            <div className="space-y-2">
              <Label>TREINANDO EM QUAL SETOR? *</Label>
              <Select
                value={watch('treinamento_setor_id')}
                onValueChange={(value) => setValue('treinamento_setor_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="SELECIONE O SETOR DE TREINAMENTO" />
                </SelectTrigger>
                <SelectContent>
                  {setoresAtivos.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id}>
                      {setor.nome.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Campos específicos para SUMIDO */}
          {tipoSelecionado === 'SUMIDO' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
              <Label className="text-sm font-bold text-warning-foreground">
                  ⚠️ ELE JÁ TEM 5 FALTAS CONSECUTIVAS?
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  (DIAS DE FOLGA NÃO CONTAM — APENAS DIAS QUE DEVERIA TRABALHAR)
                </p>
                <div className="flex gap-3 mt-3">
                  <Button
                    type="button"
                    variant={sumido7dias === true ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSumido7dias(true)}
                  >
                    SIM, JÁ TEM 5 FALTAS
                  </Button>
                  <Button
                    type="button"
                    variant={sumido7dias === false ? 'destructive' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSumido7dias(false)}
                  >
                    NÃO, MENOS DE 5 FALTAS
                  </Button>
                </div>
                {sumido7dias === false && (
                  <p className="text-xs text-destructive mt-2 font-medium">
                    ⚠️ ATENÇÃO: AGUARDE COMPLETAR 5 FALTAS ANTES DE REGISTRAR COMO SUMIDO.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>SUMIDO DESDE QUANDO? *</Label>
                <Input
                  type="date"
                  {...register('sumido_desde')}
                  className="uppercase"
                />
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label>OBSERVAÇÕES ADICIONAIS</Label>
            <Textarea
              {...register('observacoes')}
              placeholder="INFORMAÇÕES ADICIONAIS PARA O RH..."
              className="uppercase"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              CANCELAR
            </Button>
            <Button 
              type="submit" 
              disabled={!funcionarioId || !tipoSelecionado || createDivergencia.isPending || (tipoSelecionado === 'SUMIDO' && sumido7dias !== true) || (tipoSelecionado === 'SUMIDO' && !watch('sumido_desde'))}
            >
              {createDivergencia.isPending ? 'SALVANDO...' : 'REGISTRAR'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

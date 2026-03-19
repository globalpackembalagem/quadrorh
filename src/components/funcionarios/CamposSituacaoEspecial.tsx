import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Funcionario, Setor } from '@/types/database';
import { AlertCircle } from 'lucide-react';

interface CamposSituacaoEspecialProps {
  situacaoNome: string;
  // Cobertura de Férias
  coberturaFuncionarioId: string;
  setCoberturaFuncionarioId: (value: string) => void;
  funcionariosParaCobertura: Funcionario[];
  // Treinamento
  treinamentoSetorId: string;
  setTreinamentoSetorId: (value: string) => void;
  setoresDisponiveis: Setor[];
  // Sumido
  sumidoDesde: string;
  setSumidoDesde: (value: string) => void;
}

export function CamposSituacaoEspecial({
  situacaoNome,
  coberturaFuncionarioId,
  setCoberturaFuncionarioId,
  funcionariosParaCobertura,
  treinamentoSetorId,
  setTreinamentoSetorId,
  setoresDisponiveis,
  sumidoDesde,
  setSumidoDesde,
}: CamposSituacaoEspecialProps) {
  const situacaoUpper = situacaoNome?.toUpperCase() || '';
  
  const isCobertura = situacaoUpper.includes('COB') && situacaoUpper.includes('FÉRIAS') || 
                      situacaoUpper.includes('COB. FÉRIAS') ||
                      situacaoUpper === 'COBERTURA FÉRIAS';
  const isTreinamento = situacaoUpper.includes('TREINAMENTO');
  const isSumido = situacaoUpper.includes('SUMIDO');

  if (!isCobertura && !isTreinamento && !isSumido) {
    return null;
  }

  return (
    <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 space-y-4">
      <div className="flex items-center gap-2 text-warning-foreground">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">INFORMAÇÕES ADICIONAIS - {situacaoNome?.toUpperCase()}</span>
      </div>

      {/* Campo Cobertura de Férias */}
      {isCobertura && (
        <div className="space-y-2">
          <Label htmlFor="cobertura" className="text-foreground font-medium">
            Quem está cobrindo? *
          </Label>
          <Select value={coberturaFuncionarioId} onValueChange={setCoberturaFuncionarioId}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Selecione o funcionário que está sendo coberto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Não informado</SelectItem>
              {funcionariosParaCobertura.map((func) => (
                <SelectItem key={func.id} value={func.id}>
                  {func.nome_completo.toUpperCase()} - {func.setor?.nome?.toUpperCase() || 'SEM SETOR'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Informe qual funcionário este colaborador está cobrindo durante as férias
          </p>
        </div>
      )}

      {/* Campo Treinamento */}
      {isTreinamento && (
        <div className="space-y-2">
          <Label htmlFor="treinamento" className="text-foreground font-medium">
            Em qual setor está treinando? *
          </Label>
          <Select value={treinamentoSetorId} onValueChange={setTreinamentoSetorId}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Selecione o setor de treinamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Não informado</SelectItem>
              {setoresDisponiveis.map((setor) => (
                <SelectItem key={setor.id} value={setor.id}>
                  {setor.nome.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Informe em qual setor o funcionário está realizando treinamento
          </p>
        </div>
      )}

      {/* Campo Sumido */}
      {isSumido && (
        <div className="space-y-2">
          <Label htmlFor="sumidoDesde" className="text-foreground font-medium">
            Sumido desde quando? *
          </Label>
          <Input
            id="sumidoDesde"
            type="date"
            value={sumidoDesde}
            onChange={(e) => setSumidoDesde(e.target.value)}
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Informe a data desde quando o funcionário está sumido (será enviado para análise do RH)
          </p>
        </div>
      )}
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Wind, Palette, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListaFuncionariosSetor } from '@/components/dashboard/ListaFuncionariosSetor';
import { ListaFuncionariosExperiencia } from '@/components/dashboard/ListaFuncionariosExperiencia';
import { ListaFuncionariosExperienciaGeral } from '@/components/dashboard/ListaFuncionariosExperienciaGeral';
import { EscalaFolgaDialog } from '@/components/decoracao/EscalaFolgaDialog';
import { EscalaSoproCalendario } from '@/components/sopro/EscalaSoproCalendario';
import type { GrupoType } from '@/hooks/useDashboardData';

const GRUPOS: GrupoType[] = ['SOPRO', 'DECORAÇÃO'];

interface DashboardGroupSelectorProps {
  grupoSelecionado: GrupoType;
  setGrupoSelecionado: (g: GrupoType) => void;
  temAcessoSopro: boolean;
  temAcessoDecoracao: boolean;
  isRHMode: boolean;
  isGestorSetor: boolean;
  todosSopro: any[];
  todosDecoracao: any[];
  todosFuncionarios: any[];
}

export function DashboardGroupSelector({
  grupoSelecionado,
  setGrupoSelecionado,
  temAcessoSopro,
  temAcessoDecoracao,
  isRHMode,
  isGestorSetor,
  todosSopro,
  todosDecoracao,
  todosFuncionarios,
}: DashboardGroupSelectorProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-2">
        {GRUPOS.filter(grupo => {
          if (grupo === 'SOPRO') return temAcessoSopro;
          if (grupo === 'DECORAÇÃO') return temAcessoDecoracao;
          return true;
        }).map(grupo => (
          <Button
            key={grupo}
            variant={grupoSelecionado === grupo ? 'default' : 'outline'}
            size="lg"
            onClick={() => setGrupoSelecionado(grupo)}
            className={cn(
              'min-w-[150px] font-bold text-lg gap-2',
              grupoSelecionado === grupo && 'shadow-lg'
            )}
          >
            {grupo === 'SOPRO' ? <Wind className="h-5 w-5" /> : <Palette className="h-5 w-5" />}
            {grupo}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <ListaFuncionariosSetor
          grupo={grupoSelecionado}
          funcionarios={grupoSelecionado === 'SOPRO' ? todosSopro : todosDecoracao}
          disabled={!isRHMode}
        />
        <ListaFuncionariosExperiencia
          funcionarios={todosFuncionarios}
          grupo={grupoSelecionado}
          disabled={!isRHMode}
        />
        {isRHMode && !isGestorSetor && (
          <ListaFuncionariosExperienciaGeral
            funcionarios={todosFuncionarios}
            disabled={!isRHMode}
          />
        )}
        {grupoSelecionado === 'DECORAÇÃO' && <EscalaFolgaDialog />}
        {grupoSelecionado === 'SOPRO' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="gap-2 shrink-0 font-semibold bg-green-700 hover:bg-green-800"
              >
                <Calendar className="h-4 w-4" />
                Escala
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
              <EscalaSoproCalendario />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

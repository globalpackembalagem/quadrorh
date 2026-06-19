import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Wind, Palette, Calendar, ChevronDown, FileSpreadsheet, Users } from 'lucide-react';
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
  podeExportar?: boolean;
  onExportarPorTurma?: () => void;
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
  podeExportar,
  onExportarPorTurma,
}: DashboardGroupSelectorProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-2 rounded-lg border bg-card p-1 shadow-sm">
        {GRUPOS.filter(grupo => {
          if (grupo === 'SOPRO') return temAcessoSopro;
          if (grupo === 'DECORAÇÃO') return temAcessoDecoracao;
          return true;
        }).map(grupo => (
          <Button
            key={grupo}
            variant="ghost"
            size="lg"
            onClick={() => setGrupoSelecionado(grupo)}
            className={cn(
              'min-w-[150px] gap-2 rounded-md text-base font-semibold text-muted-foreground hover:bg-muted hover:text-foreground',
              grupoSelecionado === grupo && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground'
            )}
          >
            {grupo === 'SOPRO' ? <Wind className="h-5 w-5" /> : <Palette className="h-5 w-5" />}
            {grupo}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 shrink-0 font-semibold">
              <Users className="h-4 w-4" />
              Funcionários
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-2 p-2">
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
            {podeExportar && onExportarPorTurma && (
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 font-semibold" onClick={onExportarPorTurma}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel por Turma
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {grupoSelecionado === 'DECORAÇÃO' && <EscalaFolgaDialog />}
        {grupoSelecionado === 'SOPRO' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 shrink-0 font-semibold">
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

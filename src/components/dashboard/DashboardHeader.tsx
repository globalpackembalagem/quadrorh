import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';

interface DashboardHeaderProps {
  isGestorSetor: boolean;
  isRHMode: boolean;
  podeExportar: boolean;
  onExportarExcel: () => void;
}

export function DashboardHeader({ podeExportar, onExportarExcel }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1.5 bg-primary rounded-full" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              QUADRO FUNCIONARIOS
            </h1>
            <p className="text-sm text-muted-foreground">
              Visao consolidada do quadro planejado por setor e turma
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {podeExportar && (
          <Button variant="outline" className="gap-2" onClick={onExportarExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
        )}
      </div>
    </div>
  );
}

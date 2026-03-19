import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Clock, Users, RefreshCw } from 'lucide-react';
import { ManualGestorPDF } from '@/components/manual/ManualGestorPDF';
import { ManualAdminPDF } from '@/components/manual/ManualAdminPDF';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface DashboardHeaderProps {
  isGestorSetor: boolean;
  isRHMode: boolean;
  podeExportar: boolean;
  onExportarExcel: () => void;
  onExportarPorTurma?: () => void;
  grupoSelecionado?: string;
}

export function DashboardHeader({ isGestorSetor, isRHMode, podeExportar, onExportarExcel, onExportarPorTurma, grupoSelecionado }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1.5 bg-primary rounded-full" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              QUADRO FUNCIONÁRIOS
            </h1>
            <p className="text-sm text-muted-foreground">
              Visão consolidada do quadro planejado por setor e turma
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              if ('caches' in window) {
                caches.keys().then(names => names.forEach(n => caches.delete(n)));
              }
              window.location.reload();
            }}
            title="Recarregar sistema (limpa cache)"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        )}
        {isAdmin && <ManualAdminPDF />}
        {isGestorSetor && <ManualGestorPDF />}
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => navigate('/faltas')}
          disabled={!isRHMode}
        >
          <Clock className="h-4 w-4" />
          FALTAS
        </Button>
        {podeExportar && onExportarPorTurma && (
          <Button variant="outline" className="gap-2" onClick={onExportarPorTurma}>
            <Users className="h-4 w-4" />
            Excel por Turma{grupoSelecionado ? ` (${grupoSelecionado})` : ''}
          </Button>
        )}
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

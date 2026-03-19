import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Share2, ChevronLeft, ChevronRight, Calendar, Download, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
// xlsx-js-style loaded dynamically
import { getTurmaSoproFimDeSemana, TURMAS_ESCALA_SOPRO } from '@/lib/escalaSopro';

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const TURMA_COLORS: Record<string, string> = {
  '1A': 'bg-blue-700 text-white',
  '1B': 'bg-green-700 text-white',
  '2A': 'bg-amber-600 text-white',
  '2B': 'bg-purple-700 text-white',
};

function getDiasDoMes(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const dias: (Date | null)[] = [];

  let diaSemana = primeiroDia.getDay();
  diaSemana = diaSemana === 0 ? 6 : diaSemana - 1;

  for (let i = 0; i < diaSemana; i++) {
    dias.push(null);
  }

  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    dias.push(new Date(ano, mes, d));
  }

  return dias;
}

interface MesCalendarioSoproProps {
  ano: number;
  mes: number;
  turmaFiltro: string;
}

function MesCalendarioSopro({ ano, mes, turmaFiltro }: MesCalendarioSoproProps) {
  const dias = useMemo(() => getDiasDoMes(ano, mes), [ano, mes]);
  const hoje = new Date();

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="bg-green-700 text-white font-bold text-center py-2.5 text-base uppercase">
        {MESES[mes]} / {ano}
      </div>
      <div className="grid grid-cols-7 text-sm">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center py-2 font-semibold bg-muted/50 border-b text-muted-foreground text-xs">
            {d}
          </div>
        ))}
        {dias.map((dia, i) => {
          if (!dia) return <div key={`empty-${i}`} className="h-14" />;

          const turma = getTurmaSoproFimDeSemana(dia);
          const isHoje = dia.toDateString() === hoje.toDateString();
          const isFimDeSemana = dia.getDay() === 0 || dia.getDay() === 6;
          const isMinhaEscala = turmaFiltro === 'TODAS' || turma === turmaFiltro;

          return (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center justify-center h-14 border-b border-r",
                isFimDeSemana ? "bg-muted/30" : ""
              )}
            >
              <span className={cn(
                "text-sm leading-none",
                isHoje && "font-bold underline"
              )}>
                {dia.getDate()}
              </span>
              {isFimDeSemana && turma ? (
                <span
                  className={cn(
                    "text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded",
                    isMinhaEscala ? TURMA_COLORS[turma] : "bg-muted text-muted-foreground opacity-40"
                  )}
                >
                  {turma}
                </span>
              ) : (
                !isFimDeSemana && (
                  <span className="text-[9px] text-muted-foreground mt-1">•</span>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EscalaSoproCalendario() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [turmaFiltro, setTurmaFiltro] = useState<string>('TODAS');

  const compartilharWhatsApp = useCallback((mes?: number) => {
    const diasAbrev = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    let texto = `📅 *ESCALA SOPRO - FIM DE SEMANA ${ano}*\n`;
    if (turmaFiltro !== 'TODAS') texto += `*TURMA ${turmaFiltro}*\n`;
    texto += '\n';

    const meses = mes !== undefined ? [mes] : Array.from({ length: 12 }, (_, i) => i);

    for (const m of meses) {
      texto += `*${MESES[m].toUpperCase()}*\n`;
      const diasNoMes = new Date(ano, m + 1, 0).getDate();
      for (let d = 1; d <= diasNoMes; d++) {
        const date = new Date(ano, m, d);
        const turma = getTurmaSoproFimDeSemana(date);
        if (turma && (turmaFiltro === 'TODAS' || turma === turmaFiltro)) {
          const ds = date.getDay();
          const abrev = diasAbrev[ds];
          texto += `  ${String(d).padStart(2, '0')} (${abrev}) → *${turma}*\n`;
        }
      }
      texto += '\n';
    }

    texto += '🔵 1A | 🟢 1B | 🟡 2A | 🟣 2B';
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  }, [ano, turmaFiltro]);

  const exportarExcel = useCallback(async () => {
    const XLSX = await import('xlsx-js-style');
    const wb = XLSX.utils.book_new();

    for (let m = 0; m < 12; m++) {
      const diasNoMes = new Date(ano, m + 1, 0).getDate();
      const rows: Record<string, string>[] = [];
      for (let d = 1; d <= diasNoMes; d++) {
        const date = new Date(ano, m, d);
        const turma = getTurmaSoproFimDeSemana(date);
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        rows.push({
          'Dia': String(d).padStart(2, '0'),
          'Dia Semana': dayNames[date.getDay()],
          'Turma Escala': turma || 'Seg-Sex (todos)',
        });
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws, MESES[m].substring(0, 10));
    }

    XLSX.writeFile(wb, `escala_sopro_${ano}.xlsx`);
  }, [ano]);

  const handleImprimir = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let mesesHtml = '';
    for (let m = 0; m < 12; m++) {
      const dias = getDiasDoMes(ano, m);
      let cellsHtml = '';

      DIAS_SEMANA.forEach(d => {
        cellsHtml += `<div style="text-align:center;padding:4px;font-weight:bold;background:#f0f0f0;border-bottom:1px solid #ccc;font-size:11px;">${d}</div>`;
      });

      dias.forEach(dia => {
        if (!dia) {
          cellsHtml += `<div style="height:40px;"></div>`;
          return;
        }
        const turma = getTurmaSoproFimDeSemana(dia);
        const isFds = dia.getDay() === 0 || dia.getDay() === 6;
        const colors: Record<string, string> = { '1A': '#1d4ed8', '1B': '#15803d', '2A': '#d97706', '2B': '#7e22ce' };
        const bgColor = turma ? (colors[turma] || '#666') : 'transparent';

        cellsHtml += `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:40px;border-bottom:1px solid #eee;border-right:1px solid #eee;${isFds ? 'background:#f9f9f9;' : ''}">
            <span style="font-size:12px;">${dia.getDate()}</span>
            ${turma ? `<span style="font-size:9px;font-weight:bold;color:white;background:${bgColor};padding:1px 5px;border-radius:3px;margin-top:2px;">${turma}</span>` : (!isFds ? '<span style="font-size:8px;color:#ccc;">•</span>' : '')}
          </div>
        `;
      });

      mesesHtml += `
        <div style="border:1px solid #ccc;border-radius:6px;overflow:hidden;break-inside:avoid;">
          <div style="background:#15803d;color:white;font-weight:bold;text-align:center;padding:6px;font-size:13px;text-transform:uppercase;">
            ${MESES[m]} / ${ano}
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);">
            ${cellsHtml}
          </div>
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Escala SOPRO - ${ano}</title>
        <style>
          @media print { body { margin: 0; padding: 10mm; } }
          body { font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>
        <div style="text-align:center;margin-bottom:20px;border-bottom:3px solid #15803d;padding-bottom:15px;">
          <h1 style="margin:0;font-size:24px;">ESCALA FIM DE SEMANA - SOPRO</h1>
          <h2 style="margin:5px 0;font-size:20px;color:#15803d;">ANO ${ano}</h2>
          <div style="display:flex;justify-content:center;gap:15px;margin-top:8px;font-size:12px;">
            <span><strong style="background:#1d4ed8;color:white;padding:1px 8px;border-radius:3px;">1A</strong></span>
            <span><strong style="background:#15803d;color:white;padding:1px 8px;border-radius:3px;">1B</strong></span>
            <span><strong style="background:#d97706;color:white;padding:1px 8px;border-radius:3px;">2A</strong></span>
            <span><strong style="background:#7e22ce;color:white;padding:1px 8px;border-radius:3px;">2B</strong></span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
          ${mesesHtml}
        </div>
        <div style="text-align:center;margin-top:15px;font-size:11px;color:#888;">
          Gerado em ${new Date().toLocaleDateString('pt-BR')} • GLOBALPACK - Sopro
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [ano]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-6 w-6" />
            Escala Fim de Semana - Sopro
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setAno(a => a - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-bold text-xl min-w-[55px] text-center">{ano}</span>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setAno(a => a + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
              <SelectTrigger className="w-[140px] h-9 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">TODAS</SelectItem>
                {TURMAS_ESCALA_SOPRO.map(t => (
                  <SelectItem key={t} value={t}>TURMA {t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="default" size="sm" className="h-9 gap-1.5 font-semibold bg-green-700 hover:bg-green-800" onClick={handleImprimir}>
              <Printer className="h-4 w-4" />
              IMPRIMIR
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => compartilharWhatsApp()}>
              <Share2 className="mr-1 h-3.5 w-3.5" />
              WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={exportarExcel}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Excel
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-3 text-sm flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-blue-700" /> 1A
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-green-700" /> 1B
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-amber-600" /> 2A
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-purple-700" /> 2B
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block w-5 h-5 rounded bg-muted border" /> • = Seg-Sex (todos)
            </span>
          </div>
          <span className="text-lg font-bold text-green-700">
            {turmaFiltro === 'TODAS' ? 'TODAS AS TURMAS' : `TURMA ${turmaFiltro}`} • {ano}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 12 }, (_, m) => (
            <div key={m} className="relative group">
              <MesCalendarioSopro ano={ano} mes={m} turmaFiltro={turmaFiltro} />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-0.5 right-0.5 h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity bg-green-700/80 hover:bg-green-800 text-white"
                onClick={() => compartilharWhatsApp(m)}
                title="Enviar por WhatsApp"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

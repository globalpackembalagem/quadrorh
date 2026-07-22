import { useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Share2, ChevronLeft, ChevronRight, Calendar, Download, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
// xlsx-js-style loaded dynamically
import { getTrabalhaOuFolga } from '@/lib/escalaPanama';
import { loadXLSX } from '@/lib/xlsx';

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'SÃ¡b', 'Dom'];
const MESES = [
  'Janeiro', 'Fevereiro', 'MarÃ§o', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

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

function gerarTextoWhatsApp(ano: number, mes: number, turma: 'T1' | 'T2'): string {
  const dias = getDiasDoMes(ano, mes);
  const diasAbrev = ['seg', 'ter', 'qua', 'qui', 'sex', 'sÃ¡b', 'dom'];

  let texto = `ðŸ“… *ESCALA 12 HORAS - TURMA ${turma === 'T1' ? '1' : '2'}*\n`;
  texto += `*${MESES[mes].toUpperCase()} /${ano}*\n\n`;

  let semana: string[] = [];
  for (const dia of dias) {
    if (!dia) {
      semana.push('      ');
      continue;
    }
    const trabalha = getTrabalhaOuFolga(dia, turma);
    const d = dia.getDate().toString().padStart(2, '0');
    const ds = dia.getDay();
    const abrev = diasAbrev[ds === 0 ? 6 : ds - 1];
    const emoji = trabalha ? 'ðŸŸ¢' : 'ðŸ”´';
    semana.push(`${emoji}${d}(${abrev})`);

    if (semana.length === 7) {
      texto += semana.join(' ') + '\n';
      semana = [];
    }
  }
  if (semana.length > 0) {
    texto += semana.join(' ') + '\n';
  }

  texto += '\nðŸŸ¢ = Trabalha | ðŸ”´ = Folga';
  return texto;
}

interface MesCalendarioProps {
  ano: number;
  mes: number;
  turma: 'T1' | 'T2';
}

function MesCalendario({ ano, mes, turma }: MesCalendarioProps) {
  const dias = useMemo(() => getDiasDoMes(ano, mes), [ano, mes]);
  const hoje = new Date();
  const resumoMes = useMemo(() => {
    let trabalhando = 0;
    let folga = 0;

    dias.forEach((dia) => {
      if (!dia) return;
      if (getTrabalhaOuFolga(dia, turma)) trabalhando += 1;
      else folga += 1;
    });

    return { trabalhando, folga };
  }, [dias, turma]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-colors hover:border-blue-300">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="text-sm font-bold uppercase text-slate-900">
          {MESES[mes]} / {ano}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">T {resumoMes.trabalhando}</span>
          <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">F {resumoMes.folga}</span>
        </div>
      </div>
      <div className="grid grid-cols-7 text-sm">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="border-b border-slate-200 bg-slate-100 py-1.5 text-center text-[11px] font-bold uppercase text-slate-500">
            {d}
          </div>
        ))}
        {dias.map((dia, i) => {
          if (!dia) return <div key={`empty-${i}`} className="min-h-11 border-b border-r border-slate-100 bg-slate-50/70" />;

          const trabalha = getTrabalhaOuFolga(dia, turma);
          const isHoje = dia.toDateString() === hoje.toDateString();

          return (
            <div
              key={i}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center border-b border-r border-slate-100 bg-white",
                isHoje && "bg-blue-50 ring-1 ring-inset ring-blue-300"
              )}
            >
              <span className={cn(
                "text-xs font-semibold leading-none text-slate-700",
                isHoje && "text-blue-700"
              )}>
                {dia.getDate()}
              </span>
              <span
                className={cn(
                  "mt-1 inline-flex h-5 min-w-6 items-center justify-center rounded px-1.5 text-xs font-bold text-white",
                  trabalha ? "bg-emerald-600" : "bg-red-600"
                )}
              >
                {trabalha ? 'T' : 'F'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EscalaFolgaCalendario() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [turma, setTurma] = useState<'T1' | 'T2'>('T1');
  const printRef = useRef<HTMLDivElement>(null);

  const compartilharWhatsApp = (mes: number) => {
    const texto = gerarTextoWhatsApp(ano, mes, turma);
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const exportarExcel = async (ano: number, turma: 'T1' | 'T2') => {
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();
    const diasAbrev = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'SÃ¡b', 'Dom'];

    for (let m = 0; m < 12; m++) {
      const diasNoMes = new Date(ano, m + 1, 0).getDate();
      const rows: Record<string, string>[] = [];
      for (let d = 1; d <= diasNoMes; d++) {
        const date = new Date(ano, m, d);
        const trabalha = getTrabalhaOuFolga(date, turma);
        const diaSemana = date.getDay();
        rows.push({
          'Dia': String(d).padStart(2, '0'),
          'Dia Semana': diasAbrev[diaSemana === 0 ? 6 : diaSemana - 1],
          'Status': trabalha ? 'TRABALHA' : 'FOLGA',
        });
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, MESES[m].substring(0, 10));
    }

    const resumo = Array.from({ length: 12 }, (_, m) => {
      const diasNoMes = new Date(ano, m + 1, 0).getDate();
      let t = 0, f = 0;
      for (let d = 1; d <= diasNoMes; d++) {
        if (getTrabalhaOuFolga(new Date(ano, m, d), turma)) t++; else f++;
      }
      return { 'MÃªs': MESES[m], 'Dias Trabalho': t, 'Dias Folga': f };
    });
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    wsResumo['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    XLSX.writeFile(wb, `escala_turma_${turma === 'T1' ? '1' : '2'}_${ano}.xlsx`);
  };

  const compartilharAnoCompleto = () => {
    let texto = `ðŸ“… *ESCALA 12 HORAS - TURMA ${turma === 'T1' ? '1' : '2'} - ${ano}*\n\n`;
    texto += 'ðŸŸ¢ = Trabalha | ðŸ”´ = Folga\n\n';
    
    for (let m = 0; m < 12; m++) {
      const diasNoMes = new Date(ano, m + 1, 0).getDate();
      let tCount = 0;
      let fCount = 0;
      for (let d = 1; d <= diasNoMes; d++) {
        if (getTrabalhaOuFolga(new Date(ano, m, d), turma)) tCount++;
        else fCount++;
      }
      texto += `*${MESES[m]}*: ðŸŸ¢${tCount} dias | ðŸ”´${fCount} folgas\n`;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const handleImprimir = useCallback(() => {
    const turmaLabel = turma === 'T1' ? 'TURMA 1' : 'TURMA 2';
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build calendar HTML for each month
    let mesesHtml = '';
    for (let m = 0; m < 12; m++) {
      const dias = getDiasDoMes(ano, m);
      let cellsHtml = '';
      
      DIAS_SEMANA.forEach(d => {
        cellsHtml += `<div class="weekday">${d}</div>`;
      });

      dias.forEach((dia, i) => {
        if (!dia) {
          cellsHtml += `<div class="day empty"></div>`;
          return;
        }
        const trabalha = getTrabalhaOuFolga(dia, turma);
        cellsHtml += `
          <div class="day">
            <span class="num">${dia.getDate()}</span>
            <span class="badge ${trabalha ? 'work' : 'off'}">${trabalha ? 'T' : 'F'}</span>
          </div>
        `;
      });

      mesesHtml += `
        <section class="month">
          <div class="month-title">
            ${MESES[m]} / ${ano}
          </div>
          <div class="month-grid">
            ${cellsHtml}
          </div>
        </section>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Escala ${turmaLabel} - ${ano}</title>
	        <style>
	          @page { size: A4 landscape; margin: 6mm; }
	          @media print {
	            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	            .no-print { display: none !important; }
	          }
	          * { box-sizing: border-box; }
	          body { font-family: Inter, Arial, sans-serif; color: #0f172a; }
	          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 5px; margin-bottom: 6px; }
	          .title { margin: 0; font-size: 15px; font-weight: 800; text-transform: uppercase; }
	          .subtitle { margin: 2px 0 0; font-size: 11px; color: #475569; font-weight: 700; }
	          .legend { display: flex; gap: 10px; font-size: 10px; font-weight: 700; align-items: center; }
	          .legend-badge, .badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 3px; color: #fff; font-weight: 800; }
	          .legend-badge { width: 18px; height: 14px; margin-right: 3px; }
	          .work { background: #15803d; }
	          .off { background: #b91c1c; }
	          .year-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
	          .month { border: 1px solid #cbd5e1; border-radius: 5px; overflow: hidden; break-inside: avoid; }
	          .month-title { background: #f59e0b; color: #111827; font-weight: 800; text-align: center; padding: 3px; font-size: 10px; text-transform: uppercase; }
	          .month-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
	          .weekday { text-align: center; padding: 2px 1px; font-weight: 800; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-size: 8px; color: #475569; }
	          .day { min-height: 19px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; gap: 3px; }
	          .day:nth-child(7n) { border-right: 0; }
	          .empty { background: #f8fafc; }
	          .num { font-size: 8px; min-width: 8px; text-align: right; }
	          .badge { width: 15px; height: 11px; font-size: 8px; line-height: 1; }
	          .footer { text-align: right; margin-top: 4px; font-size: 8px; color: #64748b; }
	        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">ESCALA 12 HORAS - DECORACAO</h1>
            <p class="subtitle">${turmaLabel} - ${ano}</p>
          </div>
          <div class="legend">
            <span><span class="legend-badge work">T</span>TRABALHA</span>
            <span><span class="legend-badge off">F</span>FOLGA</span>
          </div>
        </div>
        <div class="year-grid">
          ${mesesHtml}
        </div>
        <div class="footer">
          Gerado em ${new Date().toLocaleDateString('pt-BR')} - GLOBALPACK
        </div>        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [ano, turma]);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-200 bg-slate-50/70 pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <Calendar className="h-5 w-5 text-blue-600" />
              Escala 12 Horas - Decoracao
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Calendario anual da turma com dias de trabalho e folga.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setAno(a => a - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[58px] text-center text-lg font-extrabold text-slate-900">{ano}</span>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setAno(a => a + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Select value={turma} onValueChange={(v) => setTurma(v as 'T1' | 'T2')}>
              <SelectTrigger className="h-10 w-[130px] bg-white font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="T1">TURMA 1</SelectItem>
                <SelectItem value="T2">TURMA 2</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="default" size="sm" className="h-10 gap-1.5 font-semibold" onClick={handleImprimir}>
              <Printer className="h-4 w-4" />
              IMPRIMIR
            </Button>
            <Button variant="outline" size="sm" className="h-10 bg-white" onClick={compartilharAnoCompleto}>
              <Share2 className="mr-1 h-3.5 w-3.5" />
              Resumo WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="h-10 bg-white" onClick={() => exportarExcel(ano, turma)}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Excel
            </Button>
          </div>
        </div>
        <div className="mt-1 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3 text-sm font-semibold text-slate-700">
            <span className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
              <span className="inline-block h-3 w-3 rounded bg-emerald-600" /> T = Trabalha
            </span>
            <span className="flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-red-700">
              <span className="inline-block h-3 w-3 rounded bg-red-600" /> F = Folga
            </span>
          </div>
          <span className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-extrabold uppercase text-blue-700">
            {turma === 'T1' ? 'Turma 1' : 'Turma 2'} - {ano}
          </span>
        </div>
      </CardHeader>
      <CardContent ref={printRef} className="pt-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {Array.from({ length: 12 }, (_, m) => (
            <div key={m} className="relative group">
              <MesCalendario ano={ano} mes={m} turma={turma} />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-7 px-2 opacity-0 transition-opacity group-hover:opacity-100 bg-white/90 hover:bg-white"
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



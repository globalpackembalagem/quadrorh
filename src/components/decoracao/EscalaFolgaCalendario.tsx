import { useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Share2, ChevronLeft, ChevronRight, Calendar, Download, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
// xlsx-js-style loaded dynamically
import { getTrabalhaOuFolga } from '@/lib/escalaPanama';

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
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
  const diasAbrev = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

  let texto = `📅 *ESCALA 12 HORAS - TURMA ${turma === 'T1' ? '1' : '2'}*\n`;
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
    const emoji = trabalha ? '🟢' : '🔴';
    semana.push(`${emoji}${d}(${abrev})`);

    if (semana.length === 7) {
      texto += semana.join(' ') + '\n';
      semana = [];
    }
  }
  if (semana.length > 0) {
    texto += semana.join(' ') + '\n';
  }

  texto += '\n🟢 = Trabalha | 🔴 = Folga';
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

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="bg-amber-500 text-black font-bold text-center py-2.5 text-base uppercase">
        {MESES[mes]} / {ano}
      </div>
      <div className="grid grid-cols-7 text-sm">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center py-2 font-semibold bg-muted/50 border-b text-muted-foreground">
            {d}
          </div>
        ))}
        {dias.map((dia, i) => {
          if (!dia) return <div key={`empty-${i}`} className="h-14" />;

          const trabalha = getTrabalhaOuFolga(dia, turma);
          const isHoje = dia.toDateString() === hoje.toDateString();

          return (
            <div
              key={i}
              className="flex flex-col items-center justify-center h-14 border-b border-r"
            >
              <span className={cn(
                "text-sm leading-none",
                isHoje && "font-bold underline"
              )}>
                {dia.getDate()}
              </span>
              <span
                className={cn(
                  "text-xs font-bold mt-1 px-2.5 py-0.5 rounded",
                  trabalha ? "bg-green-700 text-white" : "bg-red-700 text-white"
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
    const XLSX = await import('xlsx-js-style');
    const wb = XLSX.utils.book_new();
    const diasAbrev = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

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
      return { 'Mês': MESES[m], 'Dias Trabalho': t, 'Dias Folga': f };
    });
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    wsResumo['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    XLSX.writeFile(wb, `escala_turma_${turma === 'T1' ? '1' : '2'}_${ano}.xlsx`);
  };

  const compartilharAnoCompleto = () => {
    let texto = `📅 *ESCALA 12 HORAS - TURMA ${turma === 'T1' ? '1' : '2'} - ${ano}*\n\n`;
    texto += '🟢 = Trabalha | 🔴 = Folga\n\n';
    
    for (let m = 0; m < 12; m++) {
      const diasNoMes = new Date(ano, m + 1, 0).getDate();
      let tCount = 0;
      let fCount = 0;
      for (let d = 1; d <= diasNoMes; d++) {
        if (getTrabalhaOuFolga(new Date(ano, m, d), turma)) tCount++;
        else fCount++;
      }
      texto += `*${MESES[m]}*: 🟢${tCount} dias | 🔴${fCount} folgas\n`;
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
      
      // Header row
      DIAS_SEMANA.forEach(d => {
        cellsHtml += `<div style="text-align:center;padding:4px;font-weight:bold;background:#f0f0f0;border-bottom:1px solid #ccc;font-size:11px;">${d}</div>`;
      });

      dias.forEach((dia, i) => {
        if (!dia) {
          cellsHtml += `<div style="height:40px;"></div>`;
          return;
        }
        const trabalha = getTrabalhaOuFolga(dia, turma);
        const bgColor = trabalha ? '#15803d' : '#b91c1c';
        cellsHtml += `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:40px;border-bottom:1px solid #eee;border-right:1px solid #eee;">
            <span style="font-size:12px;">${dia.getDate()}</span>
            <span style="font-size:10px;font-weight:bold;color:white;background:${bgColor};padding:1px 6px;border-radius:3px;margin-top:2px;">${trabalha ? 'T' : 'F'}</span>
          </div>
        `;
      });

      mesesHtml += `
        <div style="border:1px solid #ccc;border-radius:6px;overflow:hidden;break-inside:avoid;">
          <div style="background:#f59e0b;color:black;font-weight:bold;text-align:center;padding:6px;font-size:13px;text-transform:uppercase;">
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
        <title>Escala ${turmaLabel} - ${ano}</title>
        <style>
          @media print {
            body { margin: 0; padding: 10mm; }
            .no-print { display: none !important; }
          }
          body { font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>
        <div style="text-align:center;margin-bottom:20px;border-bottom:3px solid #f59e0b;padding-bottom:15px;">
          <h1 style="margin:0;font-size:24px;">ESCALA 12 HORAS - DECORAÇÃO</h1>
          <h2 style="margin:5px 0;font-size:20px;color:#f59e0b;">${turmaLabel} - ANO ${ano}</h2>
          <div style="display:flex;justify-content:center;gap:20px;margin-top:8px;font-size:13px;">
            <span>🟢 <strong style="background:#15803d;color:white;padding:1px 8px;border-radius:3px;">T</strong> = Trabalha</span>
            <span>🔴 <strong style="background:#b91c1c;color:white;padding:1px 8px;border-radius:3px;">F</strong> = Folga</span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
          ${mesesHtml}
        </div>
        <div style="text-align:center;margin-top:15px;font-size:11px;color:#888;">
          Gerado em ${new Date().toLocaleDateString('pt-BR')} • GLOBALPACK - Decoração
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [ano, turma]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-6 w-6" />
            Escala 12 Horas - Decoração
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
            <Select value={turma} onValueChange={(v) => setTurma(v as 'T1' | 'T2')}>
              <SelectTrigger className="w-[130px] h-9 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="T1">TURMA 1</SelectItem>
                <SelectItem value="T2">TURMA 2</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="default" size="sm" className="h-9 gap-1.5 font-semibold" onClick={handleImprimir}>
              <Printer className="h-4 w-4" />
              IMPRIMIR
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={compartilharAnoCompleto}>
              <Share2 className="mr-1 h-3.5 w-3.5" />
              Resumo WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => exportarExcel(ano, turma)}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Excel
            </Button>
          </div>
        </div>
        {/* Cabeçalho turma */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-green-700" /> T = Trabalha
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-red-700" /> F = Folga
            </span>
          </div>
          <span className="text-lg font-bold text-amber-600">
            {turma === 'T1' ? 'TURMA 1' : 'TURMA 2'} • {ano}
          </span>
        </div>
      </CardHeader>
      <CardContent ref={printRef}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 12 }, (_, m) => (
            <div key={m} className="relative group">
              <MesCalendario ano={ano} mes={m} turma={turma} />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-0.5 right-0.5 h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500/80 hover:bg-amber-600 text-black"
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

import { useState, useMemo, useEffect } from 'react';
import { useFuncionariosNoQuadro } from '@/hooks/useFuncionarios';
import { useSetores } from '@/hooks/useSetores';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, CheckCircle2, XCircle, Users, RotateCcw } from 'lucide-react';

export default function ConferenciaGestor() {
  const { data: funcionarios = [], isLoading } = useFuncionariosNoQuadro();
  const { data: setores = [] } = useSetores();
  
  // Carregar conferidos do localStorage
  const [conferidos, setConferidos] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('conferencia-gestor-conferidos');
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });
  
  // Salvar conferidos no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('conferencia-gestor-conferidos', JSON.stringify(Array.from(conferidos)));
  }, [conferidos]);
  
  const [search, setSearch] = useState('');
  const [filtroSetor, setFiltroSetor] = useState<string | null>(null);
  const [filtroTurma, setFiltroTurma] = useState<string | null>(null);

  const isDecoracao = filtroSetor?.includes('DECORAÇÃO') || false;

  // Agrupamento de setores usando o campo 'grupo' do banco
  const gruposSetores = useMemo(() => {
    const grupoMap: Record<string, string[]> = {};

    setores.filter(s => s.ativo && s.conta_no_quadro).forEach(s => {
      const nome = s.nome.toUpperCase();
      if (nome.includes('SOPRO')) {
        const turma = nome.includes(' A') ? 'A' : nome.includes(' B') ? 'B' : nome.includes(' C') ? 'C' : null;
        if (turma) {
          const label = `SOPRO ${turma}`;
          if (!grupoMap[label]) grupoMap[label] = [];
          grupoMap[label].push(s.id);
        }
      } else if (nome.includes('DECORAÇÃO') || nome.includes('DECORACAO')) {
        // Agrupar todos os setores DIA (genérico + T1 + T2) juntos
        if (nome.includes('DIA')) {
          if (!grupoMap['DECORAÇÃO MOD DIA']) grupoMap['DECORAÇÃO MOD DIA'] = [];
          grupoMap['DECORAÇÃO MOD DIA'].push(s.id);
        }
        // Agrupar todos os setores NOITE (genérico + T1 + T2) juntos
        if (nome.includes('NOITE')) {
          if (!grupoMap['DECORAÇÃO MOD NOITE']) grupoMap['DECORAÇÃO MOD NOITE'] = [];
          grupoMap['DECORAÇÃO MOD NOITE'].push(s.id);
        }
      }
    });

    return Object.entries(grupoMap)
      .map(([label, ids]) => ({ label, ids }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [setores]);

  // Usar diretamente os funcionários do quadro (já filtrados por setor/situação que contam)
  const funcionariosVisiveis = useMemo(() => {
    return funcionarios;
  }, [funcionarios]);

  // Contar por grupo - sem filtro de turma, usa apenas o setor_id
  const contagemPorGrupo = useMemo(() => {
    const map: Record<string, number> = {};
    gruposSetores.forEach(g => {
      map[g.label] = funcionariosVisiveis.filter(f => g.ids.includes(f.setor_id)).length;
    });
    return map;
  }, [gruposSetores, funcionariosVisiveis]);

  // Aplicar filtros
  const funcionariosFiltrados = useMemo(() => {
    let result = funcionariosVisiveis;

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(f =>
        f.nome_completo.toLowerCase().includes(s) ||
        f.matricula?.toLowerCase().includes(s)
      );
    }

    if (filtroSetor) {
      const grupo = gruposSetores.find(g => g.label === filtroSetor);
      if (grupo) {
        result = result.filter(f => grupo.ids.includes(f.setor_id));
      }
    }

    if (filtroTurma) {
      result = result.filter(f => {
        const turma = f.turma?.toUpperCase() || '';
        return turma === filtroTurma || turma === filtroTurma.replace('T', '');
      });
    }

    return result.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
  }, [funcionariosVisiveis, search, filtroSetor, filtroTurma, gruposSetores]);

  const naoConferidos = funcionariosFiltrados.filter(f => !conferidos.has(f.id));
  const listaConferidos = funcionariosFiltrados.filter(f => conferidos.has(f.id));

  const toggleConferido = (id: string) => {
    setConferidos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetConferidos = () => {
    setConferidos(new Set());
    localStorage.removeItem('conferencia-gestor-conferidos');
  };

  const totalFiltrados = funcionariosFiltrados.length;
  const totalConferidos = listaConferidos.length;
  const totalNaoConferidos = naoConferidos.length;

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">CARREGANDO...</div>;
  }

  const renderTable = (lista: typeof funcionariosFiltrados, isConferido: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead className="w-24">MATRÍCULA</TableHead>
          <TableHead>NOME</TableHead>
          <TableHead>SETOR</TableHead>
          
        </TableRow>
      </TableHeader>
      <TableBody>
        {lista.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
              {isConferido ? 'NENHUM FUNCIONÁRIO CONFERIDO' : 'TODOS CONFERIDOS'}
            </TableCell>
          </TableRow>
        ) : (
          lista.map(f => (
            <TableRow key={f.id} className={isConferido ? 'bg-green-50 dark:bg-green-950/20' : ''}>
              <TableCell>
                <Checkbox
                  checked={conferidos.has(f.id)}
                  onCheckedChange={() => toggleConferido(f.id)}
                />
              </TableCell>
              <TableCell className="text-xs font-mono uppercase">{f.matricula || '-'}</TableCell>
              <TableCell className="text-xs font-medium uppercase">
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[180px]">{f.nome_completo}</span>
                  <Badge variant={
                    f.situacao?.nome?.toUpperCase() === 'ATIVO' ? 'default' :
                    f.situacao?.nome?.toUpperCase() === 'FÉRIAS' ? 'secondary' : 'outline'
                  } className="text-[9px] uppercase shrink-0">
                    {f.situacao?.nome || '-'}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-xs uppercase whitespace-nowrap">{f.setor?.nome || '-'}</TableCell>
              
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold uppercase">CONFERÊNCIA COM GESTOR</h1>
        <button
          onClick={resetConferidos}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          LIMPAR TUDO
        </button>
      </div>

      {/* Botões de setor fixos */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setFiltroSetor(null); setFiltroTurma(null); }}
          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            !filtroSetor ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          TODOS ({funcionariosVisiveis.length})
        </button>
        {gruposSetores.map(g => (
          <button
            key={g.label}
            onClick={() => { setFiltroSetor(filtroSetor === g.label ? null : g.label); setFiltroTurma(null); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              filtroSetor === g.label ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {g.label} ({contagemPorGrupo[g.label] || 0})
          </button>
        ))}
      </div>

      {/* Filtro de Turma para Decoração */}
      {isDecoracao && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">Turma:</span>
          <button
            onClick={() => setFiltroTurma(null)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              !filtroTurma ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            TODAS
          </button>
          {['T1', 'T2'].map(t => (
            <button
              key={t}
              onClick={() => setFiltroTurma(filtroTurma === t ? null : t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                filtroTurma === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Busca por nome */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="BUSCAR POR NOME OU MATRÍCULA..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 uppercase text-xs"
        />
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">TOTAL</p>
              <p className="text-lg font-bold">{totalFiltrados}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">CONFERIDOS</p>
              <p className="text-lg font-bold text-green-600">{totalConferidos}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-3 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">NÃO CONFERIDOS</p>
              <p className="text-lg font-bold text-red-600">{totalNaoConferidos}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas NÃO CONFERIDOS / CONFERIDOS */}
      <Tabs defaultValue="nao-conferidos">
        <TabsList>
          <TabsTrigger value="nao-conferidos" className="text-xs uppercase">
            <XCircle className="h-3.5 w-3.5 mr-1.5 text-red-600" />
            NÃO CONFERIDOS ({totalNaoConferidos})
          </TabsTrigger>
          <TabsTrigger value="conferidos" className="text-xs uppercase">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600" />
            CONFERIDOS ({totalConferidos})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="nao-conferidos">
          <Card>
            <CardContent className="p-0">
              {renderTable(naoConferidos, false)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="conferidos">
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-0">
              {renderTable(listaConferidos, true)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

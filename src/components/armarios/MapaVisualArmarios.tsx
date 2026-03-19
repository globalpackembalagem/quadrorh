import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ArmarioData {
  numero: number;
  funcionario_id: string | null;
  nome_completo: string | null;
  setor_nome: string | null;
  local: string | null;
  bloqueado?: boolean;
  quebrado?: boolean;
}

interface MapaVisualArmariosProps {
  armarios: ArmarioData[];
  totalArmarios: number;
  onEditar?: (armario: ArmarioData) => void;
  localFixo?: string | null;
  onBloquear?: (numero: number, local: string, bloquear: boolean) => void;
  onQuebrar?: (numero: number, local: string, quebrar: boolean) => void;
  canEdit?: boolean;
}

const LOCAIS_MAPA = [
  { value: 'SOPRO', label: 'Sopro' },
  { value: 'DECORACAO', label: 'Decoração' },
  { value: 'CONTAINER', label: 'Container' },
];

export default function MapaVisualArmarios({ armarios, totalArmarios, onEditar, localFixo, onBloquear, onQuebrar, canEdit }: MapaVisualArmariosProps) {
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<ArmarioData | null>(null);
  const [localSelecionado, setLocalSelecionado] = useState(localFixo || 'SOPRO');

  // Buscar configuração de capacidade do banco
  const { data: configLocais = [] } = useQuery({
    queryKey: ['armarios-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('armarios_config').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // Locais disponíveis (se localFixo, só mostra esse)
  const locaisDisponiveis = useMemo(() => {
    if (localFixo) return LOCAIS_MAPA.filter(l => l.value === localFixo);
    return LOCAIS_MAPA;
  }, [localFixo]);

  // Filtrar armários pelo local selecionado
  const armariosFiltrados = useMemo(() => {
    return armarios.filter(a => a.local === localSelecionado);
  }, [armarios, localSelecionado]);

  const armarioMap = useMemo(() => {
    const map = new Map<number, ArmarioData>();
    armariosFiltrados.forEach(a => map.set(a.numero, a));
    return map;
  }, [armariosFiltrados]);

  // Total por local do banco de dados
  const maxNumero = useMemo(() => {
    const config = configLocais.find((c: any) => c.local === localSelecionado);
    if (config) return (config as any).total;
    const defaults: Record<string, number> = { SOPRO: 400, DECORACAO: 100, CONTAINER: 50 };
    return defaults[localSelecionado] || 100;
  }, [localSelecionado, configLocais]);

  // Blocos de 4 armários
  const blocos = useMemo(() => {
    const result: { inicio: number; nums: number[] }[] = [];
    for (let i = 0; i < maxNumero; i += 4) {
      const nums: number[] = [];
      for (let r = 0; r < 4; r++) nums.push(i + r + 1);
      result.push({ inicio: i + 1, nums });
    }
    return result;
  }, [maxNumero]);

  const buscaLower = busca.toLowerCase();
  const matchNumbers = useMemo(() => {
    if (!busca) return null;
    const matches = new Set<number>();
    armariosFiltrados.forEach(a => {
      if (
        a.numero.toString().includes(busca) ||
        a.nome_completo?.toLowerCase().includes(buscaLower) ||
        a.setor_nome?.toLowerCase().includes(buscaLower)
      ) matches.add(a.numero);
    });
    for (let n = 1; n <= maxNumero; n++) {
      if (n.toString().includes(busca) && !armarioMap.has(n)) matches.add(n);
    }
    return matches;
  }, [busca, buscaLower, armariosFiltrados, armarioMap, maxNumero]);

  const getInfo = (num: number) => armarioMap.get(num) || null;
  const isOcupado = (num: number) => {
    const info = getInfo(num);
    return info?.funcionario_id != null || info?.nome_completo != null;
  };
  const isBloqueado = (num: number) => {
    const info = getInfo(num);
    return info?.bloqueado === true;
  };
  const isQuebrado = (num: number) => {
    const info = getInfo(num);
    return info?.quebrado === true;
  };
  const isHighlighted = (num: number) => !matchNumbers || matchNumbers.has(num);

  const ocupados = armariosFiltrados.filter(a => a.funcionario_id && !a.bloqueado && !a.quebrado).length;
  const bloqueados = armariosFiltrados.filter(a => a.bloqueado).length;
  const quebrados = armariosFiltrados.filter(a => a.quebrado).length;
  const livres = maxNumero - ocupados - bloqueados - quebrados;

  const handleClick = (num: number) => {
    const info = getInfo(num);
    if (info?.bloqueado || info?.quebrado) {
      setSelecionado(info);
    } else if (info && (info.funcionario_id || info.nome_completo)) {
      setSelecionado(info);
    } else if (onEditar) {
      onEditar({ numero: num, funcionario_id: null, nome_completo: null, setor_nome: null, local: localSelecionado });
    }
  };

  const localLabel = (local: string) => LOCAIS_MAPA.find(l => l.value === local)?.label || local;

  return (
    <div className="space-y-4">
      {/* Seletor de Local */}
      <div className="flex gap-2 flex-wrap items-center">
        {locaisDisponiveis.map(l => (
          <Button
            key={l.value}
            variant={localSelecionado === l.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLocalSelecionado(l.value)}
            className="rounded-full px-5"
          >
            {l.label}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex gap-3 items-center flex-wrap">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {localLabel(localSelecionado)}: {maxNumero} armários
        </Badge>
        <Badge className="text-sm px-3 py-1 bg-destructive/90 hover:bg-destructive">
          Ocupados: {ocupados}
        </Badge>
        <Badge className="text-sm px-3 py-1 bg-emerald-500/90 hover:bg-emerald-500 text-white">
          Livres: {livres}
        </Badge>
        {bloqueados > 0 && (
          <Badge className="text-sm px-3 py-1 bg-amber-500/90 hover:bg-amber-500 text-white">
            Bloqueados: {bloqueados}
          </Badge>
        )}
        {quebrados > 0 && (
          <Badge className="text-sm px-3 py-1 bg-red-700/90 hover:bg-red-700 text-white">
            Quebrados: {quebrados}
          </Badge>
        )}
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número, nome ou setor..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Legenda */}
      <div className="flex gap-4 text-xs items-center">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/50" />
          <span className="text-muted-foreground">Livre</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive/50" />
          <span className="text-muted-foreground">Ocupado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/50" />
          <span className="text-muted-foreground">Não utilizar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-700/20 border border-red-700/50" />
          <span className="text-muted-foreground">Quebrado</span>
        </div>
      </div>

      {/* Grid de Blocos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {blocos.map((bloco) => (
          <div key={bloco.inicio} className="border rounded-lg p-2 bg-card shadow-sm">
            <div className="text-[10px] text-muted-foreground text-center mb-1.5 font-medium">
              {bloco.inicio} – {bloco.inicio + 3}
            </div>
            <div className="space-y-1.5">
              {bloco.nums.map((num) => {
                const ocupado = isOcupado(num);
                const bloqueadoNum = isBloqueado(num);
                const quebradoNum = isQuebrado(num);
                const info = getInfo(num);
                const highlighted = isHighlighted(num);
                const nome = info?.nome_completo || '';
                const setor = info?.setor_nome || '';

                return (
                  <button
                    key={num}
                    onClick={() => handleClick(num)}
                    className={`
                      w-full relative rounded-md px-3 py-3 text-center transition-all border cursor-pointer min-h-[72px] flex items-center justify-center
                      ${!highlighted ? 'opacity-20' : ''}
                      ${quebradoNum
                        ? 'bg-red-700/20 border-red-700/60 hover:bg-red-700/30'
                        : bloqueadoNum
                          ? 'bg-amber-500/20 border-amber-500/60 hover:bg-amber-500/30'
                          : ocupado
                            ? 'bg-destructive/20 border-destructive/60 hover:bg-destructive/30'
                            : 'bg-emerald-600/15 border-emerald-600/50 hover:bg-emerald-600/25'
                      }
                    `}
                    title={quebradoNum ? `${num} - QUEBRADO` : bloqueadoNum ? `${num} - Não utilizar` : ocupado ? `${num} - ${nome} (${setor})` : `${num} - Livre`}
                  >
                    {quebradoNum ? (
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-red-700 dark:text-red-400">#{num}</span>
                        <div className="text-[10px] leading-snug font-medium text-red-700 dark:text-red-400">🔧 QUEBRADO</div>
                      </div>
                    ) : bloqueadoNum ? (
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">#{num}</span>
                        <div className="text-[10px] leading-snug font-medium text-amber-700 dark:text-amber-400">🚫 Não utilizar</div>
                      </div>
                    ) : ocupado ? (
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-destructive">#{num}</span>
                        <div className="text-[11px] leading-snug font-medium text-foreground break-words">{nome}</div>
                        {setor && <div className="text-[10px] leading-snug text-muted-foreground break-words">{setor}</div>}
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">#{num}</span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 ml-1">Livre</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Dialog detalhes */}
      <Dialog open={!!selecionado} onOpenChange={() => setSelecionado(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Armário nº {selecionado?.numero} — {localLabel(selecionado?.local || '')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {selecionado?.quebrado ? (
              <div className="p-3 rounded-md bg-red-700/10 border border-red-700/30 text-red-700 dark:text-red-400 text-center font-medium">
                🔧 Este armário está marcado como "QUEBRADO"
              </div>
            ) : selecionado?.bloqueado ? (
              <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-center font-medium">
                🚫 Este armário está marcado como "Não utilizar"
              </div>
            ) : (
              <>
                <div>
                  <span className="text-muted-foreground">Funcionária:</span>{' '}
                  <span className="font-medium">{selecionado?.nome_completo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Setor:</span>{' '}
                  <span>{selecionado?.setor_nome || '—'}</span>
                </div>
              </>
            )}
            <div>
              <span className="text-muted-foreground">Local:</span>{' '}
              <Badge variant="outline" className="text-xs ml-1">{localLabel(selecionado?.local || '')}</Badge>
            </div>
            {onEditar && !selecionado?.bloqueado && !selecionado?.quebrado && (
              <button
                onClick={() => { if (selecionado) { onEditar(selecionado); setSelecionado(null); } }}
                className="w-full mt-2 text-sm font-medium py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                ✏️ Editar Armário
              </button>
            )}
            {canEdit && onBloquear && selecionado?.bloqueado && (
              <button
                onClick={() => { 
                  if (selecionado) { 
                    onBloquear(selecionado.numero, selecionado.local || localSelecionado, false); 
                    setSelecionado(null); 
                  } 
                }}
                className="w-full mt-2 text-sm font-medium py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                ✅ Liberar Armário
              </button>
            )}
            {canEdit && onQuebrar && selecionado?.quebrado && (
              <button
                onClick={() => { 
                  if (selecionado) { 
                    onQuebrar(selecionado.numero, selecionado.local || localSelecionado, false); 
                    setSelecionado(null); 
                  } 
                }}
                className="w-full mt-2 text-sm font-medium py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                ✅ Restaurar Armário
              </button>
            )}
            {canEdit && !selecionado?.bloqueado && !selecionado?.quebrado && !selecionado?.funcionario_id && !selecionado?.nome_completo && (
              <>
                {onBloquear && (
                  <button
                    onClick={() => { 
                      if (selecionado) { 
                        onBloquear(selecionado.numero, selecionado.local || localSelecionado, true); 
                        setSelecionado(null); 
                      } 
                    }}
                    className="w-full mt-1 text-sm font-medium py-2 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                  >
                    🚫 Não Utilizar
                  </button>
                )}
                {onQuebrar && (
                  <button
                    onClick={() => { 
                      if (selecionado) { 
                        onQuebrar(selecionado.numero, selecionado.local || localSelecionado, true); 
                        setSelecionado(null); 
                      } 
                    }}
                    className="w-full mt-1 text-sm font-medium py-2 rounded-md bg-red-700 text-white hover:bg-red-800 transition-colors"
                  >
                    🔧 Marcar como QUEBRADO
                  </button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

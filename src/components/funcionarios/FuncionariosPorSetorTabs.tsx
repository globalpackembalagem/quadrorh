import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Funcionario, Setor } from '@/types/database';

interface FuncionariosPorSetorTabsProps {
  funcionarios: Funcionario[];
  setores: Setor[];
}

export function FuncionariosPorSetorTabs({ funcionarios, setores }: FuncionariosPorSetorTabsProps) {
  // Agrupar funcionários por setor
  const funcionariosPorSetor = useMemo(() => {
    const grouped: Record<string, Funcionario[]> = {};
    
    setores.forEach(setor => {
      grouped[setor.id] = funcionarios.filter(f => f.setor_id === setor.id);
    });
    
    return grouped;
  }, [funcionarios, setores]);

  // Setores que devem aparecer nas abas (apenas os que contam no quadro)
  const setoresAtivos = useMemo(() => {
    return setores.filter(s => s.conta_no_quadro && s.ativo);
  }, [setores]);

  if (setoresAtivos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum setor configurado para o quadro</p>
      </div>
    );
  }

  const defaultTab = setoresAtivos[0]?.id || '';

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
        {setoresAtivos.map(setor => {
          const count = funcionariosPorSetor[setor.id]?.length || 0;
          return (
            <TabsTrigger 
              key={setor.id} 
              value={setor.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {setor.nome}
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {count}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {setoresAtivos.map(setor => {
        const funcs = funcionariosPorSetor[setor.id] || [];
        const ativos = funcs.filter(f => f.situacao?.nome === 'Ativo');
        const ferias = funcs.filter(f => f.situacao?.nome === 'Férias');

        return (
          <TabsContent key={setor.id} value={setor.id} className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Card Ativos */}
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-primary"></span>
                    Ativos
                  </h3>
                  <Badge variant="default">{ativos.length}</Badge>
                </div>
                {ativos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum funcionário ativo</p>
                ) : (
                  <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                    {ativos.map(func => (
                      <li 
                        key={func.id} 
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
                      >
                        <span className="text-sm">{func.nome_completo}</span>
                        <Badge variant="outline" className="text-xs">
                          {func.sexo === 'masculino' ? 'M' : 'F'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Card Férias */}
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-secondary"></span>
                    Férias
                  </h3>
                  <Badge variant="secondary">{ferias.length}</Badge>
                </div>
                {ferias.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum funcionário de férias</p>
                ) : (
                  <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                    {ferias.map(func => (
                      <li 
                        key={func.id} 
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
                      >
                        <span className="text-sm">{func.nome_completo}</span>
                        <Badge variant="outline" className="text-xs">
                          {func.sexo === 'masculino' ? 'M' : 'F'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Resumo */}
            <div className="mt-4 p-3 rounded-lg bg-muted/30 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total no quadro:</span>
              <span className="font-semibold">{funcs.length} funcionários</span>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

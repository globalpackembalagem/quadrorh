import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Download, UserPlus, LayoutGrid, Settings, UserX, UserMinus, Pencil, Trash2, HardHat, Plus, X } from 'lucide-react';
import ManualArmariosPDF from '@/components/armarios/ManualArmariosPDF';
import MapaVisualArmarios from '@/components/armarios/MapaVisualArmarios';
// xlsx-js-style loaded dynamically
import { useAuth } from '@/hooks/useAuth';
import { useUsuario } from '@/contexts/UserContext';

const LOCAIS = [
  { value: 'SOPRO', label: 'Sopro' },
  { value: 'DECORACAO', label: 'Decoração' },
  { value: 'CONTAINER', label: 'Container' },
];

// Filtros com agrupamento por turma/período
const FILTROS_GRUPO = [
  { label: 'Todos', value: 'todos' },
  { label: 'Sopro A', value: 'sopro_a' },
  { label: 'Sopro B', value: 'sopro_b' },
  { label: 'Sopro C', value: 'sopro_c' },
  { label: 'Decoração Dia', value: 'deco_dia' },
  { label: 'Decoração Noite', value: 'deco_noite' },
  { label: 'Outros', value: 'outros' },
];

/** Classifica o setor em um dos grupos de filtro */
const classificarSetor = (setorNome: string): string => {
  const nome = setorNome.toUpperCase().trim();
  if (/^MOD\s*[-–]\s*SOPRO\s+A$/i.test(nome) || /^PRODU.*SOPRO\s+G\+P\s+A$/i.test(nome)) return 'sopro_a';
  if (/^MOD\s*[-–]\s*SOPRO\s+B$/i.test(nome) || /^PRODU.*SOPRO\s+G\+P\s+B$/i.test(nome)) return 'sopro_b';
  if (/^MOD\s*[-–]\s*SOPRO\s+C$/i.test(nome) || /^PRODU.*SOPRO\s+G\+P\s+C$/i.test(nome)) return 'sopro_c';
  if (/^DECORA.*MOD\s+DIA/i.test(nome)) return 'deco_dia';
  if (/^DECORA.*MOD\s+NOITE/i.test(nome)) return 'deco_noite';
  return 'outros';
};

const matchGrupoFiltro = (setorNome: string, filtros: string[]) => {
  if (filtros.includes('todos')) return true;
  const grupo = classificarSetor(setorNome);
  return filtros.includes(grupo);
};

/** Detectar local padrão baseado no setor */
const detectarLocalPadrao = (setorNome: string | undefined | null): string => {
  if (!setorNome) return 'SOPRO';
  const nome = setorNome.toUpperCase();
  if (nome.includes('DECORAÇÃO') || nome.includes('DECORACAO')) return 'DECORACAO';
  return 'SOPRO';
};

const localLabel = (local: string) => {
  return LOCAIS.find(l => l.value === local)?.label || local;
};

// Usuários com acesso total a todos os setores nos armários
const USUARIOS_ACESSO_TOTAL_ARMARIOS = ['KARINA', 'SONIA', 'GILMARA', 'ELIANE'];

export default function ArmariosFemininos() {
  const { isAdmin, isRHMode } = useAuth();
  const { usuarioAtual } = useUsuario();
  const nomeUpper = (usuarioAtual.nome || '').toUpperCase().trim();
  const temAcessoTotalArmarios = isAdmin || USUARIOS_ACESSO_TOTAL_ARMARIOS.some(n => nomeUpper.includes(n));
  const isGestor = isRHMode && !isAdmin && !temAcessoTotalArmarios && usuarioAtual.setoresIds.length > 0;
  const gestorSetoresIds = usuarioAtual.setoresIds;

  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [filtrosAtivos, setFiltrosAtivos] = useState<string[]>(['todos']);
  const [filtroLocal, setFiltroLocal] = useState<string>('todos');
  const [filtroVazio, setFiltroVazio] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [numeroArmario, setNumeroArmario] = useState('');
  const [localArmario, setLocalArmario] = useState('SOPRO');
  const [editandoSetor, setEditandoSetor] = useState('');
  const [cadastroDialog, setCadastroDialog] = useState(false);
  const [cadastroFuncionarioId, setCadastroFuncionarioId] = useState('');
  const [cadastroNumero, setCadastroNumero] = useState('');
  const [cadastroLocal, setCadastroLocal] = useState('SOPRO');
  const [cadastroSetorId, setCadastroSetorId] = useState('');
  const [buscaCadastro, setBuscaCadastro] = useState('');
  const [cadastroTipo, setCadastroTipo] = useState<'funcionaria' | 'prestador'>('funcionaria');
  const [buscaSemArmario, setBuscaSemArmario] = useState('');
  const [filtrosSemArmario, setFiltrosSemArmario] = useState<string[]>(['todos']);
  const [buscaPrestador, setBuscaPrestador] = useState('');
  const [filtroSetorPrestador, setFiltroSetorPrestador] = useState<string>('todos');
  const [filtroLocalPrestador, setFiltroLocalPrestador] = useState<string>('todos');

  const [configDialog, setConfigDialog] = useState(false);
  const [configTab, setConfigTab] = useState<'totais' | 'setores'>('totais');
  const [configValues, setConfigValues] = useState<Record<string, number>>({});
  const [novoSetorPrestador, setNovoSetorPrestador] = useState('');

  // Prestador dialog
  const [prestadorDialog, setPrestadorDialog] = useState(false);
  const [prestadorNome, setPrestadorNome] = useState('');
  const [prestadorSetor, setPrestadorSetor] = useState('');
  const [prestadorNumero, setPrestadorNumero] = useState('');
  const [prestadorLocal, setPrestadorLocal] = useState('SOPRO');
  const [prestadorMatricula, setPrestadorMatricula] = useState('');

  // Edit prestador
  const [editandoPrestador, setEditandoPrestador] = useState<any | null>(null);

  // Buscar configuração de capacidade
  const { data: configLocais = [] } = useQuery({
    queryKey: ['armarios-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('armarios_config').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar setores de prestador
  const { data: setoresPrestador = [] } = useQuery({
    queryKey: ['armarios-setores-prestador'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('armarios_setores_prestador')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation para salvar config
  const salvarConfigMutation = useMutation({
    mutationFn: async (values: Record<string, number>) => {
      for (const [local, total] of Object.entries(values)) {
        const { error } = await supabase
          .from('armarios_config')
          .update({ total })
          .eq('local', local);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['armarios-config'] });
      toast.success('Configuração de armários salva!');
      setConfigDialog(false);
    },
    onError: () => toast.error('Erro ao salvar configuração'),
  });

  // Mutation para adicionar setor prestador
  const addSetorPrestadorMutation = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from('armarios_setores_prestador').insert({ nome: nome.toUpperCase().trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['armarios-setores-prestador'] });
      setNovoSetorPrestador('');
      toast.success('Setor de prestador cadastrado!');
    },
    onError: () => toast.error('Erro ao cadastrar setor (pode já existir)'),
  });

  // Mutation para remover setor prestador
  const removeSetorPrestadorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('armarios_setores_prestador').update({ ativo: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['armarios-setores-prestador'] });
      toast.success('Setor removido!');
    },
  });

  // Buscar funcionárias femininas - TODAS (incluindo demissão para aba especial)
  const { data: funcionarias = [], isLoading } = useQuery({
    queryKey: ['armarios-funcionarias-todas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('id, matricula, nome_completo, setor_id, data_admissao, setor:setores!funcionarios_setor_id_fkey(nome), situacao:situacoes!funcionarios_situacao_id_fkey(nome)')
        .eq('sexo', 'feminino')
        .order('nome_completo');
      if (error) throw error;

      const { data: armarios } = await supabase
        .from('armarios_femininos')
        .select('id, numero, funcionario_id, local, nome_prestador, setor_prestador, matricula');

      const armarioMap = new Map<string, { id: string; numero: number; local: string }>();
      (armarios || []).forEach(a => {
        if (a.funcionario_id) {
          armarioMap.set(a.funcionario_id, { id: a.id, numero: a.numero, local: a.local || 'SOPRO' });
        }
      });

      return (data as any[]).map(f => {
        const sitNome = (f.situacao?.nome || '').toUpperCase();
        const isDemissao = sitNome.includes('DEMISSÃO') || sitNome.includes('DEMISSAO') 
          || sitNome.includes('TÉRMINO') || sitNome.includes('TERMINO')
          || sitNome.includes('PED. DEMISSÃO');
        return {
          ...f,
          armario_id: armarioMap.get(f.id)?.id || null,
          armario_numero: armarioMap.get(f.id)?.numero || null,
          armario_local: armarioMap.get(f.id)?.local || null,
          isDemissao,
        };
      });
    },
  });

  // Buscar prestadores com armário
  const { data: prestadoresComArmario = [] } = useQuery({
    queryKey: ['armarios-prestadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('armarios_femininos')
        .select('id, numero, local, nome_prestador, setor_prestador, matricula')
        .not('nome_prestador', 'is', null)
        .order('numero');
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar armários bloqueados
  const { data: armariosBloqueados = [] } = useQuery({
    queryKey: ['armarios-bloqueados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('armarios_femininos')
        .select('id, numero, local, bloqueado')
        .eq('bloqueado', true)
        .order('numero');
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar todos os armários para o mapa visual
  const { data: armariosParaMapa = [] } = useQuery({
    queryKey: ['armarios-mapa-visual'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('armarios_femininos')
        .select('numero, funcionario_id, local, bloqueado, quebrado, nome_prestador, setor_prestador, funcionario:funcionarios!armarios_femininos_funcionario_id_fkey(nome_completo, setor:setores!funcionarios_setor_id_fkey(nome))');
      if (error) throw error;
      return (data || []).map((a: any) => ({
        numero: a.numero,
        funcionario_id: a.funcionario_id,
        nome_completo: a.funcionario?.nome_completo || a.nome_prestador || null,
        setor_nome: a.funcionario?.setor?.nome || a.setor_prestador || null,
        local: a.local,
        bloqueado: a.bloqueado || false,
        quebrado: a.quebrado || false,
      }));
    },
  });

  // Buscar todos os setores para o select
  const { data: todosSetores = [] } = useQuery({
    queryKey: ['todos-setores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  // Determinar local fixo para gestores baseado nos setores
  // Usuários com acesso total veem todos os locais (sem restrição)
  const gestorLocalFixo = useMemo(() => {
    if (temAcessoTotalArmarios) return null;
    if (!isGestor) return null;
    const setoresDoGestor = todosSetores?.filter(s => gestorSetoresIds.includes(s.id)) || [];
    const temDecoracao = setoresDoGestor.some(s => {
      const nome = s.nome.toUpperCase();
      return nome.includes('DECORAÇÃO') || nome.includes('DECORACAO');
    });
    if (temDecoracao) return 'DECORACAO';
    return 'SOPRO';
  }, [isGestor, temAcessoTotalArmarios, gestorSetoresIds, todosSetores]);

  const funcionariasDemissaoComArmario = useMemo(() => {
    return funcionarias
      .filter(f => f.isDemissao && f.armario_numero !== null && f.armario_numero > 0)
      .filter(f => !isGestor || gestorSetoresIds.includes(f.setor_id));
  }, [funcionarias, isGestor, gestorSetoresIds]);

  // Todas as funcionárias desligadas que possuem armário
  const funcionariasDemissaoTodas = useMemo(() => {
    return funcionarias
      .filter(f => f.isDemissao && f.armario_numero !== null && f.armario_numero > 0)
      .filter(f => !isGestor || gestorSetoresIds.includes(f.setor_id));
  }, [funcionarias, isGestor, gestorSetoresIds]);

  const funcionariasAtivas = useMemo(() => {
    return funcionarias.filter(f => !f.isDemissao);
  }, [funcionarias]);

  const funcionariasSemArmarioLista = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return funcionariasAtivas
      .filter(f => f.armario_numero === null)
      .filter(f => !isGestor || gestorSetoresIds.includes(f.setor_id))
      .filter(f => matchGrupoFiltro((f.setor as any)?.nome || '', filtrosSemArmario))
      .filter(f => {
        if (!buscaSemArmario) return true;
        const q = normalize(buscaSemArmario);
        return normalize(f.nome_completo).includes(q) ||
          normalize(f.matricula || '').includes(q) ||
          normalize((f.setor as any)?.nome || '').includes(q);
      });
  }, [funcionariasAtivas, buscaSemArmario, isGestor, gestorSetoresIds, filtrosSemArmario]);

  const funcionariasSemArmario = useMemo(() => {
    const comArmarioIds = new Set(funcionariasAtivas.filter(f => f.armario_numero !== null).map(f => f.id));
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const q = normalize(buscaCadastro);
    return funcionariasAtivas
      .filter(f => !comArmarioIds.has(f.id))
      .filter(f => !isGestor || gestorSetoresIds.includes(f.setor_id))
      .filter(f => q === '' ||
        normalize(f.nome_completo).includes(q) ||
        normalize(f.matricula || '').includes(q)
      );
  }, [funcionariasAtivas, buscaCadastro, isGestor, gestorSetoresIds]);

  // Salvar número de armário - validação por LOCAL
  const salvarMutation = useMutation({
    mutationFn: async ({ funcionarioId, numero, setorId, local }: { funcionarioId: string; numero: number | null; setorId?: string; local?: string }) => {
      const localFinal = local || 'SOPRO';

      // Remove vínculo anterior
      await supabase
        .from('armarios_femininos')
        .update({ funcionario_id: null })
        .eq('funcionario_id', funcionarioId);

      if (numero === 0) {
        // "NÃO UTILIZA" - primeiro remove qualquer registro anterior do funcionário
        await supabase
          .from('armarios_femininos')
          .delete()
          .eq('funcionario_id', funcionarioId);

        // Buscar próximo número negativo disponível para evitar conflito unique (numero, local)
        const { data: minData } = await supabase
          .from('armarios_femininos')
          .select('numero')
          .eq('local', localFinal)
          .lt('numero', 0)
          .order('numero', { ascending: true })
          .limit(1)
          .maybeSingle();

        const nextNegativo = minData ? minData.numero - 1 : -1;

        const { error } = await supabase
          .from('armarios_femininos')
          .insert({ numero: nextNegativo, funcionario_id: funcionarioId, local: localFinal });
        if (error) throw error;
      } else if (numero !== null && numero > 0) {
        const { data: existente } = await supabase
          .from('armarios_femininos')
          .select('id, funcionario_id')
          .eq('numero', numero)
          .eq('local', localFinal)
          .maybeSingle();

        if (existente && existente.funcionario_id && existente.funcionario_id !== funcionarioId) {
          throw new Error(`Armário ${numero} (${localLabel(localFinal)}) já está ocupado`);
        }

        if (existente) {
          await supabase
            .from('armarios_femininos')
            .update({ funcionario_id: funcionarioId, local: localFinal })
            .eq('id', existente.id);
        } else {
          const { error } = await supabase
            .from('armarios_femininos')
            .insert({ numero, funcionario_id: funcionarioId, local: localFinal });
          if (error) throw error;
        }
      }

      if (setorId) {
        await supabase
          .from('funcionarios')
          .update({ setor_id: setorId })
          .eq('id', funcionarioId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['armarios-funcionarias-todas'] });
      queryClient.invalidateQueries({ queryKey: ['armarios-ocupados'] });
      queryClient.invalidateQueries({ queryKey: ['armarios-mapa-visual'] });
      queryClient.invalidateQueries({ queryKey: ['armarios-prestadores'] });
      toast.success('Dados atualizados!');
      setEditando(null);
      setNumeroArmario('');
      setLocalArmario('SOPRO');
      setEditandoSetor('');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar'),
  });

  // Salvar prestador armário
  const salvarPrestadorMutation = useMutation({
    mutationFn: async ({ id, nome, setor, numero, local, matricula }: { id?: string; nome: string; setor: string; numero: number; local: string; matricula?: string }) => {
      // Check if armário is occupied
      const { data: existente } = await supabase
        .from('armarios_femininos')
        .select('id, funcionario_id, nome_prestador')
        .eq('numero', numero)
        .eq('local', local)
        .maybeSingle();

      if (existente && existente.id !== id) {
        if (existente.funcionario_id || existente.nome_prestador) {
          throw new Error(`Armário ${numero} (${localLabel(local)}) já está ocupado`);
        }
      }

      if (id) {
        // Update existing
        const { error } = await supabase
          .from('armarios_femininos')
          .update({ nome_prestador: nome, setor_prestador: setor, numero, local, matricula: matricula || null })
          .eq('id', id);
        if (error) throw error;
      } else if (existente && !existente.funcionario_id && !existente.nome_prestador) {
        // Reuse empty slot
        const { error } = await supabase
          .from('armarios_femininos')
          .update({ nome_prestador: nome, setor_prestador: setor, matricula: matricula || null })
          .eq('id', existente.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('armarios_femininos')
          .insert({ numero, nome_prestador: nome, setor_prestador: setor, local, matricula: matricula || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['armarios-prestadores'] });
      queryClient.invalidateQueries({ queryKey: ['armarios-mapa-visual'] });
      queryClient.invalidateQueries({ queryKey: ['armarios-funcionarias-todas'] });
      toast.success('Prestador cadastrado/atualizado!');
      setPrestadorDialog(false);
      setEditandoPrestador(null);
      setPrestadorNome('');
      setPrestadorSetor('');
      setPrestadorNumero('');
      setPrestadorLocal('SOPRO');
      setPrestadorMatricula('');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar prestador'),
  });

  // Bloquear/desbloquear armário
  const bloquearArmarioMutation = useMutation({
    mutationFn: async ({ numero, local, bloquear }: { numero: number; local: string; bloquear: boolean }) => {
      // Check if record exists
      const { data: existente } = await supabase
        .from('armarios_femininos')
        .select('id, funcionario_id, nome_prestador')
        .eq('numero', numero)
        .eq('local', local)
        .maybeSingle();

      if (bloquear) {
        if (existente && (existente.funcionario_id || existente.nome_prestador)) {
          throw new Error(`Armário ${numero} (${localLabel(local)}) está ocupado. Libere primeiro.`);
        }
        if (existente) {
          const { error } = await supabase
            .from('armarios_femininos')
            .update({ bloqueado: true, funcionario_id: null, nome_prestador: null, setor_prestador: null })
            .eq('id', existente.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('armarios_femininos')
            .insert({ numero, local, bloqueado: true });
          if (error) throw error;
        }
      } else {
        if (existente) {
          const { error } = await supabase
            .from('armarios_femininos')
            .update({ bloqueado: false })
            .eq('id', existente.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['armarios-mapa-visual'] });
      queryClient.invalidateQueries({ queryKey: ['armarios-funcionarias-todas'] });
      queryClient.invalidateQueries({ queryKey: ['armarios-prestadores'] });
      queryClient.invalidateQueries({ queryKey: ['armarios-bloqueados'] });
      toast.success(vars.bloquear ? 'Armário bloqueado!' : 'Armário desbloqueado!');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar armário'),
  });
  // Liberar armário (remover funcionário)
  const liberarArmarioMutation = useMutation({
    mutationFn: async (armarioId: string) => {
      const { error } = await supabase
        .from('armarios_femininos')
        .update({ funcionario_id: null })
        .eq('id', armarioId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['armarios-mapa-visual'] });
      queryClient.invalidateQueries({ queryKey: ['armarios-funcionarias-todas'] });
      toast.success('Armário liberado com sucesso!');
    },
    onError: () => toast.error('Erro ao liberar armário'),
  });


  const removerPrestadorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('armarios_femininos')
        .update({ nome_prestador: null, setor_prestador: null, matricula: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['armarios-prestadores'] });
      queryClient.invalidateQueries({ queryKey: ['armarios-mapa-visual'] });
      toast.success('Prestador removido do armário!');
    },
  });

  // Gerar lista de armários vazios por local/config
  const armariosVazios = useMemo(() => {
    if (!filtroVazio) return [];
    const ocupados = new Set(
      armariosParaMapa
        .filter(a => a.numero > 0)
        .map(a => `${a.local}-${a.numero}`)
    );
    const result: { numero: number; local: string }[] = [];
    const locaisFiltro = filtroLocal !== 'todos' ? [filtroLocal] : LOCAIS.map(l => l.value);
    locaisFiltro.forEach(local => {
      const config = configLocais.find((c: any) => c.local === local);
      const total = config ? (config as any).total : 0;
      for (let i = 1; i <= total; i++) {
        if (!ocupados.has(`${local}-${i}`)) {
          result.push({ numero: i, local });
        }
      }
    });
    return result;
  }, [filtroVazio, armariosParaMapa, configLocais, filtroLocal]);

  // Unificar funcionárias + prestadores para a lista principal
  const listaUnificada = useMemo(() => {
    if (filtroVazio) {
      // Mostrar apenas armários vazios
      return armariosVazios
        .filter(a => {
          if (busca) return a.numero.toString().includes(busca.trim());
          return true;
        })
        .map(a => ({
          key: `vazio-${a.local}-${a.numero}`,
          id: `vazio-${a.local}-${a.numero}`,
          tipo: 'vazio' as const,
          numero: a.numero,
          local: a.local,
          matricula: null as string | null,
          nome: '',
          setor: '',
          situacao: '' as string,
          data_admissao: null as string | null,
          armario_id: null as string | null,
          raw: a,
        }));
    }

    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const q = normalize(busca.trim());
    const buscaEhNumero = /^\d+$/.test(busca.trim());

    // Quando busca por nome: incluir TODAS as femininas (com ou sem armário, qualquer situação)
    // Quando busca por número: incluir armário ocupado, vazio ou bloqueado
    // Sem busca: apenas funcionárias com armário atribuído

    const funcList = funcionarias
      .filter(f => {
        if (isGestor && !gestorSetoresIds.includes(f.setor_id)) return false;
        
        if (!q) {
          // Sem busca: somente com armário positivo (comportamento padrão)
          if (f.armario_numero === null || f.armario_numero <= 0) return false;
          if (filtroLocal !== 'todos' && f.armario_local !== filtroLocal) return false;
          return matchGrupoFiltro((f.setor as any)?.nome || '', filtrosAtivos);
        }
        
        if (buscaEhNumero) {
          // Busca por número: só mostra quem tem esse armário
          if (!f.armario_numero || f.armario_numero <= 0) return false;
          if (filtroLocal !== 'todos' && f.armario_local !== filtroLocal) return false;
          return f.armario_numero.toString().includes(q);
        }
        
        // Busca por nome/matrícula/setor: todas as femininas independente de armário/situação
        if (filtroLocal !== 'todos' && f.armario_local && f.armario_local !== filtroLocal) return false;
        const setorNome = (f.setor as any)?.nome || '';
        return normalize(f.nome_completo).includes(q) ||
          normalize(f.matricula || '').includes(q) ||
          normalize(setorNome).includes(q);
      })
      .map(f => ({
        key: `func-${f.id}`,
        id: f.id,
        tipo: 'funcionaria' as const,
        numero: f.armario_numero,
        local: f.armario_local,
        matricula: f.matricula,
        nome: f.nome_completo,
        setor: (f.setor as any)?.nome || '',
        situacao: (f.situacao as any)?.nome || '',
        data_admissao: f.data_admissao || null,
        armario_id: f.armario_id,
        raw: f,
      }));

    const prestList = prestadoresComArmario
      .filter(p => {
        if (filtroLocal !== 'todos' && p.local !== filtroLocal) return false;
        if (q) {
          return normalize(p.nome_prestador || '').includes(q) ||
            normalize(p.matricula || '').includes(q) ||
            p.numero.toString().includes(q) ||
            normalize(p.setor_prestador || '').includes(q);
        }
        return true;
      })
      .map(p => ({
        key: `prest-${p.id}`,
        id: p.id,
        tipo: 'prestador' as const,
        numero: p.numero,
        local: p.local,
        matricula: p.matricula,
        nome: p.nome_prestador || '',
        setor: p.setor_prestador || '',
        situacao: '' as string,
        data_admissao: null as string | null,
        armario_id: p.id,
        raw: p,
      }));

    const bloqList = armariosBloqueados
      .filter(b => {
        if (filtroLocal !== 'todos' && b.local !== filtroLocal) return false;
        if (q) {
          return b.numero.toString().includes(q);
        }
        return true;
      })
      .map(b => ({
        key: `bloq-${b.id}`,
        id: b.id,
        tipo: 'bloqueado' as const,
        numero: b.numero,
        local: b.local,
        matricula: '' as string | null,
        nome: '',
        setor: '',
        situacao: '' as string,
        data_admissao: null as string | null,
        armario_id: b.id,
        raw: b,
      }));

    // Quando busca por número, mostrar também armários vazios que correspondem
    let vazioList: typeof funcList = [];
    if (buscaEhNumero && q) {
      const ocupados = new Set(
        armariosParaMapa
          .filter(a => a.numero > 0)
          .map(a => `${a.local}-${a.numero}`)
      );
      const locaisFiltro = filtroLocal !== 'todos' ? [filtroLocal] : LOCAIS.map(l => l.value);
      locaisFiltro.forEach(local => {
        const config = configLocais.find((c: any) => c.local === local);
        const total = config ? (config as any).total : 0;
        for (let i = 1; i <= total; i++) {
          if (i.toString().includes(q) && !ocupados.has(`${local}-${i}`)) {
            vazioList.push({
              key: `vazio-${local}-${i}`,
              id: `vazio-${local}-${i}`,
              tipo: 'vazio' as any,
              numero: i,
              local,
              matricula: null,
              nome: '',
              setor: '',
              situacao: '',
              data_admissao: null,
              armario_id: null,
              raw: { numero: i, local },
            });
          }
        }
      });
    }

    return [...funcList, ...prestList, ...bloqList, ...vazioList];
  }, [funcionariasAtivas, prestadoresComArmario, armariosBloqueados, filtrosAtivos, busca, isGestor, gestorSetoresIds, filtroLocal, filtroVazio, armariosVazios, armariosParaMapa, configLocais]);

  // Stats
  const stats = useMemo(() => {
    const totalFunc = funcionariasAtivas.filter(f => !isGestor || gestorSetoresIds.includes(f.setor_id)).length;
    const comArmario = funcionariasAtivas.filter(f => (!isGestor || gestorSetoresIds.includes(f.setor_id)) && f.armario_numero && f.armario_numero > 0).length;
    const naoTem = funcionariasAtivas.filter(f => (!isGestor || gestorSetoresIds.includes(f.setor_id)) && f.armario_numero !== null && f.armario_numero !== undefined && f.armario_numero < 0).length;
    return { total: totalFunc + prestadoresComArmario.length, comArmario: comArmario + prestadoresComArmario.length, semArmario: totalFunc - comArmario - naoTem, naoTem, prestadores: prestadoresComArmario.length };
  }, [funcionariasAtivas, prestadoresComArmario, isGestor, gestorSetoresIds]);

  // Exportar lista principal
  const handleExport = useCallback(async () => {
    const XLSX = await import('xlsx-js-style');
    const data = listaUnificada.map(f => ({
      'Nº Armário': f.numero || '',
      'Local': f.local ? localLabel(f.local) : '',
      'Matrícula': f.matricula || '',
      'Funcionária': f.nome,
      'Setor': f.setor,
      'Tipo': f.tipo === 'prestador' ? 'Prestador' : 'CLT',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Armários');
    XLSX.writeFile(wb, 'armarios_feminino.xlsx');
  }, [listaUnificada]);

  const handleExportSemArmario = useCallback(async () => {
    const XLSX = await import('xlsx-js-style');
    if (funcionariasSemArmarioLista.length === 0) {
      toast.error('Nenhuma funcionária sem armário para exportar');
      return;
    }
    const data = funcionariasSemArmarioLista.map(f => ({
      'Matrícula': f.matricula || '',
      'Funcionária': f.nome_completo,
      'Setor': (f.setor as any)?.nome || '',
      'Grupo': (() => {
        const g = classificarSetor((f.setor as any)?.nome || '');
        const labels: Record<string, string> = {
          sopro_a: 'Sopro A', sopro_b: 'Sopro B', sopro_c: 'Sopro C',
          deco_dia: 'Decoração Dia', deco_noite: 'Decoração Noite',
        };
        return g ? labels[g] || g : '';
      })(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sem Armário');
    XLSX.writeFile(wb, 'funcionarias_sem_armario.xlsx');
    toast.success(`${funcionariasSemArmarioLista.length} funcionária(s) exportada(s)`);
  }, [funcionariasSemArmarioLista]);

  const canEdit = isAdmin || isRHMode;

  // Feedback de ocupação no formulário
  const renderFeedbackOcupacao = (num: string, localVal: string, funcionarioIdAtual?: string) => {
    const numero = num ? parseInt(num) : null;
    if (!numero || numero < 1 || numero > 999) return null;
    const ocupante = armariosParaMapa.find(a => a.numero === numero && a.local === localVal);
    if (ocupante?.funcionario_id && funcionarioIdAtual && ocupante.funcionario_id === funcionarioIdAtual) {
      return (
        <div className="text-xs p-2 rounded bg-primary/10 border border-primary/30 text-primary">
          ✅ Armário atual desta funcionária
        </div>
      );
    }
    if (ocupante?.funcionario_id || ocupante?.nome_completo) {
      return (
        <div className="text-xs p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive">
          ⚠️ Ocupado por: <strong>{ocupante.nome_completo}</strong> — {ocupante.setor_nome || 'Sem setor'}
        </div>
      );
    }
    return (
      <div className="text-xs p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
        🟢 Armário livre
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Controle de Armários Feminino</h1>
        <div className="flex gap-2">
           {canEdit && (
            <Button size="sm" onClick={() => {
              setCadastroDialog(true);
              setCadastroTipo('funcionaria');
              setBuscaCadastro('');
              setCadastroFuncionarioId('');
              setCadastroNumero('');
              setCadastroLocal('SOPRO');
              setCadastroSetorId('');
            }}>
              <UserPlus className="h-4 w-4 mr-1" /> Cadastrar
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={() => {
              setCadastroDialog(true);
              setCadastroTipo('prestador');
              setPrestadorNome('');
              setPrestadorSetor('');
              setPrestadorNumero('');
              setPrestadorLocal('SOPRO');
              setPrestadorMatricula('');
              setBuscaCadastro('');
              setCadastroFuncionarioId('');
            }}>
              <HardHat className="h-4 w-4 mr-1" /> Prestador
            </Button>
          )}
          {temAcessoTotalArmarios && (
            <Button variant="outline" size="sm" onClick={() => {
              const vals: Record<string, number> = {};
              LOCAIS.forEach(l => {
                const config = configLocais.find((c: any) => c.local === l.value);
                vals[l.value] = config ? (config as any).total : 100;
              });
              setConfigValues(vals);
              setConfigTab('totais');
              setConfigDialog(true);
            }}>
              <Settings className="h-4 w-4 mr-1" /> Configuração
            </Button>
          )}
          <ManualArmariosPDF />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{stats.comArmario}</div>
            <div className="text-xs text-muted-foreground">Com Armário</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.semArmario}</div>
            <div className="text-xs text-muted-foreground">Sem Armário</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{prestadoresComArmario.length}</div>
            <div className="text-xs text-muted-foreground">Prestadores</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="funcionarias">
        <TabsList>
          <TabsTrigger value="funcionarias">Armários ({listaUnificada.length})</TabsTrigger>
          <TabsTrigger value="sem-armario">
            <UserX className="h-3.5 w-3.5 mr-1" />
            Sem Armário ({funcionariasSemArmarioLista.length})
          </TabsTrigger>
          {funcionariasDemissaoTodas.length > 0 && (
            <TabsTrigger value="demissao" className="text-destructive">
              <UserMinus className="h-3.5 w-3.5 mr-1" />
              Demissão ({funcionariasDemissaoTodas.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="mapa">
            <LayoutGrid className="h-3.5 w-3.5 mr-1" />
            Mapa Visual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funcionarias" className="space-y-3 mt-3">
          {/* Filtros por local + vazio */}
          <div className="flex flex-wrap gap-1.5">
            {[{ value: 'todos', label: 'Todos Locais' }, ...LOCAIS].map(l => (
              <Badge
                key={`local-${l.value}`}
                variant={filtroLocal === l.value ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() => setFiltroLocal(l.value)}
              >
                {l.label}
              </Badge>
            ))}
            <span className="mx-1 border-l border-border" />
            <Badge
              variant={filtroVazio ? 'default' : 'outline'}
              className={`cursor-pointer select-none ${filtroVazio ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-500 text-emerald-700 dark:text-emerald-400'}`}
              onClick={() => setFiltroVazio(v => !v)}
            >
              🟢 Vazio
            </Badge>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nº armário, matrícula, nome ou setor..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9 border-emerald-400 focus-visible:ring-emerald-400/40"
            />
          </div>

          {/* Tabela unificada */}
          <Card>
            <CardContent className="p-0 max-h-[65vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                   <TableRow>
                     <TableHead className="w-24">Nº Armário</TableHead>
                     <TableHead className="w-24">Local</TableHead>
                     <TableHead className="w-24">Matrícula</TableHead>
                     <TableHead>Funcionária</TableHead>
                     <TableHead>Setor</TableHead>
                     <TableHead className="w-32">Situação</TableHead>
                     <TableHead className="w-28">Admissão</TableHead>
                     {canEdit && <TableHead className="w-28">Ações</TableHead>}
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                       <TableCell colSpan={canEdit ? 8 : 7} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : listaUnificada.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 8 : 7} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    listaUnificada.map(item => (
                      <TableRow 
                        key={item.key} 
                        className={canEdit ? 'cursor-pointer hover:bg-muted/50' : ''}
                        onClick={() => {
                          if (!canEdit) return;
                          if (item.tipo === 'bloqueado') return;
                          if (item.tipo === 'vazio') {
                            setCadastroDialog(true);
                            setCadastroTipo('funcionaria');
                            setCadastroNumero(item.numero?.toString() || '');
                            setCadastroLocal(item.local || 'SOPRO');
                            setCadastroFuncionarioId('');
                            setBuscaCadastro('');
                            return;
                          }
                          if (item.tipo === 'funcionaria') {
                            const f = item.raw;
                            setEditando(f);
                            setNumeroArmario(f.armario_numero?.toString() || '');
                            setLocalArmario(f.armario_local || detectarLocalPadrao((f.setor as any)?.nome));
                            setEditandoSetor((f.setor as any)?.nome || '');
                          } else if (item.tipo === 'prestador') {
                            const p = item.raw as any;
                            setEditandoPrestador(p);
                            setPrestadorNome(p.nome_prestador || '');
                            setPrestadorSetor(p.setor_prestador || '');
                            setPrestadorNumero(p.numero.toString());
                            setPrestadorLocal(p.local);
                            setPrestadorMatricula(p.matricula || '');
                            setPrestadorDialog(true);
                          }
                        }}
                      >
                        <TableCell className="font-mono text-sm">
                          {item.tipo === 'vazio' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{item.numero}</span>
                          ) : item.tipo === 'funcionaria' && item.numero !== null && item.numero < 0 ? (
                            <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white text-xs">NÃO UTILIZA</Badge>
                          ) : (item.numero && item.numero > 0) ? item.numero : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.local ? (
                            <Badge variant={item.local === 'CONTAINER' ? 'outline' : 'secondary'} className="text-xs">
                              {localLabel(item.local)}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-mono">
                          {item.matricula || '—'}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.tipo === 'vazio' ? (
                              <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white text-xs">🟢 LIVRE</Badge>
                            ) : item.tipo === 'bloqueado' ? (
                              <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white text-xs">🚫 Não utiliza</Badge>
                            ) : (
                              <>
                                {item.nome}
                                {item.tipo === 'prestador' && (
                                  <Badge variant="outline" className="text-xs">Prestador</Badge>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.setor || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.situacao ? (() => {
                            const sit = item.situacao.toUpperCase();
                            const isDemissao = sit.includes('DEMISSÃO') || sit.includes('DEMISSAO') || sit.includes('PED. DEMISSÃO') || sit.includes('DESLIGAD');
                            const isAuxilio = sit.includes('AUXÍLIO') || sit.includes('AUXILIO');
                            const isAtivo = sit === 'ATIVO' || sit === 'ATIVA';
                            return (
                              <Badge 
                                variant={isDemissao || isAuxilio ? 'destructive' : isAtivo ? 'secondary' : 'outline'}
                                className={`text-xs ${isDemissao ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                              >
                                {item.situacao}
                              </Badge>
                            );
                          })() : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.data_admissao ? new Date(item.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                        </TableCell>
                        {canEdit && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {item.tipo === 'bloqueado' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => bloquearArmarioMutation.mutate({ numero: item.numero, local: item.local || 'SOPRO', bloquear: false })}
                              >
                                ✅ Liberar
                              </Button>
                            ) : (
                            <div className="flex gap-1">
                              {/* Botão Liberar para demitidas com armário */}
                              {item.tipo === 'funcionaria' && item.numero && item.numero > 0 && (() => {
                                const sit = (item.situacao || '').toUpperCase();
                                return sit.includes('DEMISSÃO') || sit.includes('DEMISSAO') || sit.includes('PED. DEMISSÃO') || sit.includes('DESLIGAD');
                              })() && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700"
                                  title="Liberar armário"
                                  onClick={() => {
                                    const f = item.raw;
                                    if (f.armario_id) {
                                      liberarArmarioMutation.mutate(f.armario_id);
                                    }
                                  }}
                                >
                                  ✅ Liberar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Editar armário"
                                onClick={() => {
                                  if (item.tipo === 'funcionaria') {
                                    const f = item.raw;
                                    setEditando(f);
                                    setNumeroArmario(f.armario_numero?.toString() || '');
                                    setLocalArmario(f.armario_local || detectarLocalPadrao((f.setor as any)?.nome));
                                    setEditandoSetor((f.setor as any)?.nome || '');
                                  } else if (item.tipo === 'prestador') {
                                    const p = item.raw as any;
                                    setEditandoPrestador(p);
                                    setPrestadorNome(p.nome_prestador || '');
                                    setPrestadorSetor(p.setor_prestador || '');
                                    setPrestadorNumero(p.numero.toString());
                                    setPrestadorLocal(p.local);
                                    setPrestadorMatricula(p.matricula || '');
                                    setPrestadorDialog(true);
                                  }
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {item.tipo === 'prestador' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  title="Remover"
                                  onClick={() => removerPrestadorMutation.mutate(item.id)}
                                  disabled={removerPrestadorMutation.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Sem Armário */}
        <TabsContent value="sem-armario" className="space-y-3 mt-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, matrícula ou setor..."
                value={buscaSemArmario}
                onChange={e => setBuscaSemArmario(e.target.value)}
                className="pl-9 border-emerald-400 focus-visible:ring-emerald-400/40"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportSemArmario}>
              <Download className="h-4 w-4 mr-1" /> Exportar Excel
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTROS_GRUPO.map(f => (
              <Badge
                key={f.value}
                variant={filtrosSemArmario.includes(f.value) ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() => {
                  if (f.value === 'todos') {
                    setFiltrosSemArmario(['todos']);
                  } else {
                    setFiltrosSemArmario(prev => {
                      const semTodos = prev.filter(v => v !== 'todos');
                      const novo = semTodos.includes(f.value)
                        ? semTodos.filter(v => v !== f.value)
                        : [...semTodos, f.value];
                      return novo.length === 0 ? ['todos'] : novo;
                    });
                  }
                }}
              >
                {f.label}
              </Badge>
            ))}
          </div>

          <Card>
            <CardContent className="p-0 max-h-[65vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                   <TableRow>
                    <TableHead className="w-24">Matrícula</TableHead>
                     <TableHead>Funcionária</TableHead>
                     <TableHead>Setor</TableHead>
                     <TableHead className="w-32">Grupo</TableHead>
                     {canEdit && <TableHead className="w-24">Ação</TableHead>}
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionariasSemArmarioLista.length === 0 ? (
                    <TableRow>
                     <TableCell colSpan={canEdit ? 5 : 4} className="text-center py-8 text-muted-foreground">
                        Todas as funcionárias possuem armário 🎉
                      </TableCell>
                    </TableRow>
                  ) : (
                    funcionariasSemArmarioLista.map(f => {
                      const grupo = classificarSetor((f.setor as any)?.nome || '');
                      const grupoLabels: Record<string, string> = {
                        sopro_a: 'Sopro A', sopro_b: 'Sopro B', sopro_c: 'Sopro C',
                        deco_dia: 'Deco Dia', deco_noite: 'Deco Noite',
                      };
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="text-muted-foreground text-sm font-mono">
                            {f.matricula || '—'}
                          </TableCell>
                          <TableCell
                            className={`font-medium ${canEdit ? 'cursor-pointer hover:text-primary hover:underline' : ''}`}
                            onClick={() => {
                              if (!canEdit) return;
                              setCadastroDialog(true);
                              setBuscaCadastro(f.nome_completo);
                              setCadastroFuncionarioId(f.id);
                              setCadastroNumero('');
                              setCadastroLocal(detectarLocalPadrao((f.setor as any)?.nome));
                              const setorAtual = todosSetores.find(s => s.nome === (f.setor as any)?.nome);
                              setCadastroSetorId(setorAtual?.id || '');
                            }}
                          >
                            {f.nome_completo}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {(f.setor as any)?.nome || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {grupoLabels[grupo] || grupo}
                            </Badge>
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  salvarMutation.mutate({
                                    funcionarioId: f.id,
                                    numero: 0,
                                    local: detectarLocalPadrao((f.setor as any)?.nome),
                                  });
                                }}
                                disabled={salvarMutation.isPending}
                              >
                                <UserX className="h-3 w-3 mr-1" /> Não tem
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Demissão */}
        <TabsContent value="demissao" className="space-y-3 mt-3">
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            ⚠️ Funcionárias desligadas que possuem armário. Libere o armário após a devolução.
          </div>
          <Card>
            <CardContent className="p-0 max-h-[65vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-24">Nº Armário</TableHead>
                    <TableHead className="w-24">Local</TableHead>
                    <TableHead>Funcionária</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-28">Data Demissão</TableHead>
                    {canEdit && <TableHead className="w-28">Ação</TableHead>}
                    {isAdmin && nomeUpper === 'LUCIANO' && <TableHead className="w-20">Excluir</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionariasDemissaoTodas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin && nomeUpper === 'LUCIANO' ? 8 : canEdit ? 7 : 6} className="text-center py-8 text-muted-foreground">
                        Nenhuma funcionária desligada no período 🎉
                      </TableCell>
                    </TableRow>
                  ) : (
                    funcionariasDemissaoTodas.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-sm font-bold">
                          {f.armario_numero && f.armario_numero > 0 ? f.armario_numero : '—'}
                        </TableCell>
                        <TableCell>
                          {f.armario_local ? (
                            <Badge variant="secondary" className="text-xs">
                              {localLabel(f.armario_local)}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="font-medium">{f.nome_completo}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {(f.setor as any)?.nome || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="text-xs">
                            {(f.situacao as any)?.nome || 'Demissão'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {f.data_demissao ? new Date(f.data_demissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            {f.armario_numero && f.armario_numero > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => {
                                  salvarMutation.mutate({
                                    funcionarioId: f.id,
                                    numero: null,
                                  });
                                }}
                                disabled={salvarMutation.isPending}
                              >
                                Liberar
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        {isAdmin && nomeUpper === 'LUCIANO' && (
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={async () => {
                                if (!confirm(`Excluir ${f.nome_completo} do sistema?`)) return;
                                const { error } = await supabase.from('funcionarios').delete().eq('id', f.id);
                                if (error) {
                                  toast.error('Erro ao excluir: ' + error.message);
                                } else {
                                  toast.success(`${f.nome_completo} excluída`);
                                  queryClient.invalidateQueries({ queryKey: ['armarios-funcionarias'] });
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapa" className="mt-3">
          <MapaVisualArmarios
            armarios={armariosParaMapa}
            totalArmarios={400}
            localFixo={gestorLocalFixo}
            onEditar={(armario) => {
              if (armario.funcionario_id) {
                const func = funcionarias.find(f => f.id === armario.funcionario_id);
                if (func && canEdit) {
                  setEditando(func);
                  setNumeroArmario(func.armario_numero?.toString() || '');
                  setLocalArmario(func.armario_local || detectarLocalPadrao((func.setor as any)?.nome));
                  setEditandoSetor((func.setor as any)?.nome || '');
                }
                // Check if it's a prestador (no funcionario_id but has nome_completo from prestador)
                if (!func && armario.nome_completo && canEdit) {
                  // Find prestador record
                  const prest = prestadoresComArmario.find(p => p.numero === armario.numero && p.local === armario.local);
                  if (prest) {
                    setEditandoPrestador(prest);
                    setPrestadorNome(prest.nome_prestador || '');
                    setPrestadorSetor(prest.setor_prestador || '');
                    setPrestadorNumero(prest.numero.toString());
                    setPrestadorLocal(prest.local);
                    setPrestadorMatricula(prest.matricula || '');
                    setPrestadorDialog(true);
                  }
                }
              } else if (canEdit) {
                // Empty locker - open unified cadastro dialog
                setCadastroDialog(true);
                setCadastroTipo('funcionaria');
                setBuscaCadastro('');
                setCadastroFuncionarioId('');
                setCadastroNumero(armario.numero.toString());
                setCadastroLocal(armario.local || 'SOPRO');
                setCadastroSetorId('');
                // Also pre-fill prestador fields
                setPrestadorNome('');
                setPrestadorSetor('');
                setPrestadorNumero(armario.numero.toString());
                setPrestadorLocal(armario.local || 'SOPRO');
                setPrestadorMatricula('');
              }
            }}
            onBloquear={(numero, local, bloquear) => {
              bloquearArmarioMutation.mutate({ numero, local, bloquear });
            }}
            onQuebrar={async (numero, local, quebrar) => {
              const { data: existente } = await supabase
                .from('armarios_femininos')
                .select('id, funcionario_id, nome_prestador')
                .eq('numero', numero)
                .eq('local', local)
                .maybeSingle();

              if (quebrar) {
                if (existente && (existente.funcionario_id || existente.nome_prestador)) {
                  toast.error(`Armário ${numero} está ocupado. Libere primeiro.`);
                  return;
                }
                if (existente) {
                  await supabase.from('armarios_femininos').update({ quebrado: true, bloqueado: false, funcionario_id: null, nome_prestador: null }).eq('id', existente.id);
                } else {
                  await supabase.from('armarios_femininos').insert({ numero, local, quebrado: true });
                }
              } else {
                if (existente) {
                  await supabase.from('armarios_femininos').update({ quebrado: false }).eq('id', existente.id);
                }
              }
              queryClient.invalidateQueries({ queryKey: ['armarios-mapa-visual'] });
              queryClient.invalidateQueries({ queryKey: ['armarios-funcionarias-todas'] });
              toast.success(quebrar ? 'Armário marcado como QUEBRADO!' : 'Armário restaurado!');
            }}
            canEdit={canEdit}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog editar armário */}
      <Dialog open={!!editando} onOpenChange={() => setEditando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Armário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium">{editando?.nome_completo}</p>
            <p className="text-xs text-muted-foreground">Matrícula: {editando?.matricula || '—'}</p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Local</label>
              <Select value={localArmario} onValueChange={setLocalArmario}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCAIS.map(l => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nº Armário</label>
              <Input
                type="number"
                min={1}
                placeholder="Número do armário"
                value={numeroArmario}
                onChange={e => setNumeroArmario(e.target.value)}
                autoFocus
              />
              {renderFeedbackOcupacao(numeroArmario, localArmario, editando?.id)}
              <p className="text-xs text-muted-foreground">
                Deixe vazio e salve para remover o vínculo.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                if (!editando) return;
                salvarMutation.mutate({
                  funcionarioId: editando.id,
                  numero: 0,
                  local: localArmario,
                });
              }}
              disabled={salvarMutation.isPending}
            >
              <UserX className="h-4 w-4 mr-1" /> Marcar como "NÃO UTILIZA"
            </Button>
            <div className="space-y-1">
              <label className="text-sm font-medium">Setor</label>
              <Select value={editandoSetor} onValueChange={setEditandoSetor}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {todosSetores.map(s => (
                    <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!editando) return;
                const num = numeroArmario ? parseInt(numeroArmario) : null;
                if (num !== null && num < 0) {
                  toast.error('Número inválido');
                  return;
                }
                const setorSelecionado = todosSetores.find(s => s.nome === editandoSetor);
                const setorOriginal = (editando.setor as any)?.nome;
                const setorMudou = editandoSetor && editandoSetor !== setorOriginal;
                salvarMutation.mutate({
                  funcionarioId: editando.id,
                  numero: num,
                  setorId: setorMudou ? setorSelecionado?.id : undefined,
                  local: localArmario,
                });
              }}
              disabled={salvarMutation.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog cadastrar armário CLT */}
      <Dialog open={cadastroDialog} onOpenChange={setCadastroDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Armário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Toggle tipo */}
            <div className="flex gap-2">
              <Button
                variant={cadastroTipo === 'funcionaria' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setCadastroTipo('funcionaria')}
              >
                <UserPlus className="h-4 w-4 mr-1" /> Funcionária
              </Button>
              <Button
                variant={cadastroTipo === 'prestador' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setCadastroTipo('prestador')}
              >
                <HardHat className="h-4 w-4 mr-1" /> Prestador
              </Button>
            </div>

            {cadastroTipo === 'funcionaria' ? (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Buscar Funcionária</label>
                  <Input
                    placeholder="Buscar por nome ou matrícula..."
                    value={buscaCadastro}
                    onChange={e => setBuscaCadastro(e.target.value)}
                    autoFocus
                  />
                </div>
                {buscaCadastro.length >= 2 && (
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    {funcionariasSemArmario.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">Nenhuma funcionária encontrada</p>
                    ) : (
                      funcionariasSemArmario.slice(0, 20).map(f => (
                        <div
                          key={f.id}
                          className={`p-2 text-sm cursor-pointer hover:bg-accent ${cadastroFuncionarioId === f.id ? 'bg-accent font-medium' : ''}`}
                          onClick={() => {
                            setCadastroFuncionarioId(f.id);
                            setBuscaCadastro(f.nome_completo);
                            const setorAtual = todosSetores.find(s => s.nome === (f.setor as any)?.nome);
                            setCadastroSetorId(setorAtual?.id || '');
                            setCadastroLocal(detectarLocalPadrao((f.setor as any)?.nome));
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span>
                              {f.nome_completo}
                              <span className="text-muted-foreground ml-2">({f.matricula || 'S/M'}) - {(f.setor as any)?.nome || '—'}</span>
                            </span>
                            {f.data_admissao && (
                              <span className="text-xs text-muted-foreground ml-2">
                                Adm: {new Date(f.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Setor</label>
                  <Select value={cadastroSetorId} onValueChange={setCadastroSetorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {todosSetores.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {cadastroFuncionarioId && (() => {
                  const funcSel = funcionarias.find(f => f.id === cadastroFuncionarioId);
                  return funcSel?.data_admissao ? (
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Data de Admissão</label>
                      <Input
                        value={new Date(funcSel.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR')}
                        readOnly
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  ) : null;
                })()}
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nome da Funcionária (Prestador)</label>
                  <Input
                    placeholder="Nome completo..."
                    value={prestadorNome}
                    onChange={e => setPrestadorNome(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Matrícula</label>
                  <Input
                    placeholder="Matrícula (opcional)..."
                    value={prestadorMatricula}
                    onChange={e => setPrestadorMatricula(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Setor do Prestador</label>
                  <Select value={prestadorSetor} onValueChange={setPrestadorSetor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {setoresPrestador.map(s => (
                        <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {setoresPrestador.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum setor de prestador cadastrado. Cadastre em Configuração.</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Local</label>
              <Select value={cadastroTipo === 'funcionaria' ? cadastroLocal : prestadorLocal} onValueChange={v => {
                if (cadastroTipo === 'funcionaria') setCadastroLocal(v);
                else setPrestadorLocal(v);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCAIS.map(l => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nº Armário</label>
              <Input
                type="number"
                min={1}
                placeholder="Número do armário"
                value={cadastroTipo === 'funcionaria' ? cadastroNumero : prestadorNumero}
                onChange={e => {
                  if (cadastroTipo === 'funcionaria') setCadastroNumero(e.target.value);
                  else setPrestadorNumero(e.target.value);
                }}
              />
              {renderFeedbackOcupacao(
                cadastroTipo === 'funcionaria' ? cadastroNumero : prestadorNumero,
                cadastroTipo === 'funcionaria' ? cadastroLocal : prestadorLocal
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCadastroDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (cadastroTipo === 'funcionaria') {
                  if (!cadastroFuncionarioId || !cadastroNumero) {
                    toast.error('Selecione a funcionária e o número do armário');
                    return;
                  }
                  const num = parseInt(cadastroNumero);
                  if (num < 1) {
                    toast.error('Número deve ser maior que 0');
                    return;
                  }
                  salvarMutation.mutate({
                    funcionarioId: cadastroFuncionarioId,
                    numero: num,
                    setorId: cadastroSetorId || undefined,
                    local: cadastroLocal,
                  }, {
                    onSuccess: () => {
                      setCadastroDialog(false);
                      setCadastroFuncionarioId('');
                      setCadastroNumero('');
                      setCadastroLocal('SOPRO');
                      setCadastroSetorId('');
                      setBuscaCadastro('');
                    }
                  });
                } else {
                  if (!prestadorNome.trim() || !prestadorNumero || !prestadorSetor) {
                    toast.error('Preencha nome, setor e número do armário');
                    return;
                  }
                  const num = parseInt(prestadorNumero);
                  if (num < 1) {
                    toast.error('Número deve ser maior que 0');
                    return;
                  }
                  salvarPrestadorMutation.mutate({
                    nome: prestadorNome.trim().toUpperCase(),
                    setor: prestadorSetor,
                    numero: num,
                    local: prestadorLocal,
                    matricula: prestadorMatricula.trim(),
                  }, {
                    onSuccess: () => {
                      setCadastroDialog(false);
                      setPrestadorNome('');
                      setPrestadorSetor('');
                      setPrestadorNumero('');
                      setPrestadorLocal('SOPRO');
                      setPrestadorMatricula('');
                    }
                  });
                }
              }}
              disabled={cadastroTipo === 'funcionaria'
                ? (!cadastroFuncionarioId || !cadastroNumero || salvarMutation.isPending)
                : (!prestadorNome.trim() || !prestadorNumero || !prestadorSetor || salvarPrestadorMutation.isPending)
              }
            >
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog cadastrar/editar prestador */}
      <Dialog open={prestadorDialog} onOpenChange={(open) => {
        if (!open) {
          setPrestadorDialog(false);
          setEditandoPrestador(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editandoPrestador ? 'Editar Prestador' : 'Cadastrar Prestador'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome da Funcionária (Prestador)</label>
              <Input
                placeholder="Nome completo..."
                value={prestadorNome}
                onChange={e => setPrestadorNome(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Matrícula</label>
              <Input
                placeholder="Matrícula (opcional)..."
                value={prestadorMatricula}
                onChange={e => setPrestadorMatricula(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Setor do Prestador</label>
              <Select value={prestadorSetor} onValueChange={setPrestadorSetor}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {setoresPrestador.map(s => (
                    <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {setoresPrestador.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum setor de prestador cadastrado. Cadastre em Configuração.</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Local</label>
              <Select value={prestadorLocal} onValueChange={setPrestadorLocal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCAIS.map(l => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nº Armário</label>
              <Input
                type="number"
                min={1}
                placeholder="Número do armário"
                value={prestadorNumero}
                onChange={e => setPrestadorNumero(e.target.value)}
              />
              {renderFeedbackOcupacao(prestadorNumero, prestadorLocal)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPrestadorDialog(false); setEditandoPrestador(null); }}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!prestadorNome.trim() || !prestadorNumero || !prestadorSetor) {
                  toast.error('Preencha nome, setor e número do armário');
                  return;
                }
                const num = parseInt(prestadorNumero);
                if (num < 1) {
                  toast.error('Número deve ser maior que 0');
                  return;
                }
                salvarPrestadorMutation.mutate({
                  id: editandoPrestador?.id,
                  nome: prestadorNome.trim().toUpperCase(),
                  setor: prestadorSetor,
                  numero: num,
                  local: prestadorLocal,
                  matricula: prestadorMatricula.trim(),
                });
              }}
              disabled={!prestadorNome.trim() || !prestadorNumero || !prestadorSetor || salvarPrestadorMutation.isPending}
            >
              {editandoPrestador ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Configuração (admin) */}
      <Dialog open={configDialog} onOpenChange={setConfigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuração</DialogTitle>
          </DialogHeader>
          <Tabs value={configTab} onValueChange={v => setConfigTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="totais" className="flex-1">Qtd. Armários</TabsTrigger>
              <TabsTrigger value="setores" className="flex-1">Setores Prestador</TabsTrigger>
            </TabsList>
            <TabsContent value="totais" className="space-y-3 mt-3">
              {LOCAIS.map(l => (
                <div key={l.value} className="flex items-center gap-3">
                  <label className="text-sm font-medium w-28">{l.label}</label>
                  <Input
                    type="number"
                    min={1}
                    value={configValues[l.value] || ''}
                    onChange={e => setConfigValues(prev => ({ ...prev, [l.value]: parseInt(e.target.value) || 0 }))}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">armários</span>
                </div>
              ))}
              <Button
                className="w-full"
                onClick={() => salvarConfigMutation.mutate(configValues)}
                disabled={salvarConfigMutation.isPending}
              >
                Salvar Totais
              </Button>
            </TabsContent>
            <TabsContent value="setores" className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">Cadastre os setores disponíveis para funcionárias prestadoras.</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do setor (ex: SPSP)"
                  value={novoSetorPrestador}
                  onChange={e => setNovoSetorPrestador(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && novoSetorPrestador.trim()) {
                      addSetorPrestadorMutation.mutate(novoSetorPrestador);
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={() => {
                    if (novoSetorPrestador.trim()) addSetorPrestadorMutation.mutate(novoSetorPrestador);
                  }}
                  disabled={!novoSetorPrestador.trim() || addSetorPrestadorMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {setoresPrestador.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Nenhum setor cadastrado</p>
                ) : (
                  setoresPrestador.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded border">
                      <span className="text-sm font-medium">{s.nome}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeSetorPrestadorMutation.mutate(s.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

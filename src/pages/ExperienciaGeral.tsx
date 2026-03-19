import { useMemo } from 'react';
import { ListaFuncionariosExperienciaGeral } from '@/components/dashboard/ListaFuncionariosExperienciaGeral';
import { useFuncionarios } from '@/hooks/useFuncionarios';
import { useAuth } from '@/hooks/useAuth';
import { useUsuario } from '@/contexts/UserContext';
import { Funcionario } from '@/types/database';

export default function ExperienciaGeral() {
  const { data: funcionarios = [] } = useFuncionarios();
  const { isAdmin } = useAuth();
  const { usuarioAtual } = useUsuario();

  // Gestor: filtrar apenas funcionários dos seus setores
  const funcionariosFiltrados = useMemo(() => {
    if (isAdmin || !usuarioAtual.setoresIds || usuarioAtual.setoresIds.length === 0) {
      return funcionarios;
    }
    return funcionarios.filter(f => usuarioAtual.setoresIds.includes(f.setor_id));
  }, [funcionarios, isAdmin, usuarioAtual.setoresIds]);

  return (
    <div className="p-4">
      <ListaFuncionariosExperienciaGeral
        funcionarios={funcionariosFiltrados as Funcionario[]}
        disabled={false}
        fullPage
      />
    </div>
  );
}

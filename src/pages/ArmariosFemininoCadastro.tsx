import { useState } from 'react';
import { CheckCircle2, Lock, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logoGlobalpack from '@/assets/logo-globalpack-new.png';

type FuncionarioArmario = {
  id: string;
  nome_completo: string;
  matricula: string | null;
  cpf: string | null;
  sexo: string;
  setor?: { nome: string } | null;
  situacao?: { nome: string } | null;
};

const somenteNumeros = (valor: string) => valor.replace(/\D/g, '');

const formatarCpf = (valor: string) => {
  const n = somenteNumeros(valor).slice(0, 11);
  return n
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const isSetorSopro = (nome?: string | null) => {
  const n = (nome || '').toUpperCase();
  return n.includes('SOPRO') && !n.includes('DECOR');
};

const isAtivo = (nome?: string | null) => (nome || '').toUpperCase().trim() === 'ATIVO';

export default function ArmariosFemininoCadastro() {
  const [cpf, setCpf] = useState('');
  const [numeroArmario, setNumeroArmario] = useState('');
  const [funcionario, setFuncionario] = useState<FuncionarioArmario | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);

  const limparEstado = () => {
    setFuncionario(null);
    setMensagem('');
    setErro('');
    setFinalizado(false);
    setNumeroArmario('');
  };

  const buscarFuncionario = async () => {
    limparEstado();
    const cpfNumeros = somenteNumeros(cpf);

    if (cpfNumeros.length !== 11) {
      setErro('INFORME UM CPF VALIDO COM 11 DIGITOS.');
      return;
    }

    setCarregando(true);
    try {
      const { data, error } = await (supabase as any)
        .from('funcionarios')
        .select('id,nome_completo,matricula,cpf,sexo,setor:setores!funcionarios_setor_id_fkey(nome),situacao:situacoes!funcionarios_situacao_id_fkey(nome)')
        .or(`cpf.eq.${cpfNumeros},cpf.eq.${formatarCpf(cpfNumeros)}`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const func = data as FuncionarioArmario | null;
      const cpfNaoLocalizado = 'CPF NAO LOCALIZADO PARA CADASTRO DE ARMARIO DO VESTIARIO FEMININO DO SOPRO. PROCURE O RH.';

      if (!func || !isSetorSopro(func.setor?.nome) || func.sexo !== 'feminino' || !isAtivo(func.situacao?.nome)) {
        setErro(cpfNaoLocalizado);
        return;
      }

      const { data: armarioExistente, error: armarioError } = await supabase
        .from('armarios_femininos')
        .select('id')
        .eq('funcionario_id', func.id)
        .maybeSingle();

      if (armarioError) throw armarioError;

      if (armarioExistente) {
        setErro('CADASTRO JA REALIZADO. PARA ALTERACAO, PROCURE O RH.');
        return;
      }

      setFuncionario(func);
      setMensagem('CONFIRME SEUS DADOS E INFORME O NUMERO DO ARMARIO UTILIZADO.');
    } catch (e) {
      console.error(e);
      setErro('ERRO AO CONSULTAR CPF. PROCURE O RH.');
    } finally {
      setCarregando(false);
    }
  };

  const enviarCadastro = async () => {
    if (!funcionario) return;
    const numero = Number(somenteNumeros(numeroArmario));

    if (!numero || numero <= 0) {
      setErro('INFORME O NUMERO DO ARMARIO.');
      return;
    }

    setCarregando(true);
    setErro('');

    try {
      const { data: jaCadastrado, error: jaCadastradoError } = await supabase
        .from('armarios_femininos')
        .select('id')
        .eq('funcionario_id', funcionario.id)
        .maybeSingle();

      if (jaCadastradoError) throw jaCadastradoError;

      if (jaCadastrado) {
        setErro('CADASTRO JA REALIZADO. PARA ALTERACAO, PROCURE O RH.');
        setFuncionario(null);
        return;
      }

      const { data: armario, error: armarioError } = await supabase
        .from('armarios_femininos')
        .select('id, funcionario_id, nome_prestador, bloqueado, quebrado')
        .eq('numero', numero)
        .eq('local', 'SOPRO')
        .maybeSingle();

      if (armarioError) throw armarioError;

      if (armario?.funcionario_id || armario?.nome_prestador || armario?.bloqueado || armario?.quebrado) {
        setErro('ARMARIO JA CADASTRADO OU INDISPONIVEL. PROCURE O RH.');
        return;
      }

      const payload = {
        funcionario_id: funcionario.id,
        matricula: funcionario.matricula,
        observacoes: 'CADASTRO REALIZADO PELO LINK DO VESTIARIO FEMININO DO SOPRO',
        updated_at: new Date().toISOString(),
      };

      if (armario?.id) {
        const { error } = await supabase.from('armarios_femininos').update(payload).eq('id', armario.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('armarios_femininos').insert({
          numero,
          local: 'SOPRO',
          ...payload,
        });
        if (error) throw error;
      }

      setFinalizado(true);
      setFuncionario(null);
      setMensagem('CADASTRO REALIZADO COM SUCESSO. O NUMERO DO ARMARIO FOI REGISTRADO NO SISTEMA.');
    } catch (e) {
      console.error(e);
      setErro('ERRO AO REGISTRAR ARMARIO. PROCURE O RH.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 flex items-center justify-center">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center border-b bg-slate-50">
          <img src={logoGlobalpack} alt="GLOBALPACK" className="h-14 object-contain mx-auto mb-3" />
          <CardTitle className="text-xl tracking-wide">CADASTRO DE ARMARIO</CardTitle>
          <p className="text-sm font-semibold text-slate-600">VESTIARIO FEMININO DO SOPRO</p>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <p className="text-sm text-slate-600">
            INFORME SEU CPF PARA LOCALIZAR SEU CADASTRO. APOS ENVIAR, O NUMERO DO ARMARIO SERA REGISTRADO DIRETAMENTE NO SISTEMA.
          </p>

          <div className="space-y-2">
            <Label>CPF</Label>
            <div className="flex gap-2">
              <Input
                value={cpf}
                onChange={(e) => {
                  setCpf(formatarCpf(e.target.value));
                  limparEstado();
                }}
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
                disabled={carregando || finalizado}
              />
              <Button onClick={buscarFuncionario} disabled={carregando || finalizado} className="gap-2">
                <Search className="h-4 w-4" />
                BUSCAR
              </Button>
            </div>
          </div>

          {funcionario && (
            <div className="rounded-lg border bg-slate-50 p-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500">NOME</p>
                <p className="font-bold">{funcionario.nome_completo.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">SETOR</p>
                <p className="font-semibold">{funcionario.setor?.nome?.toUpperCase()}</p>
              </div>
              <div className="space-y-2">
                <Label>NUMERO DO ARMARIO</Label>
                <Input
                  value={numeroArmario}
                  onChange={(e) => setNumeroArmario(somenteNumeros(e.target.value))}
                  placeholder="EX: 125"
                  inputMode="numeric"
                />
              </div>
              <Button onClick={enviarCadastro} disabled={carregando} className="w-full">
                ENVIAR CADASTRO
              </Button>
            </div>
          )}

          {mensagem && (
            <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{mensagem}</span>
            </div>
          )}

          {erro && (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              <Lock className="h-5 w-5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

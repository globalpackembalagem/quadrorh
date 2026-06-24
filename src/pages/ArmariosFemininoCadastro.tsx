import { useRef, useState } from 'react';
import { CheckCircle2, Lock, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logoGlobalpack from '@/assets/logo-globalpack-new.png';

type FuncionarioArmario = {
  nome: string;
  setor: string;
  cargo?: string;
};

const somenteNumeros = (valor: string) => valor.replace(/\D/g, '');

const formatarCpf = (valor: string) => {
  const n = somenteNumeros(valor).slice(0, 11);
  return n
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const extrairNumeroArmarioCadastrado = (mensagem: string) => {
  const match = mensagem.match(/ARMARIO NUMERO\s+(\d+)/i);
  return match?.[1] || null;
};

export default function ArmariosFemininoCadastro() {
  const [cpf, setCpf] = useState('');
  const [numeroArmario, setNumeroArmario] = useState('');
  const [funcionario, setFuncionario] = useState<FuncionarioArmario | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const numeroArmarioRef = useRef<HTMLInputElement>(null);
  const numeroJaCadastrado = extrairNumeroArmarioCadastrado(erro);

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
      const { data, error } = await (supabase as any).rpc('buscar_funcionaria_armario_sopro', {
        p_cpf: cpfNumeros,
      });

      if (error) throw error;

      if (!data?.ok) {
        setErro(data?.message || 'CPF NAO LOCALIZADO PARA CADASTRO DE ARMARIO DO VESTIARIO FEMININO. PROCURE O RH.');
        return;
      }

      const funcionarioRetorno = data.funcionario || data;
      setFuncionario({
        nome: funcionarioRetorno.nome,
        setor: funcionarioRetorno.setor,
        cargo: funcionarioRetorno.cargo,
      });
      setMensagem('CONFIRME SEUS DADOS E INFORME O NUMERO DO ARMARIO UTILIZADO.');
      setTimeout(() => numeroArmarioRef.current?.focus(), 100);
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
      const { data, error } = await (supabase as any).rpc('cadastrar_armario_sopro', {
        p_cpf: somenteNumeros(cpf),
        p_numero: numero,
      });

      if (error) throw error;

      if (!data?.ok) {
        setErro(data?.message || 'ERRO AO REGISTRAR ARMARIO. PROCURE O RH.');
        return;
      }

      setFinalizado(true);
      setFuncionario(null);
      setMensagem('OBRIGADO! SEU CADASTRO FOI ENVIADO COM SUCESSO. O NUMERO DO ARMARIO FOI REGISTRADO NO SISTEMA.');
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
          <p className="text-sm font-semibold text-slate-600">VESTIARIO FEMININO</p>
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
                <p className="font-bold">{funcionario.nome}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">SETOR</p>
                <p className="font-semibold">{funcionario.setor}</p>
              </div>
              {funcionario.cargo && (
                <div>
                  <p className="text-xs text-slate-500">FUNCAO</p>
                  <p className="font-semibold">{funcionario.cargo}</p>
                </div>
              )}
              <div className="space-y-2 rounded-lg border-2 border-blue-500 bg-blue-50 p-3 shadow-sm">
                <Label className="text-base font-black text-blue-800">DIGITE AQUI O NUMERO DO ARMARIO</Label>
                <Input
                  ref={numeroArmarioRef}
                  value={numeroArmario}
                  onChange={(e) => setNumeroArmario(somenteNumeros(e.target.value))}
                  placeholder="EX: 125"
                  inputMode="numeric"
                  className="h-12 border-blue-500 bg-white text-center text-2xl font-black tracking-wide focus-visible:ring-blue-600"
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
            numeroJaCadastrado ? (
              <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 text-center text-red-800">
                <div className="flex items-center justify-center gap-2 text-sm font-black">
                  <Lock className="h-5 w-5" />
                  VOCE JA CADASTROU ARMARIO
                </div>
                <div className="mt-3 text-xs font-bold text-red-700">NUMERO DO ARMARIO</div>
                <div className="mt-1 text-5xl font-black leading-none text-red-700">{numeroJaCadastrado}</div>
                <div className="mt-3 text-xs font-bold">QUALQUER DUVIDA, PROCURE O RH.</div>
              </div>
            ) : (
              <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                <Lock className="h-5 w-5 shrink-0" />
                <span>{erro}</span>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}

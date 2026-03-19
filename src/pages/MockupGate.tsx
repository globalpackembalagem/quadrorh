import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import logoGlobalpack from '@/assets/logo-globalpack-new.png';

/**
 * MOCKUP ONLY - Tela de demonstração do fluxo de acesso.
 * Não conecta ao banco, não altera nenhum estado.
 * Será removida após aprovação.
 */
export default function MockupGate() {
  const [nome, setNome] = useState('');
  const [fase, setFase] = useState<'nome' | 'senha' | 'entrando'>('nome');
  const [senha, setSenha] = useState('');

  const simularContinuar = () => {
    if (!nome.trim()) return;
    // Simula: se nome contém "admin" ou "luciano", pede senha
    const nomesBloqueados = ['admin', 'luciano', 'sonia', 'rh'];
    const ehUsuario = nomesBloqueados.some(n => nome.toLowerCase().includes(n));
    if (ehUsuario) {
      setFase('senha');
    } else {
      setFase('entrando');
      setTimeout(() => setFase('nome'), 2000); // volta ao estado original
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      {/* Banner mockup */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 text-xs px-4 py-1.5 rounded-full font-medium border border-amber-300 z-50">
        ⚠️ MOCKUP — Esta tela é apenas para aprovação visual
      </div>

      <div className="w-full max-w-md">
        {/* Card principal */}
        <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
          {/* Header com logo */}
          <div className="bg-primary/5 border-b border-border/50 px-8 py-8 text-center">
            <img
              src={logoGlobalpack}
              alt="Globalpack"
              className="h-14 mx-auto mb-4 object-contain"
            />
            <h1 className="text-xl font-bold text-foreground">
              Quadro de Pessoal
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Identifique-se para continuar
            </p>
          </div>

          {/* Conteúdo */}
          <div className="p-8 space-y-6">
            {/* Campo nome - sempre visível */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Seu nome
              </label>
              <Input
                type="text"
                placeholder="Digite seu nome completo"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (fase !== 'nome') {
                    setFase('nome');
                    setSenha('');
                  }
                }}
                className="h-12 text-base"
                autoFocus
                autoComplete="off"
              />
            </div>

            {/* Campo senha - aparece dinamicamente */}
            {fase === 'senha' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Lock className="h-4 w-4" />
                  Usuário identificado — informe sua senha
                </div>
                <Input
                  type="password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="h-12 text-base"
                  autoFocus
                  autoComplete="off"
                />
              </div>
            )}

            {/* Estado "entrando" como visitante */}
            {fase === 'entrando' && (
              <div className="text-center py-2 animate-in fade-in duration-300">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando como visitante...
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Seu acesso será registrado
                </p>
              </div>
            )}

            {/* Botão */}
            {fase !== 'entrando' && (
              <Button
                className="w-full h-12 text-base font-semibold gap-2"
                onClick={simularContinuar}
                disabled={!nome.trim()}
              >
                {fase === 'senha' ? (
                  <>
                    <Lock className="h-4 w-4" />
                    Entrar
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Gestão de RH · Globalpack
        </p>
      </div>
    </div>
  );
}

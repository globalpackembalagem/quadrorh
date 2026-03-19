import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import imgTabela from '@/assets/manual/armarios-tabela.png';
import imgMapa from '@/assets/manual/armarios-mapa.png';
import imgCadastro from '@/assets/manual/armarios-cadastro.png';
import imgAbas from '@/assets/manual/armarios-abas.png';

export default function ManualArmarios() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manual — Controle de Armários Feminino</h1>
          <p className="text-sm text-muted-foreground">Guia completo com imagens ilustrativas</p>
        </div>
      </div>

      {/* 1. VISÃO GERAL */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b pb-2">1. Visão Geral</h2>
          <p className="text-muted-foreground">
            O módulo gerencia a atribuição de armários femininos em <strong>3 locais</strong>:
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-sm px-3 py-1">🏭 SOPRO</Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">🎨 DECORAÇÃO</Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">📦 CONTAINER</Badge>
          </div>
          <p className="text-muted-foreground">
            Cada armário possui um número único por local. Um armário só pode ser vinculado a uma pessoa por vez.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Badge className="mb-2">Funcionária CLT</Badge>
              <p className="text-sm text-muted-foreground">Vinculada ao cadastro de funcionários do sistema. Data de admissão exibida automaticamente.</p>
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">Prestador</Badge>
              <p className="text-sm text-muted-foreground">Cadastro manual com nome, setor e matrícula. Identificado com etiqueta "Prestador".</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. ABAS */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b pb-2">2. Abas Disponíveis</h2>
          <img src={imgAbas} alt="Abas do sistema de armários" className="rounded-lg border shadow-sm w-full max-w-lg" />
          
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold text-foreground">📋 ARMÁRIOS</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                <li>Lista todas as pessoas (CLT e prestadores) com armário atribuído</li>
                <li>Filtros por grupo: Sopro A/B/C, Decoração Dia/Noite, Outros</li>
                <li>Busca por nº armário, matrícula, nome ou setor</li>
                <li>Botão ✏️ para <strong>EDITAR</strong> o armário</li>
                <li>Botão 🗑️ para <strong>EXCLUIR</strong> — apenas prestadores</li>
              </ul>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold text-foreground">🚫 SEM ARMÁRIO</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                <li>Lista funcionárias CLT que ainda não possuem armário</li>
                <li>Botão "Cadastrar" ao lado do nome para abrir o formulário</li>
                <li>Botão "Não tem" marca que a funcionária não possui armário</li>
              </ul>
            </div>

            <div className="p-4 bg-destructive/10 rounded-lg">
              <h3 className="font-semibold text-foreground">⚠️ DEMISSÃO</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                <li>Lista funcionárias desligadas que ainda possuem armário vinculado</li>
                <li>Aparece automaticamente quando há funcionárias nessa situação</li>
                <li>Botão <strong>"Liberar Armário"</strong> desvincula o armário</li>
              </ul>
            </div>

            <div className="p-4 bg-primary/10 rounded-lg">
              <h3 className="font-semibold text-foreground">🗺️ MAPA VISUAL</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                <li>Visualização gráfica de todos os armários por local</li>
                <li><Badge variant="default" className="bg-green-500 text-xs">Verde</Badge> = Livre</li>
                <li><Badge variant="destructive" className="text-xs">Vermelho</Badge> = Ocupado</li>
                <li>Clique em armário livre para cadastrar, ocupado para ver detalhes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. TABELA PRINCIPAL */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b pb-2">3. Tabela Principal</h2>
          <p className="text-sm text-muted-foreground">A tabela mostra todos os armários atribuídos com informações completas:</p>
          <img src={imgTabela} alt="Tabela de armários com colunas" className="rounded-lg border shadow-sm w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="font-semibold text-sm text-foreground">Nº Armário</p>
              <p className="text-xs text-muted-foreground">Número único por local</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="font-semibold text-sm text-foreground">Matrícula</p>
              <p className="text-xs text-muted-foreground">ID da funcionária</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="font-semibold text-sm text-foreground">Situação</p>
              <p className="text-xs text-muted-foreground">Status atual (Ativo, Aux. Doença...)</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="font-semibold text-sm text-foreground">Local</p>
              <p className="text-xs text-muted-foreground">Sopro / Decoração / Container</p>
            </div>
          </div>
          <div className="p-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-foreground">
              ⚠️ Funcionárias com <Badge variant="destructive" className="text-xs">Auxílio Doença</Badge> aparecem destacadas em vermelho para facilitar identificação de possíveis vagas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. CADASTRAR ARMÁRIO */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b pb-2">4. Como Cadastrar um Armário</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-3">👩 Funcionária CLT</h3>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
                <li>Clique no botão <strong>"Cadastrar"</strong></li>
                <li>O tipo "Funcionária" já vem selecionado</li>
                <li>Digite o nome ou matrícula na busca</li>
                <li>Clique no nome da funcionária</li>
                <li>Selecione o <strong>LOCAL</strong></li>
                <li>Digite o <strong>NÚMERO</strong> do armário</li>
                <li>Confira o feedback de ocupação</li>
                <li>Clique em "Cadastrar"</li>
              </ol>
            </div>
            <div>
              <img src={imgCadastro} alt="Formulário de cadastro de armário" className="rounded-lg border shadow-sm w-full" />
            </div>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg mt-4">
            <h3 className="font-semibold text-foreground mb-3">🔨 Prestador</h3>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
              <li>Clique no botão <strong>"Prestador"</strong></li>
              <li>Preencha o nome completo</li>
              <li>Selecione o setor</li>
              <li>Opcionalmente, informe a matrícula</li>
              <li>Selecione LOCAL e NÚMERO</li>
              <li>Clique em "Cadastrar Prestador"</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/30">
              <span className="text-green-600">🟢</span>
              <span className="text-sm text-foreground">Armário livre — pode cadastrar</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <span className="text-yellow-600">⚠️</span>
              <span className="text-sm text-foreground">Ocupado por... — escolha outro</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <span className="text-blue-600">✅</span>
              <span className="text-sm text-foreground">Armário atual — já é desta funcionária</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. MAPA VISUAL */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b pb-2">5. Mapa Visual</h2>
          <p className="text-sm text-muted-foreground">
            O mapa mostra todos os armários de um local como um grid colorido. Use para encontrar armários livres rapidamente.
          </p>
          <img src={imgMapa} alt="Mapa visual dos armários" className="rounded-lg border shadow-sm w-full" />
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500"></div>
              <span className="text-sm text-muted-foreground">Livre</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-destructive"></div>
              <span className="text-sm text-muted-foreground">Ocupado</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            O resumo no topo mostra: <strong>Total</strong>, <strong>Ocupados</strong> e <strong>Livres</strong>.
          </p>
        </CardContent>
      </Card>

      {/* 6. EDITAR / EXCLUIR */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b pb-2">6. Editar e Excluir</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">✏️ Editar</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Clique no ícone ✏️ na coluna "Ações"</li>
                <li>Altere número, local ou setor</li>
                <li>Clique em "Salvar"</li>
                <li>Pelo Mapa Visual: clique no armário ocupado → "Editar"</li>
              </ul>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">🗑️ Excluir</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Prestador:</strong> Clique no 🗑️ na tabela</li>
                <li><strong>CLT:</strong> NÃO tem botão excluir</li>
                <li>CLT: Use a aba "Demissão" → "Liberar Armário"</li>
                <li>Ou edite e apague o número</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7. DEMISSÃO */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b pb-2">7. Funcionárias Desligadas</h2>
          <div className="p-4 bg-destructive/10 rounded-lg">
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
              <li>Acesse a aba <strong>"Demissão"</strong> (aparece automaticamente)</li>
              <li>A aba mostra APENAS desligadas que ainda possuem armário</li>
              <li>Cada linha mostra: nº armário, local, matrícula, nome e setor</li>
              <li>Clique em <strong>"Liberar Armário"</strong> para desvincular</li>
              <li>O armário volta a aparecer como LIVRE no Mapa Visual</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* 8. EXPORTAR */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b pb-2">8. Exportar Dados</h2>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2">
            <li>Botão <strong>"Exportar"</strong> → gera Excel com todos os armários (inclui coluna "Tipo": CLT ou Prestador)</li>
            <li>Aba "Sem Armário" → botão <strong>"Exportar Excel"</strong> específico</li>
          </ul>
        </CardContent>
      </Card>

      {/* 9. CONFIGURAÇÃO */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b pb-2">9. Configuração (somente LUCIANO)</h2>
          <div className="p-4 bg-primary/10 rounded-lg">
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2">
              <li>Botão <strong>"Configuração"</strong> define quantos armários existem em cada local</li>
              <li>Permite cadastrar/remover setores de prestador</li>
              <li>Altera a quantidade exibida no Mapa Visual</li>
              <li>Apenas o administrador <strong>LUCIANO</strong> tem acesso</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 10. PERMISSÕES */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b pb-2">10. Permissões</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">👩‍💼 Gestoras</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Visualizar armários dos seus setores</li>
                <li>✓ Cadastrar e editar armários</li>
                <li>✓ Liberar armários de desligadas</li>
              </ul>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">🔑 RH / Administrador</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Acesso total a todos os locais</li>
                <li>✓ Configurar totais e setores</li>
                <li>✓ Apenas LUCIANO configura</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 11. DICAS */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b pb-2">11. Dicas Importantes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Cada número é único POR LOCAL (Armário 1 Sopro ≠ Armário 1 Decoração)',
              'Ao transferir funcionária, verifique se o local precisa mudar',
              'Desligadas aparecem na aba "Demissão" automaticamente',
              'Use o Mapa Visual para encontrar livres rapidamente',
              'Prestadores têm badge na tabela e botão excluir',
              'Para CLT, use aba Demissão ou edite o armário',
            ].map((dica, i) => (
              <div key={i} className="flex gap-2 p-3 bg-muted/30 rounded-lg">
                <span className="text-primary font-bold">💡</span>
                <p className="text-sm text-muted-foreground">{dica}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground pb-8">
        Versão 2.0 — Sistema Quadro RH — Março 2026
      </p>
    </div>
  );
}

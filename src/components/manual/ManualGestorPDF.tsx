import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

export function ManualGestorPDF() {
  const gerarPDF = () => {
    const conteudo = `
================================================================================
                    MANUAL DO GESTOR - SISTEMA DE QUADRO RH
================================================================================

Este manual explica o funcionamento do sistema para gestores de setor.

--------------------------------------------------------------------------------
1. VISÃO GERAL DO SISTEMA
--------------------------------------------------------------------------------

O Sistema de Quadro RH é uma ferramenta para acompanhamento e gestão do quadro
de funcionários, controle de faltas e análise de métricas operacionais.

GRUPOS FUNCIONAIS:
• SOPRO + PRODUÇÃO G+P: Turmas 1A, 2A, 1B e 2B
• DECORAÇÃO: T1 (Turno DIA) e T2 (Turno NOITE)

--------------------------------------------------------------------------------
2. ACESSO E PERMISSÕES
--------------------------------------------------------------------------------

COMO GESTOR, VOCÊ TEM ACESSO A:

✓ Dashboard do seu grupo (SOPRO ou DECORAÇÃO)
✓ Visualizar todos os funcionários do seu grupo
✓ Experiência Geral — temporários e funcionários em experiência
✓ Coberturas / Treinamentos — visualizar funcionários alocados temporariamente
✓ Controle de Faltas - visualizar todo o grupo
✓ Editar faltas APENAS dos seus setores atribuídos
✓ Criar divergências de ponto para seus setores
✓ Exportar dados em Excel
✓ Alterar o campo TURMA dos seus funcionários
✓ Responder se funcionário INICIOU (admissão/previsão)
✓ Decidir EFETIVAR ou DESLIGAR (período de experiência)
✓ Confirmar presença em cobertura/treinamento (SIM/NÃO/JÁ RETORNOU)
✓ Aprovar ou recusar trocas de turno dos seus setores

VOCÊ NÃO TEM ACESSO A:

✗ Dashboard do outro grupo (se você é SOPRO, não vê DECORAÇÃO e vice-versa)
✗ Editar faltas de setores que não são seus
✗ Menu de Administração (Usuários, Setores, Situações, etc.)
✗ Editar dados cadastrais (nome, matrícula, setor) — somente o RH
✗ Gerenciamento de demissões e homologações

--------------------------------------------------------------------------------
3. DASHBOARD - QUADRO DE FUNCIONÁRIOS
--------------------------------------------------------------------------------

O Dashboard apresenta uma visão consolidada do quadro planejado vs. realizado.

CARDS DE MÉTRICAS (por turma):
• Verde = SOBRA (mais funcionários que o necessário)
• Vermelho = DESFALQUE (falta de funcionários)

TABELA DE QUADRO PLANEJADO:
Mostra a distribuição ideal por categoria:
- Aux. Máquina (Indústria/G+P)
- Reserva Férias, Reserva Refeição, Reserva Faltas
- Amarra Pallets, Revisão Frasco, etc.

TABELA DE QUADRO REAL:
Mostra a contagem atual de funcionários ativos por:
- GLOBALPACK (CLT direto), G+P (terceirizado), TEMPORÁRIOS (matrícula TEMP)

TABELA DE SUBSTITUIÇÃO/REPOSIÇÃO:
Lista funcionários em situações especiais (afastados, férias, demissões pendentes).

--------------------------------------------------------------------------------
4. CONTROLE DE FALTAS
--------------------------------------------------------------------------------

TIPOS DE REGISTRO:
  P = PRESENTE    (trabalhando normalmente)
  F = FALTA       (ausência não justificada)
  A = AUSÊNCIA    (ausência justificada: atestado, folga, etc.)
  FE = FÉRIAS     (em período de férias)

• Você só pode editar o período que está ABERTO
• Clique na célula do dia → selecione o tipo → salva automaticamente
• Dias de folga da turma aparecem com ícone de cama (não lançar)

--------------------------------------------------------------------------------
5. COMO ALTERAR A TURMA
--------------------------------------------------------------------------------

A turma só se aplica aos setores de SOPRO + PRODUÇÃO G+P e DECORAÇÃO.

TURMAS PADRÃO:
  SOPRO + PRODUÇÃO G+P → 1A, 2A, 1B, 2B
  DECORAÇÃO            → T1 (DIA), T2 (NOITE)

⚠️ Use SEMPRE maiúsculo: 1A, 2A, 1B, 2B, T1, T2.

PASSO A PASSO:
  1. Acesse FUNCIONÁRIOS no menu lateral
  2. Localize o funcionário pela busca (nome ou matrícula)
  3. Clique no ícone de edição (lápis) ao lado do nome
  4. Altere o campo TURMA (ex: 1A, 2A, 1B, 2B ou T1, T2)
  5. Clique em SALVAR

IMPORTANTE:
• Como gestor, o campo TURMA é o ÚNICO campo principal editável
• A alteração é registrada automaticamente no histórico de auditoria
• Campos como nome, matrícula e setor só podem ser alterados pelo RH

ALTERAÇÃO EM MASSA (somente Admin/RH):
  1. Botão "ATUALIZAR TURMAS EM MASSA" na página de Funcionários
  2. Exportar planilha → Preencher coluna NOVA_TURMA → Importar de volta

--------------------------------------------------------------------------------
6. DIVERGÊNCIAS DE PONTO
--------------------------------------------------------------------------------

Quando identificar problemas (funcionário sumido, falta lançada errada, etc.):
1. Acesse "Divergências" no menu
2. Clique em "NOVA DIVERGÊNCIA"
3. Selecione o funcionário e o tipo
4. Descreva o motivo
5. Aguarde a resolução pelo RH (você recebe notificação quando resolver)

--------------------------------------------------------------------------------
7. NOTIFICAÇÕES — O QUE VOCÊ DEVE FAZER
--------------------------------------------------------------------------------

REGRA GERAL: Você recebe notificações apenas dos seus setores.
Exceção: Transferências e trocas de turno → 2 gestores recebem.

=== NOTIFICAÇÕES QUE EXIGEM SUA RESPOSTA (NÃO SOMEM ATÉ RESPONDER) ===

1) ADMISSÃO — INICIOU?
   Botões: [SIM, INICIOU] ou [NÃO INICIOU]
   → SIM: funcionário muda para ATIVO automaticamente
   → NÃO: permanece em PREVISÃO
   → Sua resposta vai para Admin + RH

2) PREVISÃO — INICIOU?
   Botões: [SIM, INICIOU] ou [NÃO INICIOU]
   → Mesmo comportamento da admissão
   → Enviada automaticamente no horário programado pelo RH

3) EXPERIÊNCIA — DECISÃO
   Botões: [EFETIVAR] ou [DESLIGAR]
   → Sua decisão é registrada na tabela de experiência
   → Gera log de auditoria
   → Admin + RH são notificados

4) COBERTURA/TREINAMENTO — CONFIRMAR
   Botões: [SIM, ESTÁ] ou [NÃO ESTÁ] ou [JÁ RETORNOU]
   → SIM: apenas confirmação
   → NÃO: cria divergência automática no sistema
   → JÁ RETORNOU: muda situação para ATIVO e limpa cobertura
   → Admin + RH são notificados

=== NOTIFICAÇÕES DE CIÊNCIA (BOTÃO CIENTE — SOMEM AO CLICAR) ===

5) DEMISSÃO — funcionário desligado. Botão: [CIENTE]
6) PEDIDO DE DEMISSÃO — funcionário pediu demissão. Botão: [CIENTE]
7) TRANSFERÊNCIA — funcionário transferido para/do seu setor. [CIENTE]
   (enviada para os 2 gestores: origem e destino)
8) TROCA DE TURNO — nova solicitação envolvendo seu setor. [CIENTE]
9) DIVERGÊNCIA NOVA — nova divergência criada. [CIENTE]
10) DIVERGÊNCIA RETORNO — reenviada por não ter sido resolvida. [CIENTE]
11) DIVERGÊNCIA FEEDBACK — RH deu feedback. [CIENTE]
12) AVISO DO RH — comunicado geral. [CIENTE]

=== REGRA DO BOTÃO "CIENTE DE TODOS" E "X" ===

Ao clicar em "CIENTE DE TODOS" ou no "X" para fechar:
• As notificações de ciência são marcadas como lidas
• As que EXIGEM resposta (1, 2, 3, 4) PERMANECEM ABERTAS
• O sistema avisa: "X notificação(ões) exigem resposta antes de fechar!"

=== PARA QUEM VÃO SUAS RESPOSTAS? ===

Todas as respostas (admissão, previsão, experiência, cobertura) são enviadas
automaticamente para o Administrador + RH (rh_completo e rh_demissões).
Eles recebem pelo sino (notificação lateral).

--------------------------------------------------------------------------------
8. TROCA DE TURNO
--------------------------------------------------------------------------------

Fluxo: RH cria → Gestor origem aprova → Gestor destino aprova → RH efetiva

• Você recebe notificação automática quando envolve seu setor
• Acesse "Troca de Turno" no menu para aprovar ou recusar
• Se recusar, escreva o motivo — o RH é avisado automaticamente

--------------------------------------------------------------------------------
9. DICAS IMPORTANTES
--------------------------------------------------------------------------------

• LOGIN: Use seu nome de usuário e senha fornecidos pelo RH
• SESSÃO: A sessão expira após um período de inatividade
• DADOS: Os dados são atualizados em tempo real
• NOTIFICAÇÕES: Não ignore as que exigem resposta — o RH depende delas
• DÚVIDAS: Entre em contato com o RH para questões não cobertas neste manual

================================================================================
                          FIM DO MANUAL DO GESTOR
================================================================================

Versão 2.0 - Sistema Quadro RH — Atualizado em 25/02/2026
Em caso de dúvidas, contate o administrador do sistema.
`;

    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Manual_Gestor_QuadroRH.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={gerarPDF} className="gap-2">
      <FileDown className="h-4 w-4" />
      Manual do Gestor
    </Button>
  );
}

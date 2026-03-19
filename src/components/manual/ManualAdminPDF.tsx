import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

export function ManualAdminPDF() {
  const gerarPDF = () => {
    const conteudo = `
================================================================================
              MANUAL DO ADMINISTRADOR - SISTEMA DE QUADRO RH
================================================================================

Este manual explica o funcionamento completo do sistema para administradores.

--------------------------------------------------------------------------------
1. VISÃO GERAL DO SISTEMA
--------------------------------------------------------------------------------

O Sistema de Quadro RH é uma ferramenta para gestão completa do quadro de
funcionários, controle de faltas, demissões, homologações, divergências,
trocas de turno e métricas operacionais.

GRUPOS FUNCIONAIS:
• SOPRO + PRODUÇÃO G+P: Turmas 1A, 2A, 1B e 2B
• DECORAÇÃO: T1 (Turno DIA) e T2 (Turno NOITE)

--------------------------------------------------------------------------------
2. ACESSO E PERMISSÕES DO ADMINISTRADOR
--------------------------------------------------------------------------------

COMO ADMINISTRADOR, VOCÊ TEM ACESSO TOTAL A:

✓ Dashboard de TODOS os grupos (SOPRO e DECORAÇÃO)
✓ Cadastro, edição e exclusão de funcionários
✓ Gerenciamento completo de setores
✓ Gerenciamento de situações (ATIVO, FÉRIAS, AFASTADO, etc.)
✓ Controle de Faltas — todos os setores, todos os períodos
✓ Liberação de datas para edição de faltas
✓ Criação e gerenciamento de períodos de ponto
✓ Demissões e Homologações — cadastro e acompanhamento
✓ Divergências — visualizar, criar e resolver
✓ Troca de Turno — criar, aprovar e efetivar
✓ Previsão de Admissão — cadastro e acompanhamento
✓ Coberturas e Treinamentos — alocar e gerenciar
✓ Experiência Geral — acompanhar temporários e decisões
✓ Exportação de dados em Excel
✓ Importação de planilhas (funcionários, turmas)
✓ Gerenciamento de Usuários e Permissões
✓ Histórico de Auditoria
✓ Backup e restauração
✓ Notificações do sistema
✓ Configurações gerais

--------------------------------------------------------------------------------
3. DASHBOARD - QUADRO DE FUNCIONÁRIOS
--------------------------------------------------------------------------------

O Dashboard apresenta uma visão consolidada do quadro planejado vs. realizado.

SELETOR DE GRUPO:
• Alterne entre SOPRO + PRODUÇÃO G+P e DECORAÇÃO no topo da página

CARDS DE MÉTRICAS (por turma):
• Verde = SOBRA (mais funcionários que o necessário)
• Vermelho = DESFALQUE (falta de funcionários)
• O cálculo é: QUADRO REAL - QUADRO PLANEJADO

TABELA DE QUADRO PLANEJADO:
Mostra a distribuição ideal por categoria:
- Aux. Máquina (Indústria/G+P)
- Reserva Férias, Reserva Refeição, Reserva Faltas
- Amarra Pallets, Revisão Frasco, etc.
⚠️ Valores editáveis — clique na célula para alterar

TABELA DE QUADRO REAL:
Mostra a contagem atual de funcionários ativos por:
- GLOBALPACK (CLT direto), G+P (terceirizado), TEMPORÁRIOS (matrícula TEMP)
⚠️ Calculado automaticamente com base nos funcionários cadastrados

TABELA DE SUBSTITUIÇÃO/REPOSIÇÃO:
Lista funcionários em situações especiais (afastados, férias, demissões pendentes).

EXPORTAÇÃO:
• "Exportar Excel" — exporta todos os dados do grupo selecionado
• "Excel por Turma" — exporta separado por turma

--------------------------------------------------------------------------------
4. GERENCIAMENTO DE FUNCIONÁRIOS
--------------------------------------------------------------------------------

CADASTRO DE FUNCIONÁRIO:
1. Acesse FUNCIONÁRIOS no menu lateral
2. Clique em "NOVO FUNCIONÁRIO"
3. Preencha: Nome, Matrícula, Setor, Situação, Empresa, Turma, Sexo
4. Campos opcionais: Cargo, Centro de Custo, Data Admissão, Observações
5. Clique em SALVAR

EDIÇÃO:
• Clique no ícone de lápis ao lado do funcionário
• Todos os campos são editáveis pelo administrador
• A alteração é registrada no histórico de auditoria

IMPORTAÇÃO EM MASSA:
1. Botão "IMPORTAR FUNCIONÁRIOS" na página de Funcionários
2. Baixe o modelo de planilha Excel
3. Preencha os dados seguindo o formato
4. Importe o arquivo — o sistema valida e insere

ATUALIZAÇÃO DE TURMAS EM MASSA:
1. Botão "ATUALIZAR TURMAS EM MASSA"
2. Exportar planilha atual → Preencher coluna NOVA_TURMA → Importar

COMPARAR PLANILHAS:
• Menu Admin → Comparar Planilhas
• Compare a base do sistema com uma planilha externa
• Identifique divergências de cadastro

SITUAÇÕES ESPECIAIS:
• SUMIDO: Obrigatório informar a data (campo "Sumido desde")
• COBERTURA: Informar funcionário de cobertura, setor e período
• TREINAMENTO: Informar setor de treinamento

ZERAR BASE:
⚠️ CUIDADO! Remove TODOS os funcionários do sistema
• Menu Admin → Zerar Base
• Requer confirmação dupla

--------------------------------------------------------------------------------
5. CONTROLE DE FALTAS
--------------------------------------------------------------------------------

PERÍODOS DE PONTO:
• Menu Admin → Períodos
• Crie períodos com data início e data fim
• Status: ABERTO (editável) ou FECHADO (somente leitura)
• Apenas um período pode estar ABERTO por vez

TIPOS DE REGISTRO:
  P  = PRESENTE    (trabalhando normalmente)
  F  = FALTA       (ausência não justificada)
  A  = AUSÊNCIA    (ausência justificada)
  FE = FÉRIAS      (em período de férias)
  DF = DESCANSO/FOLGA
  DA = DIA ABONADO
  S  = SUSPENSÃO
  SS = SERVIÇO SOCIAL

LANÇAMENTO:
• Acesse CONTROLE DE FALTAS no menu
• Selecione o período (apenas o ABERTO aparece por padrão)
• Clique na célula do dia do funcionário
• Selecione o tipo de registro
• O sistema salva automaticamente

LIBERAÇÃO DE DATAS:
• Se um gestor precisa editar uma data fora do período aberto:
  1. Vá em Controle de Faltas
  2. Clique em "LIBERAR DATAS"
  3. Selecione o setor e a data
  4. Defina a expiração da liberação
  5. O gestor poderá editar apenas aquela data/setor

ZERAR FALTAS:
• Remove todos os registros de ponto de um período
• Útil para recomeçar o lançamento

INTEGRAÇÃO DE FALTAS:
• Página dedicada para importar/conferir faltas de sistema externo

--------------------------------------------------------------------------------
6. DEMISSÕES E HOMOLOGAÇÕES
--------------------------------------------------------------------------------

CADASTRO DE DEMISSÃO:
1. Acesse DEMISSÕES no menu
2. Clique em "NOVA DEMISSÃO"
3. Selecione o funcionário
4. Preencha: Data Prevista, Tipo de Desligamento
5. Opcionais: Data Exame Demissional, Data Homologação, Observações
6. Salve — o funcionário aparece na lista de demissões pendentes

TIPOS DE DESLIGAMENTO:
• Configuráveis em Admin → Tipos de Desligamento
• Cada tipo define se tem exame demissional e homologação
• Exemplos: Demissão sem justa causa, Pedido de demissão, Término de contrato

FLUXO:
  Cadastro → Exame Demissional → Lançado no APData → Homologação → Realizado

HOMOLOGAÇÕES:
• Página dedicada para acompanhar homologações pendentes
• Filtre por período e status

CARTA DE DESLIGAMENTO:
• Gere automaticamente a carta de desligamento
• Menu → Carta de Desligamento
• Selecione o funcionário e o modelo
• Imprima ou exporte

NOTIFICAÇÃO:
• Ao cadastrar demissão, o gestor do setor recebe notificação modal
• Tipo: "CIENTE" — apenas ciência da demissão

--------------------------------------------------------------------------------
7. DIVERGÊNCIAS DE PONTO/QUADRO
--------------------------------------------------------------------------------

TIPOS DE DIVERGÊNCIA:
• SUMIDO — funcionário desapareceu (gestor ou admin cria)
• FALTA INDEVIDA — falta lançada incorretamente
• AUSÊNCIA INDEVIDA — ausência sem justificativa
• OUTROS — qualquer outra irregularidade

FLUXO:
  Gestor/Admin cria → Admin/RH resolve → Gestor recebe feedback

CRIAR DIVERGÊNCIA:
1. Acesse DIVERGÊNCIAS no menu
2. Clique em "NOVA DIVERGÊNCIA"
3. Selecione o funcionário e o tipo
4. Para SUMIDO: confirme os 7 dias e informe a data obrigatória
5. Descreva o motivo
6. Salve — notificação enviada ao admin/RH

RESOLVER DIVERGÊNCIA:
1. Na lista de divergências, clique em "AÇÃO"
2. Escolha a resolução e registre o feedback
3. O gestor que criou recebe notificação de feedback

⚠️ O nome de quem criou aparece na notificação para o administrador.

--------------------------------------------------------------------------------
8. TROCA DE TURNO / TRANSFERÊNCIA
--------------------------------------------------------------------------------

FLUXO COMPLETO:
  RH/Admin cria → Gestor origem aprova → Gestor destino aprova → RH efetiva

CRIAR TROCA:
1. Acesse TROCA DE TURNO no menu
2. Clique em "NOVA TROCA"
3. Selecione: Funcionário, Setor Destino, Turma Destino
4. Opcionais: Data Programada, Observações
5. Salve — gestores origem e destino são notificados

APROVAÇÃO:
• Gestores recebem notificação modal para aprovar ou recusar
• Se ambos aprovarem, o status muda para "APROVADO"
• Se um recusar, deve informar o motivo

EFETIVAÇÃO:
• Após aprovação dos 2 gestores, o admin pode EFETIVAR
• Efetivar altera automaticamente: setor, turma e registra no histórico

SIMULADOR:
• Menu → Troca de Turno → "SIMULADOR"
• Simule o impacto da troca no quadro antes de criar

--------------------------------------------------------------------------------
9. PREVISÃO DE ADMISSÃO
--------------------------------------------------------------------------------

CADASTRO:
1. Acesse PREVISÃO DE ADMISSÃO no menu
2. Clique em "NOVA PREVISÃO"
3. Preencha: Nome, Setor, Turma, Data Prevista, Empresa
4. Salve — cria o funcionário com situação "PREVISÃO"

FLUXO:
  Cadastro → Notificação ao Gestor → Gestor responde INICIOU/NÃO INICIOU

HORÁRIOS DE NOTIFICAÇÃO:
• Configure em Previsão → "HORÁRIOS DE NOTIFICAÇÃO"
• Defina horários automáticos por grupo (SOPRO ou DECORAÇÃO)
• O sistema envia automaticamente no horário programado

STATUS DE DOCUMENTOS:
• Acompanhe o status dos documentos de cada previsão
• Estados: PENDENTE → EM ANÁLISE → COMPLETO

IMPORTAÇÃO:
• Importe previsões em massa via planilha Excel

--------------------------------------------------------------------------------
10. COBERTURAS E TREINAMENTOS
--------------------------------------------------------------------------------

COBERTURA:
• Funcionário alocado temporariamente em outro setor
• Cadastre: funcionário, setor de destino, período

TREINAMENTO:
• Funcionário em treinamento em outro setor
• Cadastre: funcionário, setor de treinamento

NOTIFICAÇÃO AO GESTOR:
• O gestor do setor de destino recebe notificação:
  [SIM, ESTÁ] — confirma presença
  [NÃO ESTÁ] — cria divergência automática
  [JÁ RETORNOU] — muda situação para ATIVO

--------------------------------------------------------------------------------
11. EXPERIÊNCIA GERAL
--------------------------------------------------------------------------------

Lista todos os funcionários temporários e em período de experiência.

INFORMAÇÕES EXIBIDAS:
• Nome, Matrícula, Setor, Data Admissão
• Dias restantes para completar 90 dias
• Decisão do gestor (EFETIVAR ou DESLIGAR)

FLUXO DE EXPERIÊNCIA:
1. Funcionário completa período (próximo dos 90 dias)
2. Sistema gera evento automático
3. Gestor recebe notificação modal: [EFETIVAR] ou [DESLIGAR]
4. Decisão é registrada e admin/RH são notificados

--------------------------------------------------------------------------------
12. GERENCIAMENTO DE USUÁRIOS
--------------------------------------------------------------------------------

Menu Admin → Usuários

PERFIS DISPONÍVEIS:
• ADMIN — acesso total ao sistema
• RH COMPLETO — acesso a todas as funcionalidades de RH
• RH DEMISSÕES — acesso restrito a demissões e homologações
• GESTOR DE SETOR — acesso ao dashboard e funções do seu grupo
• VISUALIZAÇÃO — somente leitura (sem login)

CRIAR USUÁRIO:
1. Clique em "NOVO USUÁRIO"
2. Preencha: Nome, Perfil, Senha
3. Atribua setores (para gestores)
4. Configure permissões individuais:
   - Visualizar/Editar Funcionários
   - Visualizar/Editar Previsão
   - Visualizar/Editar Coberturas
   - Visualizar/Editar Faltas
   - Visualizar/Editar Demissões
   - Visualizar/Editar Homologações
   - Visualizar/Criar Divergências
   - Visualizar/Editar Troca de Turno
   - Exportar Excel
   - Receber Notificações
5. Defina tempo de inatividade (logout automático)

SETORES DO USUÁRIO:
• Gestor pode ter MÚLTIPLOS setores atribuídos
• Se nenhum setor atribuído = acesso a todos
• Admin sempre tem acesso a todos

ALTERAR SENHA:
• Admin pode redefinir a senha de qualquer usuário
• Usuário pode alterar sua própria senha

--------------------------------------------------------------------------------
13. CONFIGURAÇÕES ADMINISTRATIVAS
--------------------------------------------------------------------------------

SETORES (Admin → Setores):
• Criar, editar, ativar/desativar setores
• Definir GRUPO (SOPRO + PRODUÇÃO G+P ou DECORAÇÃO)
• Marcar se "Conta no Quadro" (aparece nas métricas)

SITUAÇÕES (Admin → Situações):
• Criar, editar situações de funcionário
• Definir se "Conta no Quadro" e se "Entra no Ponto"
• Exemplos: ATIVO, FÉRIAS, AFASTADO, SUMIDO, PREVISÃO

TIPOS DE DESLIGAMENTO (Admin → Tipos de Desligamento):
• Configurar tipos com: nome, emoji, ordem
• Definir se tem exame demissional e homologação
• Configurar template de texto para carta

PERÍODOS DE DEMISSÃO (Admin → Períodos):
• Criar períodos para agrupamento de demissões
• Definir data início e fim

VALIDADE DO SISTEMA (Admin → Configurações):
• Definir data de validade do sistema
• Bloquear sistema com motivo
• Ao expirar, usuários são impedidos de acessar

--------------------------------------------------------------------------------
14. NOTIFICAÇÕES — SISTEMA COMPLETO
--------------------------------------------------------------------------------

TODAS as notificações são entregues via MODAL (popup na tela).
Não existe notificação por sino — tudo é modal.

=== NOTIFICAÇÕES QUE EXIGEM RESPOSTA (NÃO SOMEM ATÉ RESPONDER) ===

1) ADMISSÃO — INICIOU?
   Enviada ao gestor do setor
   Botões: [SIM, INICIOU] ou [NÃO INICIOU]

2) PREVISÃO — INICIOU?
   Enviada automaticamente no horário programado
   Botões: [SIM, INICIOU] ou [NÃO INICIOU]

3) EXPERIÊNCIA — DECISÃO
   Enviada ao gestor quando funcionário se aproxima dos 90 dias
   Botões: [EFETIVAR] ou [DESLIGAR]

4) COBERTURA/TREINAMENTO — CONFIRMAR
   Enviada ao gestor do setor de destino
   Botões: [SIM, ESTÁ] ou [NÃO ESTÁ] ou [JÁ RETORNOU]

=== NOTIFICAÇÕES DE CIÊNCIA (BOTÃO CIENTE) ===

5) DEMISSÃO — funcionário desligado [CIENTE]
6) PEDIDO DE DEMISSÃO — funcionário pediu demissão [CIENTE]
7) TRANSFERÊNCIA — funcionário transferido [CIENTE]
8) TROCA DE TURNO — nova solicitação [CIENTE]
9) DIVERGÊNCIA NOVA — gestor criou divergência [CIENTE]
   ⚠️ Mostra o NOME de quem criou a divergência
10) DIVERGÊNCIA FEEDBACK — retorno ao gestor [CIENTE]
11) AVISO DO RH — comunicado geral [CIENTE]

=== REGRAS ===

• "CIENTE DE TODOS" marca apenas as de ciência como lidas
• As que exigem resposta PERMANECEM até responder
• Respostas dos gestores são enviadas para Admin + RH via modal

--------------------------------------------------------------------------------
15. AUDITORIA E HISTÓRICO
--------------------------------------------------------------------------------

HISTÓRICO DE AUDITORIA (Admin → Auditoria):
• Registra TODAS as alterações no sistema
• Campos: Tabela, Operação, Dados Anteriores, Dados Novos, Usuário, Data
• Filtre por tabela, operação ou período

HISTÓRICO DE ACESSO (Admin → Histórico de Acesso):
• Registra todos os logins no sistema
• Campos: Usuário, Data/Hora, IP, Navegador, Dispositivo

HISTÓRICO DE FALTAS:
• Registra alterações em registros de ponto
• Campos: Funcionário, Data, Tipo Anterior, Tipo Novo, Usuário

HISTÓRICO DO QUADRO:
• Registra alterações no quadro planejado
• Campos: Turma, Campo, Valor Anterior, Valor Novo, Usuário

--------------------------------------------------------------------------------
16. BACKUP E EXPORTAÇÃO
--------------------------------------------------------------------------------

BACKUP (Admin → Backup):
• Exporte toda a base de dados em formato Excel
• Inclui todas as tabelas principais

EXPORTAÇÃO POR SETOR:
• Na página de Funcionários, exporte por setor
• Formato Excel com todos os campos

EXPORTAÇÃO DO DASHBOARD:
• Botão "Exportar Excel" no Dashboard
• Inclui quadro planejado, real e substituição

--------------------------------------------------------------------------------
17. ESCALA DE FOLGAS
--------------------------------------------------------------------------------

SOPRO — ESCALA PANAMÁ:
• Turmas 1A, 2A, 1B, 2B seguem ciclo fixo
• Folgas são calculadas automaticamente pelo sistema
• Dias de folga aparecem no controle de faltas

DECORAÇÃO — ESCALA PERSONALIZADA:
• T1 e T2 têm escalas configuráveis
• Acesse via menu DECORAÇÃO → Escala de Folgas
• Configure folgas individuais por funcionário

--------------------------------------------------------------------------------
18. ARMÁRIOS FEMININO
--------------------------------------------------------------------------------

• Controle de armários do vestiário feminino
• Mapa visual com ocupação
• Atribua funcionárias aos armários
• Registre observações

--------------------------------------------------------------------------------
19. DICAS E BOAS PRÁTICAS
--------------------------------------------------------------------------------

• QUADRO PLANEJADO: Atualize sempre que houver mudança na necessidade
• FALTAS: Lance diariamente para manter o quadro real atualizado
• DEMISSÕES: Cadastre assim que confirmada para não perder prazos
• DIVERGÊNCIAS: Resolva rapidamente — gestores dependem do feedback
• NOTIFICAÇÕES: Responda as obrigatórias — o sistema não deixa fechar
• USUÁRIOS: Revise permissões periodicamente
• SENHAS: Oriente gestores a alterarem suas senhas regularmente
• BACKUP: Faça backup semanal como precaução
• AUDITORIA: Consulte regularmente para identificar inconsistências

--------------------------------------------------------------------------------
20. FLUXOS RESUMIDOS
--------------------------------------------------------------------------------

ADMISSÃO:
  Admin cadastra previsão → Notifica gestor → Gestor confirma INICIOU
  → Funcionário muda para ATIVO

DEMISSÃO:
  Admin cadastra → Notifica gestor (CIENTE) → Exame → APData → Homologação

TROCA DE TURNO:
  Admin cria → Gestor origem aprova → Gestor destino aprova → Admin efetiva

DIVERGÊNCIA:
  Gestor cria → Admin recebe (com nome do criador) → Admin resolve
  → Gestor recebe feedback

EXPERIÊNCIA:
  Sistema detecta 90 dias → Notifica gestor → Gestor decide EFETIVAR/DESLIGAR
  → Admin/RH recebem decisão

================================================================================
                        FIM DO MANUAL DO ADMINISTRADOR
================================================================================

Versão 1.0 - Sistema Quadro RH — Gerado em ${new Date().toLocaleDateString('pt-BR')}
Em caso de dúvidas, contate o desenvolvedor do sistema.
`;

    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Manual_Administrador_QuadroRH.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={gerarPDF} className="gap-2">
      <FileDown className="h-4 w-4" />
      Manual do Administrador
    </Button>
  );
}

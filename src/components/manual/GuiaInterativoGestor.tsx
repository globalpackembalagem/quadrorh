import { useState } from 'react';
import { 
  LayoutDashboard, Users, Clock, AlertTriangle, ArrowRightLeft, 
  ChevronRight, ChevronLeft, X, BookOpen, Check, Eye, FileText,
  UserMinus, CalendarCheck, HelpCircle, MousePointerClick, BarChart3,
  UserX, Briefcase, ClipboardList, Bell, LogOut, Key, RefreshCw, UserPlus, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface GuiaStep {
  titulo: string;
  descricao: string;
  dica?: string;
  icone: React.ReactNode;
  ilustracao?: string;
}

interface GuiaTema {
  id: string;
  nome: string;
  icone: React.ReactNode;
  cor: string;
  descricao: string;
  passos: GuiaStep[];
}

const TEMAS: GuiaTema[] = [
  {
    id: 'dashboard',
    nome: 'DASHBOARD',
    icone: <LayoutDashboard className="h-5 w-5" />,
    cor: 'text-primary',
    descricao: 'Entenda o painel principal com métricas do seu grupo',
    passos: [
      {
        titulo: 'Visão Geral do Dashboard',
        descricao: 'Ao fazer login, você é direcionado automaticamente para o dashboard do seu grupo (SOPRO ou DECORAÇÃO). Aqui você vê o resumo completo do quadro de pessoal.',
        dica: 'Você visualiza todos os setores do seu grupo, mas só edita os que estão vinculados ao seu perfil.',
        icone: <LayoutDashboard className="h-8 w-8 text-primary" />,
        ilustracao: '📊 O dashboard mostra cards com: QUADRO PLANEJADO (meta do RH) | QUADRO REAL (funcionários ativos) | DESFALQUE/SOBRA (diferença)',
      },
      {
        titulo: 'Quadro Planejado vs Quadro Real',
        descricao: 'O "Quadro Planejado" mostra a meta de funcionários definida pelo RH. O "Quadro Real" mostra quantos funcionários estão efetivamente ativos. A diferença aparece como "Desfalque" (vermelho) ou "Sobra" (verde/azul).',
        dica: '🔴 Números em VERMELHO = faltam funcionários | 🔵 Números em AZUL/VERDE = há funcionários a mais do que o planejado.',
        icone: <BarChart3 className="h-8 w-8 text-primary" />,
        ilustracao: '┌─────────────┬─────────────┬─────────────┐\n│  PLANEJADO  │    REAL     │  DIFERENÇA  │\n│     120     │    115      │   -5 🔴     │\n└─────────────┴─────────────┴─────────────┘',
      },
      {
        titulo: 'Tabela de Substituição',
        descricao: 'Abaixo do quadro, você encontra a tabela de substituição que detalha: Sumidos, Término de Contrato, Afastados, Férias e outras categorias. Passe o mouse sobre os números para ver os NOMES dos funcionários.',
        dica: '💡 Os tooltips (ao passar o mouse) mostram exatamente quais funcionários estão em cada situação. Experimente passar o mouse sobre qualquer número!',
        icone: <Users className="h-8 w-8 text-primary" />,
        ilustracao: '📋 Sumidos: 2 (hover → "João Silva, Maria Santos")\n📋 Férias: 5 (hover → lista de nomes)\n📋 Afastados: 3 (hover → lista de nomes)',
      },
      {
        titulo: 'Botões de Ação no Dashboard',
        descricao: 'No dashboard, você encontra botões para acessar rapidamente:\n\n• FUNCIONÁRIOS — lista completa dos seus setores\n• EXPERIÊNCIA / TEMPORÁRIOS — funcionários em período de experiência e temporários\n• CONTROLE DE FALTAS — grade de lançamento de ponto',
        dica: 'Esses botões abrem as respectivas telas para consulta e edição dos dados dos seus setores.',
        icone: <MousePointerClick className="h-8 w-8 text-primary" />,
        ilustracao: '[ 🔵 FUNCIONÁRIOS ]  [ 🟠 EXPERIÊNCIA ]  [ 📊 CONTROLE DE FALTAS ]',
      },
    ],
  },
  {
    id: 'funcionarios',
    nome: 'FUNCIONÁRIOS',
    icone: <Users className="h-5 w-5" />,
    cor: 'text-emerald-600',
    descricao: 'Consultar, editar e sinalizar funcionários',
    passos: [
      {
        titulo: 'Lista de Funcionários',
        descricao: 'Acesse pelo botão "FUNCIONÁRIOS" no dashboard ou pelo menu. A lista mostra apenas os funcionários dos seus setores com: nome, matrícula, empresa, setor, turma, situação e observações.',
        dica: '🔍 Use a barra de busca para encontrar funcionários por nome ou matrícula rapidamente.',
        icone: <Users className="h-8 w-8 text-emerald-600" />,
        ilustracao: '┌──────────┬──────────┬────────┬────────┐\n│   NOME   │ MATRÍCULA│  SETOR │ SITUAÇÃO│\n│ João S.  │  12345   │SOPRO A │  ATIVO  │\n│ Maria L. │  12346   │SOPRO A │  FÉRIAS │\n└──────────┴──────────┴────────┴────────┘',
      },
      {
        titulo: '"NÃO É MEU FUNCIONÁRIO"',
        descricao: 'Se identificar um funcionário que NÃO pertence à sua gestão ou que está alocado incorretamente no seu setor, marque o checkbox "Não é Meu Funcionário" ao editar o registro.\n\nIsso sinaliza ao RH que a alocação precisa ser corrigida, sem que você precise ligar ou enviar mensagem.',
        dica: '⚠️ Este campo é EXCLUSIVO para gestores. Administradores não veem esta opção. Use sempre que identificar um funcionário que não deveria estar no seu setor!',
        icone: <UserX className="h-8 w-8 text-emerald-600" />,
        ilustracao: '📝 Editar Funcionário:\n┌──────────────────────────────────┐\n│ ☑️ NÃO É MEU FUNCIONÁRIO        │\n│                                  │\n│ Ao marcar, o RH será informado   │\n│ que este funcionário precisa ser  │\n│ realocado para o setor correto.   │\n└──────────────────────────────────┘',
      },
      {
        titulo: 'Editando um Funcionário',
        descricao: 'Clique no ícone de edição (lápis) ao lado do funcionário para abrir o formulário. Como gestor, você pode alterar:\n\n• TURMA — trocar a turma do funcionário\n• Observações — adicionar anotações\n• "Não é meu funcionário" — sinalizar ao RH\n\nAs alterações são salvas imediatamente e registradas no histórico de auditoria.',
        dica: 'O campo TURMA é o único campo principal editável pelo gestor. Campos como nome, matrícula, setor e empresa só podem ser alterados pelo RH.',
        icone: <ClipboardList className="h-8 w-8 text-emerald-600" />,
        ilustracao: '📝 Campos editáveis pelo GESTOR:\n┌──────────────────────────────────┐\n│ ✏️ TURMA — pode alterar          │\n│ ✏️ Observações — pode alterar    │\n│ ☑️ Não é meu funcionário         │\n│ 🔒 Nome, Matrícula, Setor — RH  │\n└──────────────────────────────────┘',
      },
    ],
  },
  {
    id: 'experiencia',
    nome: 'EXPERIÊNCIA',
    icone: <Briefcase className="h-5 w-5" />,
    cor: 'text-orange-600',
    descricao: 'Acompanhe contratos de experiência e temporários',
    passos: [
      {
        titulo: 'Tela de Experiência / Temporários',
        descricao: 'Acesse pelo botão laranja "EXPERIÊNCIA / TEMPORÁRIOS" no dashboard. Esta tela lista todos os funcionários que estão em período de experiência ou são temporários nos seus setores.',
        dica: '📅 A lista é ordenada por criticidade de vencimento — os contratos que vencem mais cedo aparecem primeiro!',
        icone: <Briefcase className="h-8 w-8 text-orange-600" />,
        ilustracao: '[ 🟠 EXPERIÊNCIA / TEMPORÁRIOS - 47 ]\n\n┌──────────┬──────────┬──────────┬──────────┐\n│   NOME   │  TIPO    │ ADMISSÃO │VENCIMENTO│\n│ Ana P.   │ EFETIVO  │ 01/01/26 │ 01/03/26 │\n│ Carlos M.│ TEMPORÁRIO│ 15/12/25│ 15/03/26 │\n└──────────┴──────────┴──────────┴──────────┘',
      },
      {
        titulo: 'Diferença: EFETIVO vs TEMPORÁRIO',
        descricao: 'A distinção é feita pela MATRÍCULA:\n\n• EFETIVO — matrícula numérica normal (ex: 12345). Possui marcos de avaliação em 30 e 60 dias de experiência.\n\n• TEMPORÁRIO — matrícula começa com "TEMP" (ex: TEMP001). Possui ciclo de 90 dias e é contabilizado separadamente no quadro.',
        dica: '📊 No dashboard, os temporários são contados à parte do quadro efetivo. Isso ajuda o RH a planejar substituições e efetivações.',
        icone: <FileText className="h-8 w-8 text-orange-600" />,
        ilustracao: '👤 EFETIVO (matrícula: 12345)\n   → Experiência: 30 dias ✅ | 60 dias ⏳\n   → Pode ser efetivado ao final\n\n👤 TEMPORÁRIO (matrícula: TEMP001)\n   → Ciclo de 90 dias\n   → Contado separado no quadro',
      },
      {
        titulo: 'Sinalização por Cores',
        descricao: 'Os prazos são sinalizados com cores para facilitar a leitura:\n\n• 🔴 VERMELHO — vencimento próximo (crítico)\n• 🟡 AMARELO — atenção, prazo se aproximando\n• 🟢 VERDE — prazo confortável\n\nIsso permite priorizar as ações necessárias para cada funcionário.',
        icone: <Eye className="h-8 w-8 text-orange-600" />,
      },
    ],
  },
  {
    id: 'experiencia',
    nome: 'EXPERIÊNCIA GERAL',
    icone: <Briefcase className="h-5 w-5" />,
    cor: 'text-orange-600',
    descricao: 'Acompanhe temporários e funcionários em experiência',
    passos: [
      {
        titulo: 'Tela de Experiência Geral',
        descricao: 'Acesse pelo menu "EXPERIÊNCIA GERAL". Esta tela mostra todos os funcionários em período de experiência (menos de 90 dias) e temporários (matrícula TEMP) de toda a fábrica.',
        dica: 'Diferente do botão "EXPERIÊNCIA" no dashboard (que mostra só seu grupo), esta tela mostra TODOS os grupos.',
        icone: <Briefcase className="h-8 w-8 text-orange-600" />,
        ilustracao: '📋 EXPERIÊNCIA GERAL — Todos os grupos\n\n┌──────────┬──────────┬──────────┬──────────┐\n│   NOME   │  TIPO    │ ADMISSÃO │VENCIMENTO│\n│ Ana P.   │ EFETIVO  │ 01/01/26 │ 01/03/26 │\n│ Carlos M.│TEMPORÁRIO│ 15/12/25 │ 15/03/26 │\n└──────────┴──────────┴──────────┴──────────┘',
      },
      {
        titulo: 'Filtros Disponíveis',
        descricao: 'Você pode filtrar por:\n\n• TIPO — Efetivo ou Temporário\n• SETOR — Botões de setor ao lado da busca\n• BUSCA — Nome ou matrícula\n\nOs funcionários são listados por ordem de vencimento (mais urgentes primeiro).',
        dica: 'Use os botões de setor para filtrar rapidamente por SOPRO A, SOPRO B, DECORAÇÃO, etc.',
        icone: <Eye className="h-8 w-8 text-orange-600" />,
      },
    ],
  },
  {
    id: 'coberturas',
    nome: 'COBERTURAS / TREINAMENTOS',
    icone: <CalendarCheck className="h-5 w-5" />,
    cor: 'text-teal-600',
    descricao: 'Funcionários em cobertura de férias ou treinamento',
    passos: [
      {
        titulo: 'O que são Coberturas e Treinamentos?',
        descricao: 'São funcionários que estão temporariamente alocados em um setor diferente do seu setor original.\n\n• COBERTURA DE FÉRIAS — cobrindo férias de alguém em outro setor\n• TREINAMENTO — em treinamento temporário em outro setor',
        icone: <CalendarCheck className="h-8 w-8 text-teal-600" />,
        ilustracao: '📋 Coberturas / Treinamentos\n\n┌──────────┬──────────────┬──────────┬──────────┐\n│   NOME   │   SITUAÇÃO   │  SETOR   │ ORIGINAL │\n│ João S.  │ COB. FÉRIAS  │ SOPRO B  │ SOPRO A  │\n│ Maria L. │ TREINAMENTO  │ DECO DIA │ SOPRO C  │\n└──────────┴──────────────┴──────────┴──────────┘',
      },
      {
        titulo: 'Seu acesso',
        descricao: 'Como gestor, você pode VISUALIZAR a lista de coberturas e treinamentos. Apenas o RH pode editar os dados e situações dos funcionários.',
        dica: 'Se precisar alterar algo, fale com o RH.',
        icone: <Eye className="h-8 w-8 text-teal-600" />,
      },
    ],
  },
  {
    id: 'faltas',
    nome: 'CONTROLE DE FALTAS',
    icone: <Clock className="h-5 w-5" />,
    cor: 'text-amber-600',
    descricao: 'Como lançar e gerenciar faltas dos funcionários',
    passos: [
      {
        titulo: 'Acessando o Controle de Faltas',
        descricao: 'Acesse pelo botão "CONTROLE DE FALTAS" no dashboard ou pelo menu. A grade mostra todos os funcionários dos seus setores com os dias do período atual.',
        dica: 'Você só consegue editar faltas dos setores vinculados ao seu perfil.',
        icone: <Clock className="h-8 w-8 text-amber-600" />,
        ilustracao: '┌──────────┬─ Seg ─┬─ Ter ─┬─ Qua ─┬─ Qui ─┐\n│ João S.  │   P   │   P   │   F   │   P   │\n│ Maria L. │   P   │   A   │   P   │   P   │\n│ Carlos M.│  FE   │  FE   │  FE   │  FE   │\n└──────────┴───────┴───────┴───────┴───────┘',
      },
      {
        titulo: 'Lançando Faltas',
        descricao: 'Clique na célula do dia correspondente ao funcionário. As opções são:\n\n• P — Presença\n• F — Falta (sem justificativa)\n• A — Atestado médico\n• FE — Férias\n\nClique novamente para alternar entre os tipos.',
        dica: 'F = Falta sem justificativa | A = Atestado médico | P = Presença | FE = Férias. Cada clique alterna entre os tipos.',
        icone: <Check className="h-8 w-8 text-amber-600" />,
        ilustracao: '🖱️ Clique na célula:\n  [ ] → P (verde) → F (vermelho) → A (amarelo) → FE (azul) → [ ]',
      },
      {
        titulo: 'Divergências de Ponto',
        descricao: 'Se você discordar de um lançamento feito pelo sistema ou por outro gestor, pode registrar uma "Divergência de Ponto". O RH será notificado e analisará a solicitação.',
        dica: 'As divergências ficam pendentes até o RH resolver. Você pode acompanhar o status na tela.',
        icone: <AlertTriangle className="h-8 w-8 text-amber-600" />,
      },
    ],
  },
  {
    id: 'divergencias',
    nome: 'DIVERGÊNCIAS',
    icone: <AlertTriangle className="h-5 w-5" />,
    cor: 'text-destructive',
    descricao: 'Como reportar situações especiais ao RH',
    passos: [
      {
        titulo: 'O que são Divergências?',
        descricao: 'Divergências são situações que você, como gestor, identifica e precisa comunicar ao RH. Exemplos:\n\n• Funcionário sumido (ausente sem aviso)\n• Cobertura de férias em outro setor\n• Treinamento em setor diferente',
        icone: <AlertTriangle className="h-8 w-8 text-destructive" />,
        ilustracao: '📋 Tipos de Divergência:\n  🔴 SUMIDO — funcionário desapareceu\n  🔵 COB. FÉRIAS — cobrindo férias em outro setor\n  🟡 TREINAMENTO — treinando em setor diferente',
      },
      {
        titulo: 'Registrando um SUMIDO',
        descricao: 'Selecione o tipo "SUMIDO". O sistema perguntará se o funcionário já está ausente há pelo menos 7 dias. Só é possível registrar após confirmar os 7 dias. Informe a data desde quando ele está sumido.',
        dica: '⚠️ IMPORTANTE: Só registre como SUMIDO após 7 dias de ausência consecutiva! O sistema bloqueia registros com menos de 7 dias.',
        icone: <UserMinus className="h-8 w-8 text-destructive" />,
      },
      {
        titulo: 'Registrando COBERTURA DE FÉRIAS',
        descricao: 'Quando um funcionário seu está cobrindo férias em outro setor, selecione "COB. FÉRIAS". Escolha o setor e o funcionário que está sendo coberto.',
        icone: <CalendarCheck className="h-8 w-8 text-destructive" />,
      },
      {
        titulo: 'Registrando TREINAMENTO',
        descricao: 'Quando um funcionário seu está treinando em outro setor, selecione "TREINAMENTO" e indique em qual setor o treinamento está acontecendo.',
        icone: <ArrowRightLeft className="h-8 w-8 text-destructive" />,
      },
      {
        titulo: 'Acompanhamento',
        descricao: 'Após registrar, o RH é notificado imediatamente. Você pode acompanhar o status na página de Divergências. O RH pode: alterar conforme solicitado, cancelar ou excluir.',
        dica: 'Você só visualiza as divergências. O RH é responsável por resolver.',
        icone: <Eye className="h-8 w-8 text-destructive" />,
      },
    ],
  },
  {
    id: 'trocaturno',
    nome: 'TROCA DE TURNO',
    icone: <RefreshCw className="h-5 w-5" />,
    cor: 'text-blue-600',
    descricao: 'Como solicitar e aprovar trocas de turno',
    passos: [
      {
        titulo: 'O que é Troca de Turno?',
        descricao: 'A troca de turno permite transferir um funcionário de um setor/turma para outro. O processo exige aprovação dos gestores de origem e destino antes de ser efetivado pelo RH.\n\nSe você tiver acesso VISUALIZAR, pode acompanhar as solicitações sem aprovar. Com acesso EDITAR, pode criar e aprovar trocas.',
        icone: <RefreshCw className="h-8 w-8 text-blue-600" />,
        ilustracao: '🔄 Fluxo da Troca:\n  RH cria → Gestor origem aprova → Gestor destino aprova → RH efetiva\n\n📋 Seus níveis de acesso:\n  SEM ACESSO = menu oculto\n  VISUALIZAR 👁️ = acompanhar status\n  EDITAR ✏️ = criar e aprovar',
      },
      {
        titulo: 'Aprovando uma Troca',
        descricao: 'Quando uma troca envolve seu setor (como origem ou destino) e você tem permissão EDITAR, você receberá uma notificação. Acesse a página de Troca de Turno para aprovar ou recusar a solicitação.',
        dica: 'Você só precisa aprovar trocas que envolvem os seus setores. O sistema notifica automaticamente os gestores envolvidos.',
        icone: <Check className="h-8 w-8 text-blue-600" />,
      },
    ],
  },
  {
    id: 'alterarturma',
    nome: 'ALTERAR TURMA',
    icone: <ArrowRightLeft className="h-5 w-5" />,
    cor: 'text-cyan-600',
    descricao: 'Como alterar a turma de um funcionário (Sopro/Decoração)',
    passos: [
      {
        titulo: 'Turmas Padrão do Sistema',
        descricao: 'As turmas são utilizadas apenas nos setores de SOPRO (junto com PRODUÇÃO G+P) e DECORAÇÃO.\n\nTURMAS DO SOPRO + PRODUÇÃO G+P:\n• 1A — Turma 1A\n• 2A — Turma 2A\n• 1B — Turma 1B\n• 2B — Turma 2B\n\nTURMAS DA DECORAÇÃO:\n• T1 — Turno DIA\n• T2 — Turno NOITE\n\nFuncionários de outros setores NÃO possuem turma.',
        dica: '⚠️ Use SEMPRE a nomenclatura padrão em MAIÚSCULO: 1A, 2A, 1B, 2B (Sopro) ou T1, T2 (Decoração). Evite variações como "1a", "t2" em minúsculo.',
        icone: <Users className="h-8 w-8 text-cyan-600" />,
        ilustracao: '📋 TURMAS PADRÃO:\n\n🔧 SOPRO + PRODUÇÃO G+P:\n┌──────┬──────┬──────┬──────┐\n│  1A  │  2A  │  1B  │  2B  │\n└──────┴──────┴──────┴──────┘\n\n🎨 DECORAÇÃO:\n┌──────────────┬──────────────┐\n│  T1 (DIA)    │  T2 (NOITE)  │\n└──────────────┴──────────────┘',
      },
      {
        titulo: 'Onde Alterar a Turma?',
        descricao: 'Acesse o menu FUNCIONÁRIOS. A lista mostra todos os funcionários dos seus setores. Localize o funcionário desejado usando a barra de busca (por nome ou matrícula).',
        dica: '🔍 Apenas funcionários de SOPRO/PRODUÇÃO G+P e DECORAÇÃO utilizam turma.',
        icone: <ClipboardList className="h-8 w-8 text-cyan-600" />,
        ilustracao: '📋 Menu → FUNCIONÁRIOS → Localizar funcionário\n\n┌──────────┬──────────┬────────┬────────┐\n│   NOME   │ MATRÍCULA│  SETOR │  TURMA │\n│ João S.  │  12345   │SOPRO A │   1A   │\n│ Maria L. │  12346   │SOPRO B │   2B   │\n└──────────┴──────────┴────────┴────────┘',
      },
      {
        titulo: 'Passo a Passo',
        descricao: '1️⃣ Clique no ícone de edição (lápis ✏️) ao lado do funcionário\n\n2️⃣ No formulário, localize o campo TURMA\n\n3️⃣ Digite a nova turma (ex: 1A, 2A, 1B, 2B para Sopro ou T1, T2 para Decoração)\n\n4️⃣ Clique em SALVAR\n\n✅ A alteração é aplicada imediatamente e registrada no histórico de auditoria.',
        dica: '⚠️ Como gestor, o campo TURMA é o ÚNICO campo principal que você pode alterar. Dados como nome, matrícula e setor só podem ser alterados pelo RH.',
        icone: <ClipboardList className="h-8 w-8 text-cyan-600" />,
        ilustracao: '📝 Editar Funcionário:\n┌──────────────────────────────────┐\n│ Nome: JOÃO SILVA        🔒      │\n│ Matrícula: 12345        🔒      │\n│ Setor: SOPRO A          🔒      │\n│                                  │\n│ TURMA: [ 1A → 2A ]      ✏️      │\n│                                  │\n│        [ 💾 SALVAR ]             │\n└──────────────────────────────────┘',
      },
      {
        titulo: 'Alteração em Massa (Admin/RH)',
        descricao: 'Para atualizar a turma de VÁRIOS funcionários de uma vez, o RH pode usar o botão "ATUALIZAR TURMAS EM MASSA" na página de Funcionários.\n\nFluxo:\n1. Exportar planilha com funcionários do Sopro\n2. Preencher a coluna NOVA_TURMA\n3. Importar de volta\n4. Conferir e aplicar',
        dica: '📊 Esta funcionalidade é exclusiva para administradores e RH. Gestores alteram individualmente pelo lápis de edição.',
        icone: <FileText className="h-8 w-8 text-cyan-600" />,
        ilustracao: '📥 EXPORTAR → 📝 Preencher NOVA_TURMA → 📤 IMPORTAR → ✅ APLICAR\n\n┌──────────┬──────────┬──────────┐\n│   NOME   │ TURMA_AT │NOVA_TURMA│\n│ João S.  │    1A    │    2A    │\n│ Maria L. │    1B    │    2B    │\n└──────────┴──────────┴──────────┘',
      },
    ],
  },
  {
    id: 'previsao',
    nome: 'PREVISÃO ADMISSÃO',
    icone: <UserPlus className="h-5 w-5" />,
    cor: 'text-purple-600',
    descricao: 'Confirmar se novo funcionário iniciou ou não',
    passos: [
      {
        titulo: 'Notificação Automática',
        descricao: 'Quando o RH cadastra um funcionário com situação "PREVISÃO", você recebe uma notificação automática no horário programado perguntando se o funcionário iniciou.\n\nA notificação mostra o NOME do funcionário, setor e turma.',
        dica: '⏰ Os horários são configurados pelo RH (ex: 08:00 para SOPRO A, 16:00 para SOPRO B).',
        icone: <Bell className="h-8 w-8 text-purple-600" />,
        ilustracao: '📱 Modal aparece na tela:\n┌──────────────────────────────────┐\n│ 👤 PREVISÃO — INICIOU?           │\n│                                  │\n│ O funcionário MARIA SANTOS       │\n│ iniciou?                         │\n│                                  │\n│ [ ✅ SIM, INICIOU ]              │\n│ [ ❌ NÃO INICIOU  ]              │\n└──────────────────────────────────┘',
      },
      {
        titulo: 'Se clicar SIM ✅',
        descricao: 'O sistema AUTOMATICAMENTE:\n\n1. Muda a situação do funcionário de PREVISÃO para ATIVO\n2. O funcionário passa a contar no Quadro Real\n3. O administrador recebe uma notificação informando que o gestor confirmou a chegada',
        dica: '🟢 O botão SIM pisca para chamar sua atenção! Ao clicar, a mudança é instantânea.',
        icone: <ThumbsUp className="h-8 w-8 text-green-600" />,
        ilustracao: '✅ MARIA SANTOS → ATIVO\n\n📊 Quadro Real atualizado automaticamente\n📨 Admin notificado: "Gestor LEILA confirmou: INICIOU"',
      },
      {
        titulo: 'Se clicar NÃO ❌',
        descricao: 'O funcionário PERMANECE com situação PREVISÃO.\n\nO administrador recebe uma notificação informando que o funcionário não iniciou, para que o RH possa tomar as providências necessárias (reagendar, cancelar, etc.).',
        dica: '🔴 NÃO INICIOU → o funcionário não entra no quadro. O RH decide o próximo passo.',
        icone: <ThumbsDown className="h-8 w-8 text-red-600" />,
        ilustracao: '❌ MARIA SANTOS → permanece PREVISÃO\n\n📨 Admin notificado: "Gestor LEILA respondeu: NÃO INICIOU"\n🔄 RH avalia próximos passos',
      },
    ],
  },
  {
    id: 'navegacao',
    nome: 'NAVEGAÇÃO',
    icone: <BookOpen className="h-5 w-5" />,
    cor: 'text-violet-600',
    descricao: 'Como navegar pelo sistema',
    passos: [
      {
        titulo: 'Menu Principal',
        descricao: 'Clique em "MENU" no cabeçalho para acessar as funcionalidades disponíveis. O menu é dinâmico: só aparecem os módulos para os quais você tem permissão de VISUALIZAR ou EDITAR.\n\n• Módulos ocultos = SEM ACESSO\n• 👁️ = Somente visualização (VISUALIZAR)\n• ✏️ = Acesso completo (EDITAR)',
        icone: <LayoutDashboard className="h-8 w-8 text-violet-600" />,
        ilustracao: '┌─ MENU ─────────────────────┐\n│ 📊 Quadro de Funcionários  │\n│ 👤 Previsão Admissão    👁️ │\n│ 🔄 Cob. Férias/Trein.   👁️ │\n│ ⏰ Controle de Faltas   ✏️ │\n│ ⚠️ Divergências          👁️ │\n│ 🔄 Troca de Turno       ✏️ │\n└────────────────────────────┘\n👁️ = Ver | ✏️ = Editar | (oculto) = Sem acesso',
      },
      {
        titulo: 'Alterar Senha',
        descricao: 'Clique no botão "SENHA" no cabeçalho para alterar sua senha de acesso a qualquer momento. A senha é pessoal e intransferível.',
        icone: <Key className="h-8 w-8 text-violet-600" />,
      },
      {
        titulo: 'Notificações (Modal)',
        descricao: 'Ao acessar o sistema, notificações importantes aparecem automaticamente em um modal na tela:\n\n• Movimentações de funcionários nos seus setores\n• Demissões registradas pelo RH\n• Trocas de turno pendentes de aprovação\n• Previsão de admissão — o funcionário chegou?\n• Alertas do sistema\n\nResponda ou clique em CIENTE para dispensar cada aviso.',
        dica: '📢 Notificações obrigatórias (admissão, experiência, cobertura) reaparecem até serem respondidas.',
        icone: <Bell className="h-8 w-8 text-violet-600" />,
      },
      {
        titulo: 'Sair do Sistema',
        descricao: 'Use o botão "SAIR" para fazer logout. Isso encerra sua sessão e volta para a tela inicial de visitante.',
        dica: '⏱️ O sistema também faz logout automático após um período de inatividade configurado pelo administrador.',
        icone: <LogOut className="h-8 w-8 text-violet-600" />,
      },
    ],
  },
];

interface GuiaInterativoGestorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuiaInterativoGestor({ open, onOpenChange }: GuiaInterativoGestorProps) {
  const [temaAtivo, setTemaAtivo] = useState<string | null>(null);
  const [passoAtual, setPassoAtual] = useState(0);

  const tema = TEMAS.find(t => t.id === temaAtivo);

  const handleClose = () => {
    setTemaAtivo(null);
    setPassoAtual(0);
    onOpenChange(false);
  };

  const handleSelectTema = (id: string) => {
    setTemaAtivo(id);
    setPassoAtual(0);
  };

  const handleVoltar = () => {
    setTemaAtivo(null);
    setPassoAtual(0);
  };

  const proxPasso = () => {
    if (tema && passoAtual < tema.passos.length - 1) {
      setPassoAtual(p => p + 1);
    }
  };

  const passoAnterior = () => {
    if (passoAtual > 0) {
      setPassoAtual(p => p - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">
                  {tema ? tema.nome : 'GUIA DO GESTOR'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {tema ? `Passo ${passoAtual + 1} de ${tema.passos.length}` : 'Selecione um tema para começar'}
                </p>
              </div>
            </div>
            {tema && (
              <Button variant="ghost" size="sm" onClick={handleVoltar} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                TEMAS
              </Button>
            )}
          </div>
          {/* Progress bar */}
          {tema && (
            <div className="flex gap-1 mt-3">
              {tema.passos.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-all',
                    i <= passoAtual ? 'bg-primary' : 'bg-muted'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {!tema ? (
            /* Menu de Temas */
            <div className="grid gap-3">
              {TEMAS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTema(t.id)}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className={cn('p-3 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors', t.cor)}>
                    {t.icone}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{t.nome}</h3>
                    <p className="text-sm text-muted-foreground">{t.descricao}</p>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">{t.passos.length} passos</Badge>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Passo atual */
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 bg-muted rounded-xl p-4">
                  {tema.passos[passoAtual].icone}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-foreground">
                    {tema.passos[passoAtual].titulo}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {tema.passos[passoAtual].descricao}
                  </p>
                </div>
              </div>

              {/* Ilustração */}
              {tema.passos[passoAtual].ilustracao && (
                <div className="rounded-lg bg-muted/50 border p-4">
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">
                    {tema.passos[passoAtual].ilustracao}
                  </pre>
                </div>
              )}

              {tema.passos[passoAtual].dica && (
                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-primary">DICA IMPORTANTE</span>
                      <p className="text-sm text-foreground mt-1">
                        {tema.passos[passoAtual].dica}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {tema && (
          <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={passoAnterior}
              disabled={passoAtual === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              ANTERIOR
            </Button>
            
            <span className="text-sm text-muted-foreground">
              {passoAtual + 1} / {tema.passos.length}
            </span>

            {passoAtual < tema.passos.length - 1 ? (
              <Button onClick={proxPasso} className="gap-1">
                PRÓXIMO
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleVoltar} variant="default" className="gap-1">
                <Check className="h-4 w-4" />
                CONCLUÍDO
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

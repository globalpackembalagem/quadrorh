
Objetivo
- Fazer o cadastro de demissão “acontecer sempre” (sem parecer que “não faz nada”).
- Garantir que “todas as demissões de Fevereiro/2026” apareçam na tela de Demissões, mesmo quando o desligamento foi registrado primeiro em “Funcionários” (situação PED. DEMISSÃO/DEMISSÃO + data_demissao), sem precisar ficar recadastrando um por um.

O que eu encontrei (causa mais provável do “nada acontece”)
1) O botão “Agendar Demissão” só cria o registro se 3 campos obrigatórios estiverem realmente preenchidos no formulário:
   - Funcionário
   - Tipo de desligamento
   - Data prevista
   Se você apenas digita o nome no campo de busca, mas não clica no nome da lista (ou não seleciona com Enter), o “funcionario_id” continua vazio e o submit fica inválido. Isso dispara o onInvalid, mas como é só um toast, pode passar despercebido e dar sensação de “nada acontece”.

2) Existe também um segundo cenário importante que você descreveu:
   - Você já colocou o funcionário como “PED. DEMISSÃO” (ou outro desligamento) na tela de Funcionários e definiu a data (Fevereiro/2026),
   - Mas isso não cria automaticamente um registro na tabela de “Demissões”.
   Resultado: o funcionário fica “demitido” no cadastro, mas não aparece na lista de Demissões, porque a lista de Demissões hoje depende dos registros da tabela demissoes.

Solução proposta (duas frentes)

Frente A — Deixar impossível “clicar e não acontecer nada” no formulário Nova Demissão
1) Validar “em tempo real” e bloquear o botão até estar tudo certo
   - Configurar o react-hook-form para validar em onChange/onBlur (em vez de só no submit).
   - Desabilitar o botão “Agendar Demissão” enquanto:
     - funcionário não estiver selecionado de verdade,
     - tipo de desligamento não estiver selecionado,
     - data prevista não estiver preenchida.

2) Mensagem visível na própria tela (não só toast)
   - Se o usuário tentar salvar e ainda faltar algo, além do toast, mostrar um “aviso” no topo do modal (tipo: “Falta selecionar: Funcionário / Tipo”).
   - Também mostrar uma dica quando a pessoa digitou algo no campo e não clicou em ninguém:
     - Ex.: “Clique em um nome na lista para selecionar o funcionário”.

3) Explicar o comportamento do “Pedido de Demissão”
   - Quando o tipo for “Pedido de Demissão”, mostrar uma observação pequena no form:
     - “Pedido de Demissão entra direto como Realizada (não aparece em Agendadas)”.
   Isso evita a sensação de “sumiu”.

Arquivos envolvidos
- src/components/demissoes/NovaDemissaoForm.tsx

Frente B — Botão “Importar/Sync” para puxar TODOS desligamentos do mês para a lista de Demissões
Essa parte atende exatamente seu pedido: “toda demissão de fevereiro/2026 vai para lista de demissões”.

Como vai funcionar
1) Na tela RH > Demissões, ao lado de “Exportar Excel”, adicionar um botão:
   - “Importar demissões do mês”
2) Ao clicar, o sistema:
   - Olha o mês selecionado (ex.: Fevereiro/2026).
   - Busca no cadastro de Funcionários quem tem:
     - data_demissao dentro do mês, e
     - situação contendo “DEMISS” (ex.: “DEMISSÃO” ou “PED. DEMISSÃO”).
   - Compara com o que já existe na lista de Demissões (tabela demissoes) para não duplicar.
   - Cria automaticamente os registros que estiverem faltando.

Regras de criação (para não inventar coisa errada)
- data_prevista = data_demissao do funcionário
- realizado:
  - true (porque se já está em situação de desligamento, é desligamento efetivado no cadastro)
- tipo_desligamento:
  - Se a situação for “PED. DEMISSÃO”, preencher “Pedido de Demissão”
  - Caso contrário, deixar em branco (null) para você editar depois, sem eu assumir qual foi o tipo real
- observacoes:
  - “Importado do cadastro de Funcionários” (para ficar rastreável)

UX/Segurança
- Antes de importar, mostrar um diálogo de confirmação dizendo quantos serão importados.
- Depois de importar, atualizar a tela automaticamente.

Arquivos envolvidos
- src/pages/Demissoes.tsx
- (Possivelmente) src/hooks/useDemissoes.ts (só para invalidar/atualizar queries com mais clareza, seguindo padrão existente)

Como vamos testar (passo a passo)
1) Teste do “Nova Demissão”
   - Abrir RH > Demissões > Nova Demissão
   - Digitar “ALEXANDRE” e NÃO clicar em ninguém: botão deve ficar desabilitado e aparecer dica “selecione na lista”.
   - Clicar em “ALEXANDRE BARBOSA LOPES”, escolher um tipo, clicar em Agendar: deve salvar e aparecer na lista (Agendadas ou Realizadas, conforme o tipo).

2) Teste do “Importar demissões do mês”
   - Em Funcionários, deixar alguns com:
     - situação “PED. DEMISSÃO” / “DEMISSÃO”
     - data_demissao em Fevereiro/2026
   - Ir em RH > Demissões (Fevereiro/2026) e clicar “Importar demissões do mês”
   - Conferir que eles passam a aparecer na lista de Demissões (principalmente em “Realizadas”).

Observação importante (alinhamento de expectativa)
- “Lista de Demissões” hoje é a tabela demissoes.
- A tela “Funcionários” muda apenas o cadastro do funcionário.
- Com o botão “Importar demissões do mês”, você passa a conseguir “trazer para a lista” todos os desligamentos do mês mesmo se foram lançados primeiro no cadastro.

O que eu NÃO vou fazer agora (para não piorar)
- “Zerar demissões” agora. Isso pode apagar histórico e não resolve a causa raiz.
- Alterar o banco/estrutura (migrations) sem necessidade. Dá para resolver com lógica de importação e melhorias de UX.

Entrega
- Ajustes no formulário (impedir submit “mudo” + mensagens claras)
- Botão de importação de desligamentos do mês (Fevereiro/2026 e qualquer mês do seletor)

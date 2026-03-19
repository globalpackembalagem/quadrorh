# 📋 FLUXO COMPLETO DE NOTIFICAÇÕES — QUADRO RH
### Documento de Revisão — Gerado em 25/02/2026

---

## 📌 REGRA GERAL DE DESTINATÁRIOS

| Regra | Descrição |
|-------|-----------|
| **Quem recebe** | Apenas o **gestor do setor** envolvido no evento |
| **Exceção** | **Transferências/Trocas de Turno** → 2 gestores (setor origem + setor destino) |
| **Admin** | **NÃO recebe** notificação (é quem envia da Central) |
| **RH (rh_completo / rh_demissoes)** | **NÃO recebe** notificações automáticas, MAS recebe **respostas** dos gestores no sino |
| **Destinatários fixos** | Admin pode selecionar manualmente os destinatários na Central |
| **recebe_notificacoes = false** | Usuário é ignorado, nunca recebe |

---

## 🔔 TIPOS DE NOTIFICAÇÃO

### 1️⃣ ADMISSÃO (tipo: `admissao` / `ativacao`)

**Gatilho:** Funcionário muda de PREVISÃO → ATIVO (página Previsão de Admissão)

| Etapa | Ação |
|-------|------|
| **Evento criado** | `criarEventoSistema()` cria evento pendente na Central |
| **Admin envia** | Admin revisa e envia pela Central (MODAL ou SINO) |
| **Gestor do setor recebe** | Tipo: `admissao_confirmacao` — com botões **SIM, INICIOU** / **NÃO INICIOU** |
| **Gestor responde** | Resposta cria notificação tipo `admissao_resposta` para **Admin + RH** |
| **Notificação NÃO some** | Até o gestor clicar SIM ou NÃO, a notificação **permanece** no modal |

**Ações automáticas da resposta:**
- SIM, INICIOU → Toast de sucesso
- NÃO INICIOU → Toast informativo

---

### 2️⃣ PREVISÃO DE ADMISSÃO (tipo: `previsao_admissao`)

**Gatilho:** Similar à admissão, para previsões

| Etapa | Ação |
|-------|------|
| **Gestor recebe** | Tipo: `previsao_confirmacao` — botões **SIM, INICIOU** / **NÃO INICIOU** |
| **Gestor responde** | Tipo `previsao_resposta` para **Admin + RH** |
| **Notificação NÃO some** | Permanece até resposta |

**Ações automáticas:**
- SIM → Funcionário muda para situação **ATIVO** automaticamente
- NÃO → Permanece em PREVISÃO

---

### 3️⃣ DEMISSÃO (tipo: `demissao`)

**Gatilho:** Demissão registrada e marcada como "Realizada" na página Demissões

| Etapa | Ação |
|-------|------|
| **Evento criado** | `criarEventoSistema()` automático |
| **Admin envia** | Via Central |
| **Gestor do setor recebe** | Tipo: `demissao_lancada` — botão **CIENTE** |
| **Notificação SOME** | Ao clicar CIENTE |

**Sem resposta de volta** — apenas ciência.

---

### 4️⃣ PEDIDO DE DEMISSÃO (tipo: `pedido_demissao`)

**Gatilho:** Demissão com tipo "Pedido de Demissão"

| Etapa | Ação |
|-------|------|
| **Gestor do setor recebe** | Tipo: `pedido_demissao_lancado` — botão **CIENTE** |
| **Notificação SOME** | Ao clicar CIENTE |

---

### 5️⃣ TRANSFERÊNCIA (tipo: `transferencia`)

**Gatilho:** Transferência realizada/efetivada

| Etapa | Ação |
|-------|------|
| **Evento criado** | `criarEventoENotificar()` com `setor_origem_id` e `setor_destino_id` |
| **2 gestores recebem** | Gestor do setor ORIGEM + Gestor do setor DESTINO |
| **Tipo notificação** | `transferencia_pendente` — botão **CIENTE** |
| **Badge pulsante** | Animação de destaque |

---

### 6️⃣ TROCA DE TURNO (tipo: `troca_turno`)

**Gatilho:** Nova solicitação de troca de turno

| Etapa | Ação |
|-------|------|
| **Evento criado** | `criarEventoENotificar()` |
| **2 gestores recebem** | Gestor ORIGEM + Gestor DESTINO |
| **Tipo notificação** | `transferencia_pendente` — botão **CIENTE** |

---

### 7️⃣ EXPERIÊNCIA — CONSULTA (tipo: `experiencia_consulta`)

**Gatilho:** Admin cria consulta sobre funcionários em período de experiência

| Etapa | Ação |
|-------|------|
| **Admin envia** | Via Central |
| **Gestor do setor recebe** | Tipo: `experiencia_consulta` — botões **EFETIVAR** / **DESLIGAR** |
| **Gestor responde** | Tipo `experiencia_resposta` para **Admin + RH** |
| **Notificação NÃO some** | Permanece até resposta |
| **Badge pulsante** | Animação de destaque |

**Ações automáticas da resposta:**
- EFETIVAR → Registra decisão na tabela `experiencia_decisoes`, gera log de auditoria
- DESLIGAR → Registra decisão, gera log

---

### 8️⃣ COB. FÉRIAS / TREINAMENTO (tipo: `cobertura_treinamento`)

**Gatilho:** Registro individual na página COB. FÉRIAS / TREINAMENTO (sino na linha)

| Etapa | Ação |
|-------|------|
| **Evento criado** | `inserirEventoSemDuplicata()` via sino individual |
| **Admin envia** | Via Central |
| **Gestor do setor recebe** | Tipo: `cobertura_treinamento_consulta` — 3 botões: **SIM, ESTÁ** / **NÃO ESTÁ** / **JÁ RETORNOU** |
| **Gestor responde** | Tipo `cobertura_treinamento_resposta` para **Admin + RH** |
| **Notificação NÃO some** | Permanece até resposta |
| **Badge pulsante** | Animação laranja |

**Ações automáticas da resposta:**
- SIM, ESTÁ → Apenas confirmação (toast)
- NÃO ESTÁ → Cria **divergência automática** na tabela `divergencias_quadro`
- JÁ RETORNOU → Muda situação do funcionário para **ATIVO** e limpa cobertura

---

### 9️⃣ DIVERGÊNCIA NOVA (tipo: `divergencia_nova`)

**Gatilho:** Gestor cria nova divergência

| Etapa | Ação |
|-------|------|
| **Gestor do setor recebe** | Tipo: `divergencia_nova` — botão **CIENTE** |

---

### 🔟 DIVERGÊNCIA RETORNO (tipo: `divergencia_retorno`)

**Gatilho:** Gestor reenvia divergência não resolvida

| Etapa | Ação |
|-------|------|
| **Gestor do setor recebe** | Tipo: `divergencia_retorno` — botão **CIENTE** |

---

### 1️⃣1️⃣ DIVERGÊNCIA FEEDBACK (tipo: `divergencia_feedback`)

**Gatilho:** RH dá feedback em uma divergência

| Etapa | Ação |
|-------|------|
| **Gestor do setor recebe** | Botão **CIENTE** |

---

## 🔒 REGRAS DE FECHAMENTO DO MODAL

| Tipo | Pode fechar sem responder? |
|------|---------------------------|
| `admissao_confirmacao` | ❌ NÃO — deve clicar SIM ou NÃO |
| `previsao_confirmacao` | ❌ NÃO — deve clicar SIM ou NÃO |
| `experiencia_consulta` | ❌ NÃO — deve clicar EFETIVAR ou DESLIGAR |
| `cobertura_treinamento_consulta` | ❌ NÃO — deve clicar uma das 3 opções |
| Todos os outros | ✅ SIM — botão CIENTE ou CIENTE DE TODOS |

**"CIENTE DE TODOS"** e **"X"** fecham apenas as notificações que NÃO exigem confirmação. As que exigem permanecem com aviso: _"X notificação(ões) exigem resposta antes de fechar!"_

---

## 📩 RESPOSTAS DOS GESTORES → QUEM RECEBE

| Tipo de resposta | Destinatários |
|-----------------|---------------|
| `admissao_resposta` | Admin + RH (rh_completo + rh_demissoes) |
| `previsao_resposta` | Admin + RH |
| `experiencia_resposta` | Admin + RH |
| `cobertura_treinamento_resposta` | Admin + RH |

Todas as respostas chegam via **SINO** (notificação lateral).

---

## 🎨 VISUAL DOS BADGES

| Tipo | Cor | Pulsante? |
|------|-----|-----------|
| DEMISSÃO | 🔴 Vermelho | Não |
| PED. DEMISSÃO | 🟡 Âmbar | Não |
| TRANSFERÊNCIA | 🔵 Azul | ✅ Sim |
| ADMISSÃO — INICIOU? | 🟢 Esmeralda | ✅ Sim |
| EXPERIÊNCIA — DECISÃO | 🟡 Âmbar | ✅ Sim |
| COB/TREIN. — CONFIRMAR | 🟠 Laranja | ✅ Sim |
| DIVERGÊNCIA | 🟠 Laranja | Não |
| AVISO RH | 🔵 Primary | Não |
| ↩ Respostas | Variado | Não |

---

## 📊 FLUXO RESUMIDO

```
1. AÇÃO NO SISTEMA (admissão, demissão, transferência, etc.)
   ↓
2. criarEventoSistema() / inserirEventoSemDuplicata()
   ↓
3. EVENTO pendente na CENTRAL DE NOTIFICAÇÕES (notificado=false)
   ↓
4. ADMIN revisa e clica ENVIAR (MODAL ou SINO)
   ↓
5. useEnviarNotificacaoEventos() → identifica GESTOR DO SETOR
   ↓
6. GESTOR recebe notificação no MODAL (tempo real via Realtime)
   ↓
7a. Se tipo simples → CIENTE → notificação some
7b. Se tipo confirmação → RESPONDE (SIM/NÃO/EFETIVAR/etc.)
   ↓
8. RESPOSTA cria nova notificação para ADMIN + RH (sino)
   ↓
9. Ações automáticas executadas (mudar situação, criar divergência, etc.)
```

---

## ⚠️ PREVENÇÃO DE DUPLICATAS

- `inserirEventoSemDuplicata()` verifica se já existe evento pendente (notificado=false) com mesmo `tipo` + `funcionario_nome`
- Se duplicata detectada → evento ignorado com toast informativo

---

*Documento gerado automaticamente — Sistema Quadro RH*

# Manutenção: como o código funciona

Leia antes de mexer. Uso e publicação estão no [README](../README.md).

## 1. O fluxo em uma frase

O cliente monta → `gerarMensagem()` escreve o texto do WhatsApp com uma linha `[ref …]` → você cola a
mensagem no **Orça Aqui** (Agenda → Colar orçamento) → o Orça Aqui manda **só a linha `[ref]`** para
`GET /api/recalcular` deste site → `recalcularReferencia()` refaz a conta pela tabela daqui (ver §5).

**O painel de agendamentos saiu deste site** e mora no Orça Aqui (agenda, pagamentos, etapas, contrato e
recibo). Aqui ficam o montador público, a tabela de preços e as duas rotas públicas de leitura.

O cálculo e a mensagem moram em [lib/orcamento.ts](../lib/orcamento.ts), cobertos por
[lib/orcamento.test.ts](../lib/orcamento.test.ts); a API em [lib/recalculo.ts](../lib/recalculo.ts).

## 2. Regras de negócio (onde estão)

| Regra | Onde |
|---|---|
| Preços, pacotes, prazos, extras, deslocamento, auxiliar, sinal | `CATALOGO` em [lib/catalogo.ts](../lib/catalogo.ts) |
| Nome de apresentação (cabeçalho, título, mensagem, login) | `MARCA` em `catalogo.ts` → `CATALOGO.marca` / `contato.nome` |
| Hora extra: ensaio R$35 / evento R$45 (só nos pacotes fechados) | `Categoria.horaExtra` |
| Foto extra dos pacotes fechados: R$12; **todas** a R$10 a partir de 15 (ensaio) ou 50 (evento). Separada da foto do Personalizado | `Categoria.foto` + `precoFoto()` |
| Prazo de entrega: cada pacote tem o seu (`prazo`, id `"padrao"`, sem custo) | `Pacote.prazo` + `prazoEntrega()` |
| Expressas só no pacote que oferece (ensaio Completo 36h +40 / 24h +50; evento Padrão 24h +60; evento Completo 1–3 dias +80) | `OpcaoEntrega.pacotes` + `entregaValeNo()`; `normalizarSelecao()` volta ao padrão |
| Personalizado: tempo × valor da hora (ensaio R$30 em blocos de 15 min, mínimo 15 min; evento R$45 em blocos de 30 min, mínimo 1h) + fotos a R$6, **todas** a R$4,50 a partir de 30 (ensaio) ou 60 (evento); mínimo 5 fotos (ensaio) / 20 (evento); sem hora extra nem foto extra | `Categoria.personalizado` + `valorCobertura()` / `precoFoto()`; `calcular()` |
| Prazo do Personalizado pelas fotos: até 10 → 24h · até 30 → 36–48h · até 50 → 3 dias · mais → 3–5 dias com parciais | `prazosPersonalizado` + `prazoPorFotos()` |
| Sessão Rápida: aparece só com `ativo: true` (datas especiais de agenda coletiva) | `Pacote.ativo` + `pacoteDisponivel()` |
| Deslocamento: até 10 km grátis · 10–20 km +R$25 · 20–30 km +R$45 · acima de 30 km a combinar (fora do total) | `deslocamentos`; `aCombinar` → linha `tipo: "aCombinar"` |
| Fotógrafo auxiliar: R$90/diária com alimentação e transporte; R$120 sem, mais deslocamento | `auxiliar.modos` (`cobraDeslocamento`) + `cobraDeslocamento()` |
| Sinal: 40% do total, **arredondado para cima** em reais inteiros, em todos os serviços | `CATALOGO.sinalPercentual` + `valorSinal()` (o Orça Aqui grava o % no agendamento) |
| Saíram na v4 (só leitura de orçamentos antigos): "Edição de fotos", retoque pesado, fotos brutas, preço de lançamento | `Categoria.legado`, `legadoEdicao`; `fb` da `[ref]` é ignorado |
| Incluso, chuva, cancelamento, remarcação, reedição: **cláusulas do contrato**, fora do site | contrato e extras de pós-venda ficam no Orça Aqui |
| Validade do orçamento: 7 dias | `CATALOGO.validadeDias` |

## 3. A linha `[ref …]`, ou por que quem recebe não confia no total escrito

O cliente pode editar a mensagem no WhatsApp antes de enviar. Por isso a mensagem leva, no fim:

```
[ref EJ-7K2M9 v1 em=2026-10-09 c=evento p=ev-curta he=1 en=4d dt=2026-12-15 hr=16:00]
```

| chave | campo |
|---|---|
| `EJ-XXXXX` | código (sem 0/O/1/I/L) |
| `v1` | versão do catálogo usada pelo cliente |
| `em` | data em que o orçamento foi emitido |
| `c` / `p` | categoria / pacote |
| `he fe mp fp ax` | horas extras, fotos extras, minutos e fotos do Personalizado, diárias de auxiliar |
| `hp` | horas inteiras do Personalizado, só em orçamentos da v4 (lido como `hp × 60` minutos) |
| `am=sem` | auxiliar sem alimentação e transporte (ausente = com) |
| `ed rt fb` | só em orçamentos antigos (edição, retoque, fotos brutas); `fb` é ignorado |
| `en` / `ds` | entrega / deslocamento (omitidos quando são o padrão) |
| `dt` / `hr` | data / horário desejados |

O Orça Aqui refaz a conta a partir dessa linha (pela API do §5). Nome, telefone, local e observações
vêm das linhas com rótulo (`*Cliente:*`, `*WhatsApp:*`…), lidas lá, com ou sem os asteriscos — por
isso os rótulos da mensagem também são contrato: não renomeie.

**Compatibilidade:** mensagens antigas continuam circulando por dias. Ao mudar o formato, mantenha a
leitura do formato anterior. Os ids de pacote (`ev-curta`…) e de entrega (`4d`…) **nunca** devem ser
renomeados: crie um id novo e marque o antigo com `legado: true` (some do montador, a API ainda lê).
Apague o legado só depois que os orçamentos velhos expirarem. Foi assim na tabela v3: os eventos novos
são `ev-essencial`, `ev-padrao3` e `ev-completo`, porque `ev-padrao` já existia com outro conteúdo.

**Descontos combinados na conversa:** a API recalcula pela tabela de agora. Desconto ou valor fechado
com o cliente vai no `valorCombinado` do agendamento, no Orça Aqui.

## 4. Receitas

**Ligar/desligar a Sessão Rápida:** `ativo` do pacote `en-rapida` em `catalogo.ts`.

**Mudar um preço:** edite `CATALOGO` e aumente `versao`. Rode `npm test`, porque alguns testes conferem
valores e precisam ser atualizados junto, de propósito.

**Novo pacote:** acrescente em `pacotes` com um `id` novo e a `categoria` certa. O montador e a API
leem a lista. `destaque: true` mostra o selo "Mais escolhido".

**Novo prazo ou expressa:** o prazo padrão é o `prazo` do pacote. Expressa nova vai em `entregas`, com id
novo e `pacotes: [...]` dizendo onde aparece. O id `padrao` (entrega) e o `ate10` (deslocamento) são os
valores omitidos na `[ref]`. Não os renomeie.

**Nova categoria:** além do catálogo, ajuste o tipo `CategoriaId`, `CATEGORIAS_VALIDAS` e
`normalizarSelecao()` em `orcamento.ts` (quais campos valem para ela), o ícone em `Montador.tsx` e os
blocos condicionais do montador.

**Etapas do agendamento:** são configuradas no Orça Aqui (Empresa → Orçamento e agenda).

## 5. API pública para o Orça Aqui

O painel foi para o Orça Aqui (ver `PLANO-INTEGRACAO-ORCAAQUI.md`, na pasta acima do repositório). Para a
tabela de preços continuar num lugar só, este site expõe duas rotas **sem login e sem dados pessoais**,
com `Access-Control-Allow-Origin: *`. O Orça Aqui usa as duas: o catálogo no montador dele ("Tabela do
EJ") e o recálculo ao colar uma mensagem `[ref EJ-…]`.

| Rota | O que devolve |
|---|---|
| `GET /api/recalcular?ref=[ref EJ-… …]` | `{ ok, recalculo: { versaoApi, versaoTabela, versaoRef, codigo, emitidoEm, data, horario, selecao, servico, linhas, total, totalEhMinimo, sinalPercentual, sinal, restante, prazo, pendencias, avisos } }`, ou `{ ok: false, erro }` com status 400 |
| `GET /api/catalogo` | O `CATALOGO` em JSON + `versaoApi` (estático, muda a cada deploy). A última faixa de `prazosPersonalizado` tem `ateFotos: null` ("sem limite") |

- Recebe **só a linha `[ref]`**: nome, telefone e local ficam no Orça Aqui.
- A lógica fica em [lib/recalculo.ts](../lib/recalculo.ts), coberta por `lib/recalculo.test.ts`.
- **Isto é um contrato com outro sistema:** mudou um campo, mantenha o antigo ou suba `VERSAO_API`.
- A tabela antiga não bloqueia: vira aviso.

## 6. Armadilhas

- **Datas são texto `AAAA-MM-DD`**, nunca `Date`: `new Date("2026-12-15")` é meia-noite UTC, ou seja,
  dia 14 em Teresina. As contas usam UTC dos dois lados ([lib/formato.ts](../lib/formato.ts)).
- **Classes Tailwind conflitantes** (`w-full` + `w-28`): sem tailwind-merge, quem vence é a ordem do
  CSS gerado, não a ordem na string. Por isso `classesEntrada` não fixa largura, e altura forçada usa
  `h-11!`. Já deu bug: o campo de descrição do pagamento ficou espremido.
- **Rascunho do montador**: a gravação no localStorage só começa depois de restaurar (estado
  `restaurado`). Com `useRef`, o modo de desenvolvimento (efeitos rodando duas vezes) apagava o rascunho.
- **O Netlify roda `npm install` puro.** Conflito de dependência derruba o deploy. Se `npm install` não
  passa limpo, não vai ao ar. Nesta máquina o install precisa do espelho
  `--registry=https://registry.yarnpkg.com`.
- **Texto livre na mensagem** (nome, local, observações) vira uma linha só, sem `[`, `]` e `*`, para não
  confundir a leitura das linhas com rótulo e da `[ref]`.

## 7. Histórico

- O painel (login pelo Netlify Identity, agenda no Netlify Blobs em `ej-fotografia/agenda.json`) foi
  removido daqui quando a Agenda do Orça Aqui entrou no ar. A agenda antiga não foi migrada (decisão do
  plano de integração); o blob pode ficar guardado no Netlify como cópia até não fazer mais falta.

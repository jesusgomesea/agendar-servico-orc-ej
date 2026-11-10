# Eluan Jesus Fotografia — Orçamento online

Site público onde o cliente escolhe o serviço (ensaio, evento ou fotógrafo auxiliar), o pacote e os
extras, vê o valor na hora e envia o orçamento pronto pelo WhatsApp.

**O painel de agendamentos saiu daqui e mora no [Orça Aqui](https://github.com/jesusgomesea/orcaaqui)**
(agenda, pagamentos, etapas, contrato e recibo). Este site continua sendo a **fonte da tabela de preços**:
o Orça Aqui lê os pacotes e recalcula os orçamentos pelas rotas públicas `/api/catalogo` e
`/api/recalcular` daqui. Sem login e sem banco de dados.

> Manutenção (como o código funciona, receitas e armadilhas): [docs/MANUTENCAO.md](docs/MANUTENCAO.md)

## Como funciona no dia a dia

1. Você divulga o link do site (Instagram, WhatsApp, cartão).
2. O cliente monta o orçamento e toca em **Enviar pelo WhatsApp**. A mensagem chega no seu número já
   com o código (`EJ-XXXXX`) e uma linha `[ref …]` no final.
3. No **Orça Aqui**, em **Agenda → Colar orçamento**, cole a mensagem inteira. Ele manda **só a linha
   `[ref]`** para este site, que **refaz a conta pela tabela de preços**; o Orça Aqui avisa se o cliente
   alterou o total, cria o orçamento aprovado e o agendamento.

## Mudar preços

**Sinal:** 40% do total, arredondado para cima (`sinalPercentual` em [lib/catalogo.ts](lib/catalogo.ts)).

**Prazos de entrega:** cada pacote tem o seu (`prazo`); as expressas ficam em `entregas`, com a lista de
pacotes que as oferecem. O Personalizado usa `prazosPersonalizado` (pela quantidade de fotos).

**Sessão Rápida:** troque `ativo` do pacote `en-rapida` para mostrar ou esconder no site.

**Nome exibido:** `MARCA` no topo de [lib/catalogo.ts](lib/catalogo.ts) vale para o site todo.

Os valores estão todos em [lib/catalogo.ts](lib/catalogo.ts). Ao mudar qualquer preço, **aumente
`versao`** no topo do catálogo: o Orça Aqui avisa quando alguém mandar um orçamento feito com a tabela
antiga. A mudança vai ao ar com um novo deploy, e o Orça Aqui passa a usar a tabela nova na hora.

## Testar no computador

**Jeito rápido:** dê dois cliques em **`Testar.bat`**. Ele instala o que faltar, sobe o site e abre o
navegador em `http://localhost:3000`. Para parar, feche a janela preta.

**Pelo terminal:**

```bash
npm install --registry=https://registry.yarnpkg.com
```

```bash
npm run dev
```

- `npm test` roda os testes das regras de preço, da mensagem e da API de recálculo.
- `npm run typecheck` e `npm run build` conferem tipos e o build de produção.

## Publicar no Netlify

> Detalhes e o que desligar depois da saída do painel: [docs/NETLIFY.md](docs/NETLIFY.md).

1. Suba o repositório no GitHub e, no Netlify, **Add new project → Import from Git**. O
   [netlify.toml](netlify.toml) já define build e plugin, então não precisa preencher nada.
2. Pronto: todo push na `main` publica sozinho. Não há variável de ambiente nem login para configurar.

## Estrutura

```
app/                 páginas (Next.js App Router)
  page.tsx           montador público
  api/catalogo/      tabela em JSON (pública, usada pelo Orça Aqui)
  api/recalcular/    recálculo de uma linha [ref] (pública, usada pelo Orça Aqui)
components/
  montador/          montador e resumo do orçamento
  ui/                botão, campos, contador, avisos
lib/
  catalogo.ts        TABELA DE PREÇOS
  orcamento.ts       cálculo, sinal, mensagem do WhatsApp e leitura da [ref]
  recalculo.ts       resposta da API de recálculo (contrato com o Orça Aqui)
  formato.ts         dinheiro e datas
```

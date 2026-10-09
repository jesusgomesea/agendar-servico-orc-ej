# Eluan Jesus Fotografia — Orçamento online

Site com duas partes:

- **Montador público (`/`)**: o cliente escolhe o serviço (ensaio, evento, fotógrafo auxiliar ou edição),
  o pacote e os extras, vê o valor e o sinal na hora e envia o orçamento pronto pelo WhatsApp.
- **Painel (`/painel`, com login)**: você cola a mensagem recebida no WhatsApp e ela vira um agendamento,
  com etapas (Recebido → Confirmado → Sinal pago → Realizado → Prévia enviada → Entregue), valores,
  pagamentos e notas.

Hospedado no **Netlify**: login pelo **Netlify Identity** e dados no **Netlify Blobs**. Não há banco
de dados nem serviço pago à parte.

> Manutenção (como o código funciona, receitas e armadilhas): [docs/MANUTENCAO.md](docs/MANUTENCAO.md)

## Como funciona no dia a dia

1. Você divulga o link do site (Instagram, WhatsApp, cartão).
2. O cliente monta o orçamento e toca em **Enviar pelo WhatsApp**. A mensagem chega no seu número já
   com o código (`EJ-XXXXX`) e uma linha `[ref …]` no final.
3. No painel, toque em **Colar orçamento** e cole a mensagem inteira. O painel lê o texto, **refaz a
   conta pela tabela de preços** e avisa se o cliente alterou o total antes de enviar.
4. Toque em **Criar agendamento**. Depois é só ir mudando a etapa, registrar o sinal e os pagamentos.

O botão **Cópia** no painel baixa a agenda inteira em JSON. Vale guardar uma cópia de vez em quando.

## Mudar preços

Os valores estão todos em [lib/catalogo.ts](lib/catalogo.ts). Ao mudar qualquer preço, **aumente
`versao`** no topo do catálogo. Assim o painel avisa quando alguém mandar um orçamento feito com a
tabela antiga. Por enquanto, a mudança vai ao ar com um novo deploy. A edição pelo painel está prevista
para a Fase 2.

## Testar no computador

**Jeito rápido:** dê dois cliques em **`Testar.bat`**. Ele instala o que faltar, sobe o site em
**modo local** e abre o navegador em `http://localhost:3000`. O painel fica em
`http://localhost:3000/painel`, **sem login**, e a agenda é salva em `.dados-locais/agenda.json`
neste computador. Para parar, feche a janela preta. Para começar a agenda do zero, apague a pasta
`.dados-locais`.

O modo local só existe no servidor de desenvolvimento. O site publicado no Netlify nunca entra nele
(ver [lib/modoLocal.ts](lib/modoLocal.ts)).

**Pelo terminal:**

```bash
npm install --registry=https://registry.yarnpkg.com
```

```bash
npm run dev:next
```

- `npm run dev:next` sobe o site (`http://localhost:3000`). Com `NEXT_PUBLIC_PAINEL_LOCAL=1` em
  `.env.development.local` (o `Testar.bat` cria esse arquivo), o painel abre em modo local. Sem ele, o
  painel pede login e, sem o Netlify Identity, volta para `/entrar`.
- Para testar o painel de verdade localmente: `npm run dev` (usa `netlify dev`, exige o
  [Netlify CLI](https://docs.netlify.com/cli/get-started/) e `netlify link` com o site já criado).
- `npm test` roda os testes das regras de preço e da leitura do texto colado.
- `npm run typecheck` e `npm run build` conferem tipos e o build de produção.

## Publicar no Netlify (primeira vez)

1. Suba o repositório no GitHub e, no Netlify, **Add new project → Import from Git**. O
   [netlify.toml](netlify.toml) já define build e plugin, então não precisa preencher nada.
2. **Project configuration → Environment variables**: crie `EMAILS_PAINEL` com o seu e-mail (se houver
   mais de um, separe por vírgula). **Sem essa variável ninguém entra no painel**, e isso é de propósito.
3. **Identity → Enable Identity**.
4. **Identity → Registration preferences → Invite only.** Ninguém cria conta sozinho.
5. **Identity → Invite users**: convide o seu e-mail. O link do e-mail abre o site, e você escolhe a senha.
6. (Opcional) **Identity → Emails**: traduza os modelos de convite e de recuperação de senha, que
   chegam em inglês.
7. Para conferir se o Identity está ligado: abra `https://SEU-SITE.netlify.app/.netlify/identity/settings`
   (404 significa desligado).

Depois disso, todo push na `main` publica sozinho.

## Estrutura

```
app/                 páginas (Next.js App Router)
  page.tsx           montador público
  painel/            painel (login)
  api/agenda/        única rota de servidor: lê/grava a agenda
  entrar, recuperar-senha, nova-senha, aceitar-convite/   telas de login
components/
  montador/          montador e resumo do orçamento
  painel/            lista, colar orçamento, detalhe do agendamento
  auth/              sessão do Identity e telas de senha
  ui/                botão, campos, contador, modal, avisos
lib/
  catalogo.ts        TABELA DE PREÇOS
  orcamento.ts       cálculo, sinal, mensagem do WhatsApp e leitura do texto colado
  agenda.ts          modelo do agendamento (pago, restante, etapas)
  formato.ts         dinheiro e datas
  server/            Netlify Blobs e controle de acesso (só servidor)
```

# Configurar o ambiente no Netlify

Passo a passo para colocar o site no ar pela primeira vez e deixar o painel funcionando. Uso no dia a
dia: [README](../README.md). Como o código funciona: [MANUTENCAO.md](MANUTENCAO.md).

## O que o site usa do Netlify

| Recurso | Para quê | Precisa configurar? |
|---|---|---|
| Build + deploy pelo GitHub | Publica a cada push na `main` | Sim, uma vez (passo 1) |
| Plugin `@netlify/plugin-nextjs` | Transforma `/api/agenda` em função de servidor (Functions v2) | Não, o [netlify.toml](../netlify.toml) já declara |
| **Netlify Identity** | Login do painel (convite, senha, recuperação) | **Sim** (passos 3 a 5) |
| **Netlify Blobs** | Guarda a agenda (store `ej-fotografia`, chave `agenda.json`) | Não, é criado sozinho na primeira gravação |
| Variável `EMAILS_PAINEL` | Lista de quem pode abrir o painel | **Sim** (passo 2) |

O plano gratuito do Netlify basta para esse volume.

## Checklist

- [ ] 1. Projeto criado a partir do GitHub e primeiro deploy verde
- [ ] 2. `EMAILS_PAINEL` definida e novo deploy feito
- [ ] 3. Identity ligado
- [ ] 4. Cadastro em **Invite only**
- [ ] 5. Sua conta criada (convite para o seu próprio e-mail) e senha definida
- [ ] 6. Teste completo: orçamento → colar no painel → agendamento salvo
- [ ] 7. (Opcional) Domínio próprio
- [ ] 8. (Opcional) E-mails do Identity em português

## 1. Criar o projeto

1. Entre em [app.netlify.com](https://app.netlify.com) (dá para entrar com a conta do GitHub).
2. **Add new project → Import an existing project → GitHub** e escolha
   `jesusgomesea/agendar-servico-orc-ej`. Se o repositório não aparecer, autorize o app do Netlify a
   ver esse repositório no GitHub.
3. Na tela de configuração **não preencha nada**: comando de build (`npm run build`), pasta (`.next`) e
   plugin vêm do `netlify.toml`. Branch de produção: `main`.
4. **Deploy.** O primeiro build leva alguns minutos. Ao terminar, o site abre em
   `https://NOME-ALEATORIO.netlify.app`. Dá para trocar o nome em
   **Project configuration → General → Project details → Change project name**.

Se o build falhar, abra o log do deploy. A causa mais comum é `package-lock.json` fora de sincronia
com o `package.json` (o Netlify roda `npm install` puro). O GitHub Actions ([checks.yml](../.github/workflows/checks.yml))
roda `npm ci` a cada push justamente para avisar disso antes.

## 2. Variável `EMAILS_PAINEL`

1. **Project configuration → Environment variables → Add a variable → Add a single variable**.
2. Chave: `EMAILS_PAINEL`. Valor: o seu e-mail. Para mais de uma pessoa, separe por vírgula
   (`eu@exemplo.com,assistente@exemplo.com`). Maiúsculas e espaços não importam.
3. Escopo: pode deixar **All scopes** e o mesmo valor em todos os contextos.
4. **Faça um novo deploy** (**Deploys → Trigger deploy → Deploy project**). Variável nova só vale
   para deploys feitos depois dela.

Sem essa variável **ninguém** entra no painel, nem com login válido. O painel mostra "Painel sem dono
configurado". É de propósito (ver [lib/server/acesso.ts](../lib/server/acesso.ts)).

Não defina `NEXT_PUBLIC_PAINEL_LOCAL` no Netlify. Ela só serve para o modo local e, mesmo se vazar,
não tem efeito no site publicado.

## 3. Ligar o Identity

1. **Project configuration → Identity → Enable Identity**.
2. Para conferir: abra `https://SEU-SITE.netlify.app/.netlify/identity/settings`. Com o Identity
   ligado aparece um JSON. Com 404, está desligado.

Não ative provedores externos (Google, GitHub…). O site só tem login por e-mail e senha.

## 4. Fechar o cadastro

**Identity → Registration → Registration preferences → Invite only.**

Isso impede que qualquer pessoa crie conta. A lista `EMAILS_PAINEL` é uma segunda trava: mesmo que
alguém mude isso para "Open" por engano, quem não está na lista não vê a agenda.

## 5. Criar a sua conta (o Netlify chama de "convite")

O painel é só seu. Com o cadastro em "Invite only", a única forma de uma conta existir é o dono do
projeto mandar um convite, então **você convida o seu próprio e-mail, uma vez só**. Ninguém mais é
convidado. Para outra pessoa entrar, seria preciso convidá-la **e** pôr o e-mail dela em
`EMAILS_PAINEL`.

1. **Identity → Invite users** e informe o mesmo e-mail que está em `EMAILS_PAINEL`.
2. O e-mail de convite (em inglês, se você não fizer o passo 8) tem um link para o site. Abra
   **no navegador do aparelho onde vai usar o painel**.
3. O site leva para **/aceitar-convite**, onde você escolhe a senha. Depois disso já cai no painel.
4. Nos outros aparelhos, entre por `https://SEU-SITE.netlify.app/entrar`.

Esqueceu a senha: em `/entrar`, toque em **Esqueci minha senha**. O link do e-mail leva para `/nova-senha`.

## 6. Teste completo

1. Abra o site no celular, monte um orçamento e envie pelo WhatsApp para você mesmo.
2. No painel, **Colar orçamento**, cole a mensagem e **Criar agendamento**.
3. Recarregue a página: o agendamento tem que continuar lá (está salvo no Blobs).
4. Abra o painel em outro aparelho e confira se aparece o mesmo agendamento.

Para ver os dados direto no Netlify: **Project configuration → Blobs** (ou a aba **Blobs** do projeto),
store `ej-fotografia`. O botão **Cópia** do painel baixa o mesmo conteúdo em JSON.

## 7. (Opcional) Domínio próprio

**Domain management → Add a domain** e siga as instruções de DNS. O HTTPS é emitido sozinho. Depois de
trocar o domínio, os links de convite e recuperação de senha passam a usar o domínio principal.

## 8. (Opcional) E-mails em português

Em **Identity → Emails** dá para trocar o assunto e o modelo de cada e-mail (convite, confirmação,
recuperação de senha, troca de e-mail). O modelo é um arquivo HTML **dentro do site publicado**, por
exemplo `/emails/convite.html` (arquivo em `public/emails/convite.html`). Os links do e-mail precisam
manter as variáveis do Netlify (`{{ .SiteURL }}`, `{{ .Token }}`), no formato
`{{ .SiteURL }}/#invite_token={{ .Token }}` para convite e `#recovery_token=` para recuperação.
O site já trata esses links em qualquer página ([ProvedorSessao.tsx](../components/auth/ProvedorSessao.tsx)).

## Testar com Netlify de verdade no computador (opcional)

Para o dia a dia, o `Testar.bat` (modo local, sem login) basta. Para testar o login e o Blobs reais:

```bash
npm install -g netlify-cli --registry=https://registry.yarnpkg.com
```

```bash
netlify login
```

```bash
netlify link
```

```bash
npm run dev
```

`npm run dev` roda `netlify dev`, que usa as variáveis e o Identity do projeto vinculado. **Atenção:**
os dados lidos e gravados são os do site publicado.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "Painel sem dono configurado" | `EMAILS_PAINEL` faltando, ou criada sem novo deploy |
| "Esta conta não tem acesso ao painel" | O e-mail do login não está em `EMAILS_PAINEL` |
| Login volta sempre para `/entrar` | Identity desligado (confira o passo 3) |
| Link do convite abre o site mas não pede senha | Abriu em outro navegador ou aba anônima depois de já ter usado o link. Reenvie o convite |
| Deploy falha no `npm install` | `package-lock.json` desatualizado. Rode `npm install` localmente e faça commit do lock |
| "A agenda foi alterada em outro aparelho" | Normal: dois aparelhos ou abas gravaram juntos. O painel recarrega com a versão mais nova |

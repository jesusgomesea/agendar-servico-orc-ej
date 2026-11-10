# Netlify: publicar o site

O site é o montador público + duas rotas públicas de leitura (`/api/catalogo` e `/api/recalcular`),
usadas pelo Orça Aqui. **Não tem login, banco nem variável de ambiente.**

## Publicar pela primeira vez

1. Entre em [app.netlify.com](https://app.netlify.com) (dá para entrar com a conta do GitHub).
2. **Add new project → Import an existing project → GitHub** e escolha
   `jesusgomesea/agendar-servico-orc-ej`. Se o repositório não aparecer, autorize o app do Netlify a
   ver o repositório.
3. Não preencha nada: o [netlify.toml](../netlify.toml) já traz o comando de build e o plugin do Next.
4. Depois do deploy, confira:
   - o site abre e o montador calcula;
   - `https://SEU-SITE.netlify.app/api/catalogo` devolve JSON;
   - no Orça Aqui, **Empresa → Orçamento e agenda → Tabela do EJ → Testar** conecta.

Todo push na `main` publica sozinho.

## Depois que o painel saiu daqui (uma vez só)

O painel de agendamentos foi para o Orça Aqui. No painel do Netlify deste site:

- [ ] **Identity → Disable Identity.** Ninguém mais entra por aqui; os convites e contas antigos deixam
      de existir.
- [ ] **Project configuration → Environment variables:** apague `EMAILS_PAINEL` (e
      `NEXT_PUBLIC_PAINEL_LOCAL`, se existir).
- [ ] **Blobs:** o store `ej-fotografia` (chave `agenda.json`) tem a agenda antiga. Pode ficar guardado
      como cópia; apague só quando tiver certeza de que não precisa mais.

## Domínio próprio

**Domain management → Add a domain.** O Netlify mostra os registros DNS para criar no seu provedor e
emite o certificado HTTPS sozinho. Se trocar o domínio, atualize o endereço em **Empresa → Orçamento e
agenda → Tabela do EJ** no Orça Aqui.

## Problemas comuns

| O que aparece | Causa provável |
|---|---|
| Deploy falha no `npm install` | Conflito de dependência: rode `npm install` localmente e corrija antes do push |
| Orça Aqui diz que o site do EJ não respondeu | Endereço errado em Empresa → Tabela do EJ, ou deploy com erro aqui |
| Orça Aqui avisa "tabela v…" antiga | Normal quando o preço muda: o orçamento foi montado com a tabela anterior |

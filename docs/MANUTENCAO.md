# Manutenção: como o código funciona

Leia antes de mexer. Uso e publicação estão no [README](../README.md).

## 1. O fluxo em uma frase

O cliente monta → `gerarMensagem()` escreve o texto do WhatsApp com uma linha `[ref …]` → você cola no
painel → `lerTextoColado()` lê a `[ref]`, **recalcula** pela tabela e mostra avisos → `criarDeLeitura()`
gera o agendamento → `/api/agenda` grava no Netlify Blobs.

Tudo isso mora em [lib/orcamento.ts](../lib/orcamento.ts) e [lib/agenda.ts](../lib/agenda.ts), cobertos
por [lib/orcamento.test.ts](../lib/orcamento.test.ts).

## 2. Regras de negócio (onde estão)

| Regra | Onde |
|---|---|
| Preços, pacotes, extras, entregas, deslocamento, incluso, políticas | `CATALOGO` em [lib/catalogo.ts](../lib/catalogo.ts) |
| Foto extra: R$13; com 10 ou mais, **todas** saem a R$11 | `precoFotoExtra()` |
| Foto bruta: 0 ou no mínimo 20 | `calcular()` (pendência) + `Contador` com `minimoQuandoAtivo` |
| Hora extra: ensaio R$60 / evento R$90 | `Categoria.horaExtra` |
| Deslocamento acima de 10 km: "a combinar", fora do total | `OpcaoDeslocamento.aCombinar` → linha `tipo: "aCombinar"` |
| Fotógrafo auxiliar: "a partir de R$100" por diária | linha `tipo: "aPartirDe"` |
| **Sinal desligado por enquanto** (10/10/2026): some do site, da mensagem e do painel | `COBRAR_SINAL` em `catalogo.ts` → `CATALOGO.cobrarSinal` |
| Sinal (quando ligado): 20% com 60+ dias · 35% com 15–59 · 50% com menos de 15 | `CATALOGO.sinal` + `percentualSinal()` |
| Sinal é contado da **data do orçamento** (`emitidoEm`) até a data do serviço | idem; ao mudar a data no painel, recalcula com o mesmo `emitidoEm` |
| Validade do orçamento: 7 dias | `CATALOGO.validadeDias` |
| Remarcação R$45 / reedição R$18 | texto em `politicas` + atalhos `EXTRAS_RAPIDOS` no detalhe |

## 3. A linha `[ref …]`, ou por que o painel não confia no total escrito

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
| `he fe fb ed rt ax` | horas extras, fotos extras, fotos brutas, edições, retoques, diárias de auxiliar |
| `en` / `ds` | entrega / deslocamento (omitidos quando são o padrão) |
| `dt` / `hr` | data / horário desejados |

O painel refaz a conta a partir dessa linha. Nome, telefone, local e observações vêm das linhas com
rótulo (`*Cliente:*`, `*WhatsApp:*`…), lidas com ou sem os asteriscos.

**Compatibilidade:** mensagens antigas continuam circulando por dias. Ao mudar o formato, mantenha a
leitura do formato anterior. Os ids de pacote (`ev-curta`…) e de entrega (`4d`…) **nunca** devem ser
renomeados: crie um id novo e remova o antigo do montador só depois que os orçamentos velhos expirarem.

## 4. Receitas

**Mudar um preço:** edite `CATALOGO` e aumente `versao`. Rode `npm test`, porque alguns testes conferem
valores e precisam ser atualizados junto, de propósito.

**Novo pacote:** acrescente em `pacotes` com um `id` novo e a `categoria` certa. O montador e o painel
leem a lista. `destaque: true` mostra o selo "Mais escolhido".

**Nova opção de entrega ou deslocamento:** acrescente em `entregas`/`deslocamentos`. O id `padrao` (entrega) e
o id `ate10` (deslocamento) são os valores omitidos na `[ref]`. Não os renomeie.

**Nova categoria:** além do catálogo, ajuste o tipo `CategoriaId`, `CATEGORIAS_VALIDAS` e
`normalizarSelecao()` em `orcamento.ts` (quais campos valem para ela), o ícone em `Montador.tsx` e os
blocos condicionais do montador.

**Nova etapa do agendamento:** acrescente em `ETAPAS` ([lib/agenda.ts](../lib/agenda.ts)) e uma cor em
[SeloStatus.tsx](../components/painel/SeloStatus.tsx).

## 5. Dados e acesso

- **Uma chave só** no Netlify Blobs: store `ej-fotografia`, chave `agenda.json`, no formato
  `{ versao, agendamentos[] }`. Leitura e gravação em [lib/server/agenda.ts](../lib/server/agenda.ts).
- **Conflito entre aparelhos:** o PUT manda `versaoBase`, e o servidor grava com `onlyIfMatch` (etag).
  Se outro aparelho gravou antes, a resposta é 409 e o painel recarrega. Comparar só o número da versão
  deixaria uma janela entre ler e gravar.
- **Consistência `strong`** no Blobs: sem ela, recarregar logo após salvar pode mostrar o estado antigo,
  e a gravação seguinte cai em conflito. Se a função chegar sem suporte à leitura forte
  (`BlobsConsistencyError`) ou ela não responder em 1,2 s, `lerDoBlob()` cai para a leitura eventual; a
  gravação segue protegida pelo etag.
- **O Blobs usa o `fetch` original**, não o que o Next.js põe por cima do global (`_nextOriginalFetch`).
  No Netlify, a leitura com o `fetch` do Next travava até a função ser cortada (502).
- **O Blobs repete calado as chamadas que falham** (5xx, 429, 403, erro de rede; até 5 vezes, 5 s entre
  elas). Um erro do Blobs parece "travou". Por isso o `fetch` passado a ele anota status e host da última
  resposta (`ultimaTentativaBlobs()`), e a mensagem de erro do painel mostra esse dado.
- **`res.body.cancel()` nunca termina no Netlify.** O Blobs chama isso para descartar o corpo do 404
  (agenda ainda não existe), do 412 (conflito) e de toda gravação. Já travou a primeira leitura e as
  gravações (502). `semCorpoSeDescartavel()` entrega ao Blobs essas respostas sem corpo. Só o GET 200
  mantém o corpo. Não remova ao atualizar o `@netlify/blobs` sem testar a agenda vazia no Netlify.
- **Falha no servidor não derruba a função:** `/api/agenda` responde 500 com a causa na mensagem (aparece
  no painel) e registra o detalhe nos logs da função (**Logs → Functions** no Netlify). Cada etapa de
  rede (login no Identity, leitura e gravação no Blobs) tem limite de 3 s (`comLimite`), e a soma fica
  abaixo do corte de ~10 s do Netlify. Assim a mensagem diz qual etapa travou, em vez de um 502 mudo.
- **Acesso:** [lib/server/acesso.ts](../lib/server/acesso.ts) exige login no Identity **e** e-mail
  em `EMAILS_PAINEL`. Sem a variável, ninguém entra (falha fechada). Assim, deixar o Identity em "Open"
  por engano não expõe nomes e telefones de clientes.
- O agendamento guarda **cópia** dos itens e do total (`itens`, `totalOrcado`). Mudar a tabela não altera
  o que já foi combinado. `valorCombinado` substitui o orçado quando você fecha outro valor (ex.: com o
  deslocamento). Extras de pós-venda somam por cima.

## 6. Modo local (testar sem Netlify)

[lib/modoLocal.ts](../lib/modoLocal.ts): com `next dev` **e** `NEXT_PUBLIC_PAINEL_LOCAL=1`
(em `.env.development.local`, fora do git), o `Protegido` deixa passar sem login,
`verificarAcesso()` libera a API, e a agenda vai para `.dados-locais/agenda.json` em vez do Blobs.
Usa-se pelo `Testar.bat`. A exigência de `NODE_ENV === "development"` é a trava: o `next build`
sempre roda em produção, então nem uma variável esquecida no Netlify liga este modo no site publicado.
Ao mexer em acesso ou armazenamento, mantenha os dois caminhos.

## 7. Armadilhas

- **Datas são texto `AAAA-MM-DD`**, nunca `Date`: `new Date("2026-12-15")` é meia-noite UTC, ou seja,
  dia 14 em Teresina. As contas usam UTC dos dois lados ([lib/formato.ts](../lib/formato.ts)).
- **Classes Tailwind conflitantes** (`w-full` + `w-28`): sem tailwind-merge, quem vence é a ordem do
  CSS gerado, não a ordem na string. Por isso `classesEntrada` não fixa largura, e altura forçada usa
  `h-11!`. Já deu bug: o campo de descrição do pagamento ficou espremido.
- **Botão "Colar" do painel:** celulares costumam negar `navigator.clipboard.readText()`. O erro não
  pode ser engolido em silêncio (a caixa ficava vazia e "Criar agendamento" desabilitado sem
  explicação): o painel avisa para colar à mão.
- **Rascunho do montador**: a gravação no localStorage só começa depois de restaurar (estado
  `restaurado`). Com `useRef`, o modo de desenvolvimento (efeitos rodando duas vezes) apagava o rascunho.
- **Depois de login, logout ou troca de senha, use navegação completa** (`window.location.href`), nunca
  `router.push()`, para o cookie novo chegar ao servidor.
- **Convite do Identity:** o token chega no hash (`#invite_token=`), vai para o `sessionStorage` (não para
  a URL) e a senha é criada em `/aceitar-convite`. Recuperação de senha cai em `/nova-senha`.
- **O Netlify roda `npm install` puro.** Conflito de dependência derruba o deploy. Se `npm install` não
  passa limpo, não vai ao ar. Nesta máquina o install precisa do espelho
  `--registry=https://registry.yarnpkg.com`.
- **Texto livre na mensagem** (nome, local, observações) vira uma linha só, sem `[`, `]` e `*`, para não
  confundir a leitura das linhas com rótulo e da `[ref]`.

## 8. Próximas fases (combinadas)

- **Fase 2:** calendário mensal no painel; edição de preços e pacotes pelo painel (o catálogo passa a vir
  do Blobs; o código já recebe o catálogo por parâmetro); itens de pós-venda mais ricos.
- **Fase 3:** montador mostra as datas já ocupadas (sem expor dados); lembrete de "prévia em 48h"
  vencendo; aviso de orçamento expirado.

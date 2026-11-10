# Eluan Jesus Fotografia — CLAUDE.md

Montador de orçamento público de um fotógrafo de Teresina + API pública da tabela de preços. Next.js 16
(App Router) + React 19 + TypeScript + Tailwind v4, no Netlify. Sem login e sem banco: o painel de
agendamentos mora no **Orça Aqui**, que usa `/api/catalogo` e `/api/recalcular` daqui.

- Uso e publicação: [README.md](README.md)
- Publicar no Netlify: [docs/NETLIFY.md](docs/NETLIFY.md)
- **Antes de mudar código:** [docs/MANUTENCAO.md](docs/MANUTENCAO.md), com fluxo, regras, receitas e armadilhas

## Regras de trabalho neste repositório

- **Manter o código documentado.** Todo arquivo novo começa com um comentário curto dizendo seu papel;
  comentários explicam o *porquê*. Se mudar comportamento, regra ou armadilha, atualize
  `docs/MANUTENCAO.md` (e o README, se mudar o uso).
- Português em nomes, mensagens e comentários.
- Preço só em `lib/catalogo.ts`. Mudou preço → aumentar `CATALOGO.versao`.
- Nunca renomear ids de pacote/entrega/deslocamento (aparecem em mensagens já enviadas; ver MANUTENCAO §3).
- Visual só por tokens de `app/globals.css` (`bg-superficie`, `text-suave`…), nunca cor fixa.
- `/api/catalogo` e `/api/recalcular` são **contrato com o Orça Aqui** (MANUTENCAO §5): mudou um campo,
  mantenha o antigo ou suba `VERSAO_API`. Os rótulos da mensagem (`*Cliente:*`…) também são lidos lá.

## Verificação

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build
```

Nesta máquina, `npm install` só pelo espelho `--registry=https://registry.yarnpkg.com`.

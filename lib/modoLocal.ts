// Modo local: usar o painel no computador sem Netlify Identity nem Blobs.
//
// Liga só com as DUAS condições: servidor de desenvolvimento (`next dev`) e a
// variável NEXT_PUBLIC_PAINEL_LOCAL=1 (no arquivo .env.development.local, que
// fica fora do git). O `next build` sempre roda com NODE_ENV=production, então
// o site publicado nunca entra neste modo, mesmo que a variável vaze para lá.
//
// No modo local: o portão de login é pulado e a agenda vai para o arquivo
// .dados-locais/agenda.json (ver lib/server/agenda.ts).
export const MODO_LOCAL = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_PAINEL_LOCAL === "1";

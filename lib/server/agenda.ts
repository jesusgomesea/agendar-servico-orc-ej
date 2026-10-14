// Leitura e gravação da agenda no Netlify Blobs — ou num arquivo, no modo local (só roda no servidor).
//
// Toda a agenda é um único JSON: para um negócio de uma pessoa são algumas
// centenas de registros por ano, e um documento só simplifica backup e a
// checagem de versão. Se um dia passar de alguns MB, dividir por ano.
import "server-only";

import { getStore } from "@netlify/blobs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EstadoAgenda } from "@/lib/agenda";
import { MODO_LOCAL } from "@/lib/modoLocal";

// Modo local (lib/modoLocal.ts): a agenda fica num arquivo na pasta do projeto,
// fora do git. O "etag" é o número da versão — basta para um computador só.
const ARQUIVO_LOCAL = path.join(process.cwd(), ".dados-locais", "agenda.json");

async function lerLocal(): Promise<AgendaLida> {
  try {
    const estado = JSON.parse(await readFile(ARQUIVO_LOCAL, "utf-8")) as EstadoAgenda;
    return { estado, etag: String(estado.versao) };
  } catch {
    return { estado: { versao: 0, agendamentos: [] }, etag: undefined };
  }
}

async function gravarLocal(estado: EstadoAgenda, etag: string | undefined): Promise<boolean> {
  if ((await lerLocal()).etag !== etag) return false;
  await mkdir(path.dirname(ARQUIVO_LOCAL), { recursive: true });
  await writeFile(ARQUIVO_LOCAL, JSON.stringify(estado, null, 2));
  return true;
}

const NOME_DA_STORE = "ej-fotografia";
const CHAVE = "agenda.json";

/**
 * O `fetch` original, sem a camada de cache que o Next.js põe por cima do global
 * (ele guarda o original em `_nextOriginalFetch`). O Blobs usa o `fetch` global
 * por padrão e, no Netlify, a leitura travava até a função ser cortada (502).
 */
/**
 * Resposta da última chamada ao Blobs, para diagnóstico. O Blobs repete em
 * silêncio as chamadas que falham (5xx, 429, 403, erro de rede), esperando
 * segundos entre as tentativas: sem isto, o painel só via "não respondeu" e a
 * causa real ficava escondida. Guarda só status e host, nunca URL nem token.
 */
let ultimaTentativa = "nenhuma chamada feita";
export function ultimaTentativaBlobs() {
  return ultimaTentativa;
}

// Resolvido a cada chamada: o Next pode trocar o `fetch` global depois que este módulo carregou.
const fetchOriginal: typeof fetch = async (url, init) => {
  const base = (globalThis.fetch as typeof fetch & { _nextOriginalFetch?: typeof fetch })._nextOriginalFetch ?? globalThis.fetch;
  let host = "?";
  try {
    host = new URL(url instanceof Request ? url.url : String(url)).host;
  } catch {}
  try {
    const r = await base(url, init);
    ultimaTentativa = `HTTP ${r.status} de ${host}`;
    if (!r.ok && r.status !== 404) console.warn(`[agenda] Blobs respondeu ${ultimaTentativa}`);
    return semCorpoSeDescartavel(r, (init?.method ?? "GET").toUpperCase());
  } catch (e) {
    ultimaTentativa = `erro de rede com ${host}: ${e instanceof Error ? `${e.name} ${e.message}` : String(e)}`.slice(0, 200);
    console.warn(`[agenda] Blobs: ${ultimaTentativa}`);
    throw e;
  }
};

/**
 * O Blobs descarta o corpo das respostas que não lê (404 = agenda ainda não
 * existe, 412 = conflito, e toda gravação) com `res.body.cancel()`, e no
 * Netlify essa chamada NUNCA termina: a leitura da agenda vazia e as gravações
 * ficavam presas até a função ser cortada (502). Só a leitura com sucesso usa o
 * corpo; nas outras, entregamos uma resposta sem corpo (mesmo status e
 * cabeçalhos, que é o que o Blobs consulta) e liberamos o original sem esperar.
 */
function semCorpoSeDescartavel(r: Response, metodo: string): Response {
  const usaCorpo = metodo === "GET" && r.status === 200;
  if (usaCorpo || !r.body) return r;
  r.body.cancel().catch(() => {});
  return new Response(null, { status: r.status, statusText: r.statusText, headers: r.headers });
}

/**
 * `strong` porque o painel grava e relê em sequência: com a consistência
 * eventual do edge, recarregar logo após salvar poderia mostrar o estado antigo
 * — e a checagem de versão recusaria a gravação seguinte.
 */
function store(consistency: "strong" | "eventual" = "strong") {
  return getStore({ name: NOME_DA_STORE, consistency, fetch: fetchOriginal });
}

/** Leitura forte que não responder neste tempo cede lugar à eventual. */
const LIMITE_LEITURA_FORTE_MS = 1_200;

/**
 * Leitura com plano B: tenta a forte; se ela falhar por falta de configuração
 * (BlobsConsistencyError) ou não responder a tempo, lê com consistência
 * eventual. A gravação continua segura: `onlyIfMatch` com o etag recusa
 * sobrescrever, no pior caso vira um 409 e o painel recarrega.
 */
async function lerDoBlob() {
  let relogio: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      store("strong").getWithMetadata(CHAVE, { type: "json" }),
      new Promise<never>((_, rejeitar) => {
        relogio = setTimeout(() => rejeitar(new Error("LeituraForteLenta")), LIMITE_LEITURA_FORTE_MS);
      }),
    ]);
  } catch (e) {
    const motivo = e instanceof Error ? e.name === "BlobsConsistencyError" || e.message === "LeituraForteLenta" : false;
    if (!motivo) throw e;
    console.warn(`[agenda] leitura forte indisponível (${(e as Error).message.slice(0, 60)}); usando consistência eventual.`);
    return store("eventual").getWithMetadata(CHAVE, { type: "json" });
  } finally {
    clearTimeout(relogio);
  }
}

export interface AgendaLida {
  estado: EstadoAgenda;
  /** Etag do blob lido; undefined = a agenda ainda não existe. */
  etag: string | undefined;
}

export async function lerAgenda(): Promise<AgendaLida> {
  if (MODO_LOCAL) return lerLocal();
  const r = await lerDoBlob();
  if (!r) return { estado: { versao: 0, agendamentos: [] }, etag: undefined };
  return { estado: r.data as EstadoAgenda, etag: r.etag };
}

/**
 * Grava só se o blob ainda for o que foi lido (etag igual) — ou, na primeira
 * gravação, só se ninguém criou antes. Devolve false se outra gravação chegou
 * no meio: comparar o número de versão sozinho deixaria uma janela entre a
 * leitura e a escrita em que duas abas venceriam ao mesmo tempo.
 */
export async function gravarAgendaSeIgual(estado: EstadoAgenda, etag: string | undefined): Promise<boolean> {
  if (MODO_LOCAL) return gravarLocal(estado, etag);
  const r = etag
    ? await store().setJSON(CHAVE, estado, { onlyIfMatch: etag })
    : await store().setJSON(CHAVE, estado, { onlyIfNew: true });
  return r.modified;
}

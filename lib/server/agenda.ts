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
 * `strong` porque o painel grava e relê em sequência: com a consistência
 * eventual do edge, recarregar logo após salvar poderia mostrar o estado antigo
 * — e a checagem de versão recusaria a gravação seguinte.
 */
function store() {
  return getStore({ name: NOME_DA_STORE, consistency: "strong" });
}

export interface AgendaLida {
  estado: EstadoAgenda;
  /** Etag do blob lido; undefined = a agenda ainda não existe. */
  etag: string | undefined;
}

export async function lerAgenda(): Promise<AgendaLida> {
  if (MODO_LOCAL) return lerLocal();
  const r = await store().getWithMetadata(CHAVE, { type: "json" });
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

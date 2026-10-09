// Leitura e gravação da agenda no Netlify Blobs (só roda no servidor).
//
// Toda a agenda é um único JSON: para um negócio de uma pessoa são algumas
// centenas de registros por ano, e um documento só simplifica backup e a
// checagem de versão. Se um dia passar de alguns MB, dividir por ano.
import "server-only";

import { getStore } from "@netlify/blobs";
import type { EstadoAgenda } from "@/lib/agenda";

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
  const r = etag
    ? await store().setJSON(CHAVE, estado, { onlyIfMatch: etag })
    : await store().setJSON(CHAVE, estado, { onlyIfNew: true });
  return r.modified;
}

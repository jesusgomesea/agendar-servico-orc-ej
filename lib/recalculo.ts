// Recálculo público de um orçamento a partir só da linha [ref …] — o contrato
// entre este site (fonte da tabela de preços) e o Orça Aqui (onde o painel vive).
//
// Por que só a [ref]: ela tem a escolha do cliente, mas não nome, telefone nem
// local. Assim o Orça Aqui recalcula sem mandar dado pessoal para cá, e preço e
// regra continuam num lugar só (`lib/catalogo.ts`). O formato da resposta é a
// API pública: mudou um campo, mantenha o antigo ou suba `VERSAO_API`.
//
// Puro e sem servidor de propósito: as rotas em app/api/ só repassam, e os
// testes cobrem tudo aqui.

import type { Catalogo } from "./catalogo";
import { calcular, decodificarReferencia, nomeServico, prazoEntrega, type Linha, type Selecao } from "./orcamento";

/** Versão do formato das respostas de /api/recalcular e /api/catalogo. */
export const VERSAO_API = 1;

export interface Recalculo {
  versaoApi: number;
  /** Versão da tabela usada no cálculo (a atual). */
  versaoTabela: number;
  /** Versão da tabela com que o cliente montou (vem da [ref]). */
  versaoRef: number;
  codigo: string;
  emitidoEm: string;
  data: string;
  horario: string;
  selecao: Selecao;
  servico: string;
  linhas: Linha[];
  total: number;
  totalEhMinimo: boolean;
  sinalPercentual: number;
  sinal: number;
  restante: number;
  /** Prazo de entrega escolhido (padrão do pacote ou expressa); null quando não se aplica. */
  prazo: { nome: string; detalhe: string; preco: number } | null;
  /** Mínimos não atingidos etc. Não impedem o agendamento, mas merecem atenção. */
  pendencias: string[];
  avisos: string[];
}

export type ResultadoRecalculo = { ok: true; recalculo: Recalculo } | { ok: false; erro: string };

/** Aceita a linha inteira "[ref EJ-… …]" ou um texto que a contenha. */
export function recalcularReferencia(texto: string, cat: Catalogo): ResultadoRecalculo {
  const ref = decodificarReferencia(texto);
  if (!ref) return { ok: false, erro: "Linha [ref …] ausente ou malformada." };

  const calc = calcular(ref.selecao, cat);
  if (calc.linhas.length === 0) {
    return { ok: false, erro: `Orçamento incompleto: ${calc.pendencias.join(" ") || "nenhum item."}` };
  }

  const avisos: string[] = [];
  if (ref.versao !== cat.versao) {
    avisos.push(`Orçamento montado com a tabela v${ref.versao}; o valor está pela tabela atual (v${cat.versao}).`);
  }

  return {
    ok: true,
    recalculo: {
      versaoApi: VERSAO_API,
      versaoTabela: cat.versao,
      versaoRef: ref.versao,
      codigo: ref.codigo,
      emitidoEm: ref.emitidoEm,
      data: ref.data,
      horario: ref.horario,
      selecao: ref.selecao,
      servico: nomeServico(ref.selecao, cat),
      linhas: calc.linhas,
      total: calc.total,
      totalEhMinimo: calc.totalEhMinimo,
      sinalPercentual: cat.sinalPercentual,
      sinal: calc.sinal,
      restante: calc.restante,
      prazo: prazoEntrega(ref.selecao, cat),
      pendencias: calc.pendencias,
      avisos,
    },
  };
}

/**
 * Catálogo em JSON. `Infinity` (última faixa de prazo do Personalizado) não
 * existe em JSON e viraria null em silêncio — sai como `null` explícito, que a
 * API documenta como "sem limite".
 */
export function catalogoPublico(cat: Catalogo) {
  return {
    versaoApi: VERSAO_API,
    ...cat,
    prazosPersonalizado: cat.prazosPersonalizado.map((f) => ({ ...f, ateFotos: Number.isFinite(f.ateFotos) ? f.ateFotos : null })),
  };
}

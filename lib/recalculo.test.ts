// Testes do contrato público com o Orça Aqui (/api/recalcular e /api/catalogo).
// Quebrou? O Orça Aqui depende deste formato: confira lá antes de mudar aqui.

import { describe, expect, it } from "vitest";
import { CATALOGO } from "./catalogo";
import { gerarMensagem, selecaoVazia, type DadosCliente } from "./orcamento";
import { VERSAO_API, catalogoPublico, recalcularReferencia } from "./recalculo";

const cliente: DadosCliente = { nome: "Ana", telefone: "86999990000", local: "Rua A", data: "2026-12-15", horario: "16:00", observacoes: "" };

describe("recalcularReferencia", () => {
  it("devolve itens, total, sinal, restante e prazo pela tabela atual, sem dados do cliente", () => {
    const texto = gerarMensagem(
      { codigo: "EJ-7K2M9", emitidoEm: "2026-11-08", selecao: { ...selecaoVazia("evento"), pacoteId: "ev-padrao3", horasExtras: 1, entregaId: "ev24" }, cliente },
      CATALOGO,
    );
    const linhaRef = texto.split("\n").find((l) => l.startsWith("[ref"))!;
    const r = recalcularReferencia(linhaRef, CATALOGO);
    if (!r.ok) throw new Error(r.erro);
    expect(r.recalculo).toMatchObject({
      versaoApi: VERSAO_API,
      versaoTabela: CATALOGO.versao,
      versaoRef: CATALOGO.versao,
      codigo: "EJ-7K2M9",
      data: "2026-12-15",
      horario: "16:00",
      servico: "Evento pequeno — Padrão",
      total: 355,
      sinalPercentual: 40,
      sinal: 142,
      restante: 213,
      prazo: { nome: "Expressa 24h", detalhe: "em até 24h", preco: 60 },
      avisos: [],
    });
    expect(JSON.stringify(r)).not.toContain("Ana");
  });

  it("avisa quando a [ref] é de uma tabela antiga", () => {
    const r = recalcularReferencia("[ref EJ-7K2M9 v3 em=2026-10-09 c=ensaio p=en-mini]", CATALOGO);
    if (!r.ok) throw new Error(r.erro);
    expect(r.recalculo.total).toBe(100);
    expect(r.recalculo.avisos.join()).toMatch(/tabela v3/);
  });

  it("mínimo do Personalizado não impede: vira pendência", () => {
    const r = recalcularReferencia("[ref EJ-7K2M9 v5 em=2026-11-08 c=evento p=ev-personalizado mp=60 fp=10]", CATALOGO);
    if (!r.ok) throw new Error(r.erro);
    expect(r.recalculo.pendencias.join()).toMatch(/mínimo de 20 fotos/);
  });

  it("recusa [ref] ausente, malformada ou sem item", () => {
    expect(recalcularReferencia("", CATALOGO).ok).toBe(false);
    expect(recalcularReferencia("[ref XX v1]", CATALOGO).ok).toBe(false);
    expect(recalcularReferencia("[ref EJ-7K2M9 v5 em=2026-11-08 c=ensaio]", CATALOGO).ok).toBe(false);
  });
});

describe("catalogoPublico", () => {
  it("vira JSON sem perder a última faixa de prazo (Infinity → null)", () => {
    const json = JSON.parse(JSON.stringify(catalogoPublico(CATALOGO)));
    expect(json.versaoApi).toBe(VERSAO_API);
    expect(json.versao).toBe(CATALOGO.versao);
    expect(json.prazosPersonalizado.at(-1)).toEqual({ ateFotos: null, prazo: "3–5 dias, com entregas parciais" });
    expect(json.pacotes.length).toBe(CATALOGO.pacotes.length);
  });
});

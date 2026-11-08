// Testes das regras de preço, do sinal e da ida-e-volta do texto do WhatsApp.
// Se algum destes quebrar depois de mexer no catálogo, confira se a regra de
// negócio mudou de propósito antes de "consertar" o teste.

import { describe, expect, it } from "vitest";
import { CATALOGO, pacoteDisponivel, type Catalogo } from "./catalogo";
import {
  calcular,
  codificarReferencia,
  decodificarReferencia,
  gerarMensagem,
  lerTextoColado,
  novoCodigo,
  selecaoVazia,
  valorSinal,
  type DadosCliente,
} from "./orcamento";

const cliente: DadosCliente = {
  nome: "Maria Souza",
  telefone: "(86) 98888-7777",
  local: "Parque da Cidadania",
  data: "2026-12-15",
  horario: "16:00",
  observacoes: "Aniversário de 1 ano\ncom tema [safari]",
};

/** Catálogo com o lançamento do Essencial alterado (o resto igual). */
function comLancamento(mudanca: { ativo?: boolean; vagasRestantes?: number }): Catalogo {
  return {
    ...CATALOGO,
    pacotes: CATALOGO.pacotes.map((p) => (p.lancamento ? { ...p, lancamento: { ...p.lancamento, ...mudanca } } : p)),
  };
}

describe("calcular", () => {
  it("soma pacote, hora extra de evento (R$70), fotos extras com preço de volume, entrega e deslocamento", () => {
    const sel = { ...selecaoVazia("evento"), pacoteId: "ev-padrao3", horasExtras: 1, fotosExtras: 10, entregaId: "4d", deslocamentoId: "10a20" };
    const c = calcular(sel, CATALOGO);
    // 350 + 70 + 10×11 + 90 + 25
    expect(c.total).toBe(645);
    expect(c.pendencias).toEqual([]);
    expect(c.totalEhMinimo).toBe(false);
  });

  it("cobra R$13 por foto extra abaixo de 10 unidades", () => {
    const c = calcular({ ...selecaoVazia("ensaio"), pacoteId: "en-mini", fotosExtras: 9 }, CATALOGO);
    expect(c.total).toBe(100 + 9 * 13);
  });

  it("usa a hora extra de ensaio (R$60), não a de evento", () => {
    const c = calcular({ ...selecaoVazia("ensaio"), pacoteId: "en-padrao", horasExtras: 2 }, CATALOGO);
    expect(c.total).toBe(200 + 120);
  });

  it("pacotes de evento: Padrão R$350 e Completo R$480", () => {
    expect(calcular({ ...selecaoVazia("evento"), pacoteId: "ev-padrao3" }, CATALOGO).total).toBe(350);
    expect(calcular({ ...selecaoVazia("evento"), pacoteId: "ev-completo" }, CATALOGO).total).toBe(480);
  });

  it("pede pacote quando a categoria tem sessão", () => {
    expect(calcular(selecaoVazia("ensaio"), CATALOGO).pendencias).toContain("Escolha um pacote.");
  });

  it("deslocamento em faixas entra no total; acima de 30 km fica a combinar", () => {
    const base = { ...selecaoVazia("ensaio"), pacoteId: "en-mini" };
    expect(calcular({ ...base, deslocamentoId: "10a20" }, CATALOGO).total).toBe(125);
    expect(calcular({ ...base, deslocamentoId: "20a30" }, CATALOGO).total).toBe(145);
    const longe = calcular({ ...base, deslocamentoId: "acima30" }, CATALOGO);
    expect(longe.total).toBe(100);
    expect(longe.totalEhMinimo).toBe(true);
  });

  it("ensaio não cobra fotos brutas nem Expressa 24h (são só de evento)", () => {
    const c = calcular({ ...selecaoVazia("ensaio"), pacoteId: "en-mini", fotosBrutas: 20, entregaId: "1d" }, CATALOGO);
    expect(c.total).toBe(100);
    expect(c.linhas).toHaveLength(1);
  });

  it("evento cobra fotos brutas (mínimo de 20) e Expressa 24h a R$60", () => {
    const c = calcular({ ...selecaoVazia("evento"), pacoteId: "ev-padrao3", fotosBrutas: 20, entregaId: "1d" }, CATALOGO);
    expect(c.total).toBe(350 + 20 * 5 + 60);
    const poucas = calcular({ ...selecaoVazia("evento"), pacoteId: "ev-padrao3", fotosBrutas: 5 }, CATALOGO);
    expect(poucas.pendencias.join()).toMatch(/mínimo de 20/);
  });

  it("auxiliar é 'a partir de' por diária e ignora escolhas de outras abas", () => {
    const sel = { ...selecaoVazia("auxiliar"), diariasAuxiliar: 2, pacoteId: "ev-padrao3", horasExtras: 3 };
    const c = calcular(sel, CATALOGO);
    expect(c.total).toBe(200);
    expect(c.linhas).toHaveLength(1);
    expect(c.totalEhMinimo).toBe(true);
  });

  it("edição avulsa soma edição e retoque", () => {
    const c = calcular({ ...selecaoVazia("edicao"), edicoes: 3, retoques: 1 }, CATALOGO);
    expect(c.total).toBe(3 * 5 + 10);
  });

  it("ainda lê pacotes e deslocamentos da tabela antiga (orçamentos em circulação)", () => {
    expect(calcular({ ...selecaoVazia("evento"), pacoteId: "ev-curta" }, CATALOGO).total).toBe(350);
    expect(calcular({ ...selecaoVazia("evento"), pacoteId: "ev-curta", deslocamentoId: "acima10" }, CATALOGO).totalEhMinimo).toBe(true);
  });
});

describe("pacotes especiais", () => {
  const essencial = { ...selecaoVazia("evento"), pacoteId: "ev-essencial" };

  it("Essencial sai a R$150 enquanto houver vagas de lançamento, com sinal e total no preço vigente", () => {
    const c = calcular(essencial, CATALOGO);
    expect(c.total).toBe(150);
    expect(c.sinal).toBe(60);
    expect(c.linhas[0].descricao).toMatch(/preço de lançamento/);
  });

  it("Essencial volta a R$250 quando as vagas acabam ou o lançamento é desligado", () => {
    for (const cat of [comLancamento({ vagasRestantes: 0 }), comLancamento({ ativo: false })]) {
      const c = calcular(essencial, cat);
      expect(c.total).toBe(250);
      expect(c.sinal).toBe(100);
      expect(c.linhas[0].descricao).not.toMatch(/lançamento/);
    }
  });

  it("Sessão Rápida (R$75) some do montador quando desativada", () => {
    const rapida = CATALOGO.pacotes.find((p) => p.id === "en-rapida")!;
    expect(calcular({ ...selecaoVazia("ensaio"), pacoteId: "en-rapida" }, CATALOGO).total).toBe(75);
    expect(pacoteDisponivel(rapida)).toBe(rapida.ativo !== false);
    expect(pacoteDisponivel({ ...rapida, ativo: false })).toBe(false);
  });

  it("pacotes da tabela antiga nunca aparecem no montador", () => {
    const legados = CATALOGO.pacotes.filter((p) => p.legado);
    expect(legados.length).toBeGreaterThan(0);
    expect(legados.some(pacoteDisponivel)).toBe(false);
  });
});

describe("sinal", () => {
  it("é 40% do total, arredondado para cima em reais inteiros", () => {
    expect(valorSinal(250, 40)).toBe(100);
    expect(valorSinal(263, 40)).toBe(106); // 105,20
    expect(valorSinal(217, 40)).toBe(87); // 86,80
    expect(valorSinal(0, 40)).toBe(0);
  });

  it("sinal + restante = total", () => {
    const c = calcular({ ...selecaoVazia("ensaio"), pacoteId: "en-mini", fotosExtras: 9 }, CATALOGO);
    expect(c.total).toBe(217);
    expect(c.sinal).toBe(87);
    expect(c.restante).toBe(130);
  });
});

describe("referência [ref]", () => {
  it("vai e volta sem perder a escolha", () => {
    const selecao = { ...selecaoVazia("evento"), pacoteId: "ev-padrao3", horasExtras: 2, fotosBrutas: 20, entregaId: "1d", deslocamentoId: "10a20" };
    const linha = codificarReferencia({
      codigo: "EJ-7K2M9",
      versao: 3,
      emitidoEm: "2026-10-09",
      selecao,
      data: "2026-12-15",
      horario: "16:00",
    });
    expect(linha).not.toContain("ax="); // diárias de auxiliar não pertencem a um evento
    const volta = decodificarReferencia(`texto qualquer\n${linha}\nmais texto`);
    expect(volta?.selecao).toEqual({ ...selecao, diariasAuxiliar: 0 });
    expect(volta?.data).toBe("2026-12-15");
    expect(volta?.horario).toBe("16:00");
  });

  it("recusa referência malformada", () => {
    expect(decodificarReferencia("[ref XX v1 em=2026-10-09 c=evento]")).toBeNull();
    expect(decodificarReferencia("[ref EJ-AAAAA v1 c=evento]")).toBeNull();
    expect(decodificarReferencia("sem referência")).toBeNull();
  });

  it("gera códigos no formato EJ-XXXXX sem caracteres ambíguos", () => {
    for (let i = 0; i < 50; i++) expect(novoCodigo()).toMatch(/^EJ-[2-9A-HJKMNP-Z]{5}$/);
  });
});

describe("mensagem do WhatsApp → painel", () => {
  const selecao = { ...selecaoVazia("evento"), pacoteId: "ev-padrao3", horasExtras: 1, entregaId: "4d" };
  const texto = gerarMensagem({ codigo: "EJ-7K2M9", emitidoEm: "2026-10-09", selecao, cliente }, CATALOGO);

  it("traz serviço, adicionais, deslocamento, entrega, total, sinal e restante", () => {
    expect(texto).toContain("*Serviço:* Evento pequeno — Padrão");
    expect(texto).toContain("• Hora extra em campo — R$ 70,00");
    expect(texto).toContain("*Deslocamento:* Até 10 km de Teresina — sem custo");
    expect(texto).toContain("*Entrega:* Expressa 4 dias (até 4 dias) — R$ 90,00");
    // Entrega e deslocamento saem só nas linhas próprias, sem repetir na lista de itens.
    expect(texto).not.toMatch(/• (Entrega|Deslocamento)/);
    // 350 + 70 + 90 = 510 → sinal 204, restante 306
    expect(texto).toContain("*Total:* R$ 510,00");
    expect(texto).toContain("*Sinal (40%):* R$ 204,00");
    expect(texto).toContain("*Restante:* R$ 306,00");
    expect(texto).toContain("*Data desejada:* 15/12/2026 às 16:00");
    expect(texto).toContain("*Local:* Parque da Cidadania");
    expect(texto).toContain("Válido até 16/10/2026");
    // Quebra de linha e colchetes das observações não podem quebrar a leitura.
    expect(texto).toContain("*Observações:* Aniversário de 1 ano com tema safari");
  });

  it("no ensaio, não leva Expressa 24h nem fotos brutas que sobraram de outra aba", () => {
    const sel = { ...selecaoVazia("ensaio"), pacoteId: "en-mini", entregaId: "1d", fotosBrutas: 20 };
    const t = gerarMensagem({ codigo: "EJ-7K2M9", emitidoEm: "2026-10-09", selecao: sel, cliente }, CATALOGO);
    expect(t).toContain("*Entrega:* Prazo padrão (até 10 dias) — incluso");
    expect(t).not.toContain("en=1d");
    expect(t).not.toContain("fb=");
    expect(t).toContain("*Total:* R$ 100,00");
  });

  it("o painel lê de volta os dados do cliente e o valor, sem avisos", () => {
    const r = lerTextoColado(texto, CATALOGO);
    if (!r.ok) throw new Error(r.erro);
    expect(r.leitura.cliente.nome).toBe("Maria Souza");
    expect(r.leitura.cliente.telefone).toBe("(86) 98888-7777");
    expect(r.leitura.cliente.local).toBe("Parque da Cidadania");
    expect(r.leitura.cliente.data).toBe("2026-12-15");
    expect(r.leitura.calculo.total).toBe(510);
    expect(r.leitura.calculo.sinal).toBe(204);
    expect(r.leitura.avisos).toEqual([]);
  });

  it("avisa quando o cliente editou o total na conversa", () => {
    const editado = texto.replace("*Total:* R$ 510,00", "*Total:* R$ 300,00");
    const r = lerTextoColado(editado, CATALOGO);
    if (!r.ok) throw new Error(r.erro);
    expect(r.leitura.calculo.total).toBe(510);
    expect(r.leitura.avisos.join()).toMatch(/não bate/);
  });

  it("avisa quando o Essencial foi orçado no lançamento e as vagas acabaram antes de colar", () => {
    const sel = { ...selecaoVazia("evento"), pacoteId: "ev-essencial" };
    const t = gerarMensagem({ codigo: "EJ-7K2M9", emitidoEm: "2026-10-09", selecao: sel, cliente }, CATALOGO);
    const r = lerTextoColado(t, comLancamento({ vagasRestantes: 0 }));
    if (!r.ok) throw new Error(r.erro);
    expect(r.leitura.calculo.total).toBe(250);
    expect(r.leitura.avisos.join()).toMatch(/não bate/);
  });

  it("aceita o texto copiado do WhatsApp sem os asteriscos", () => {
    const r = lerTextoColado(texto.replace(/\*/g, ""), CATALOGO);
    if (!r.ok) throw new Error(r.erro);
    expect(r.leitura.cliente.nome).toBe("Maria Souza");
  });

  it("recusa texto sem a linha [ref]", () => {
    const r = lerTextoColado("Oi, quero um orçamento", CATALOGO);
    expect(r.ok).toBe(false);
  });
});

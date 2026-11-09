// Testes das regras de preço, prazos, sinal e da ida-e-volta do texto do WhatsApp.
// Se algum destes quebrar depois de mexer no catálogo, confira se a regra de
// negócio mudou de propósito antes de "consertar" o teste.

import { describe, expect, it } from "vitest";
import { CATALOGO, pacoteDisponivel, prazoPorFotos } from "./catalogo";
import {
  calcular,
  codificarReferencia,
  decodificarReferencia,
  gerarMensagem,
  lerTextoColado,
  novoCodigo,
  prazoEntrega,
  selecaoVazia,
  valorSinal,
  type DadosCliente,
  type Selecao,
} from "./orcamento";

const cliente: DadosCliente = {
  nome: "Maria Souza",
  telefone: "(86) 98888-7777",
  local: "Parque da Cidadania",
  data: "2026-12-15",
  horario: "16:00",
  observacoes: "Aniversário de 1 ano\ncom tema [safari]",
};

const ensaio = (extra: Partial<Selecao>): Selecao => ({ ...selecaoVazia("ensaio"), ...extra });
const evento = (extra: Partial<Selecao>): Selecao => ({ ...selecaoVazia("evento"), ...extra });
const total = (sel: Selecao) => calcular(sel, CATALOGO).total;

describe("pacotes fechados", () => {
  it("valores dos pacotes de ensaio e evento", () => {
    expect(total(ensaio({ pacoteId: "en-rapida" }))).toBe(75);
    expect(total(ensaio({ pacoteId: "en-mini" }))).toBe(100);
    expect(total(ensaio({ pacoteId: "en-padrao" }))).toBe(200);
    expect(total(ensaio({ pacoteId: "en-completo" }))).toBe(330);
    expect(total(evento({ pacoteId: "ev-essencial" }))).toBe(150);
    expect(total(evento({ pacoteId: "ev-padrao3" }))).toBe(250);
    expect(total(evento({ pacoteId: "ev-completo" }))).toBe(360);
  });

  it("soma pacote, hora extra de evento (R$45), fotos extras, expressa e deslocamento", () => {
    const c = calcular(evento({ pacoteId: "ev-padrao3", horasExtras: 1, fotosExtras: 10, entregaId: "ev24", deslocamentoId: "10a20" }), CATALOGO);
    // 250 + 45 + 10×12 + 60 + 25
    expect(c.total).toBe(500);
    expect(c.pendencias).toEqual([]);
    expect(c.totalEhMinimo).toBe(false);
  });

  it("hora extra de ensaio é R$35", () => {
    expect(total(ensaio({ pacoteId: "en-padrao", horasExtras: 2 }))).toBe(200 + 70);
  });

  it("foto extra: R$12; no ensaio, todas a R$10 a partir de 15", () => {
    expect(total(ensaio({ pacoteId: "en-mini", fotosExtras: 14 }))).toBe(100 + 14 * 12);
    expect(total(ensaio({ pacoteId: "en-mini", fotosExtras: 15 }))).toBe(100 + 15 * 10);
  });

  it("foto extra no evento: R$12 até 49, todas a R$10 a partir de 50", () => {
    expect(total(evento({ pacoteId: "ev-padrao3", fotosExtras: 49 }))).toBe(250 + 49 * 12);
    expect(total(evento({ pacoteId: "ev-padrao3", fotosExtras: 50 }))).toBe(250 + 50 * 10);
  });

  it("pede pacote quando a categoria tem sessão", () => {
    expect(calcular(selecaoVazia("ensaio"), CATALOGO).pendencias).toContain("Escolha um pacote.");
  });

  it("deslocamento em faixas entra no total; acima de 30 km fica a combinar", () => {
    expect(total(ensaio({ pacoteId: "en-mini", deslocamentoId: "10a20" }))).toBe(125);
    expect(total(ensaio({ pacoteId: "en-mini", deslocamentoId: "20a30" }))).toBe(145);
    const longe = calcular(ensaio({ pacoteId: "en-mini", deslocamentoId: "acima30" }), CATALOGO);
    expect(longe.total).toBe(100);
    expect(longe.totalEhMinimo).toBe(true);
  });
});

describe("prazo de entrega por pacote", () => {
  const prazo = (sel: Selecao) => prazoEntrega(sel, CATALOGO)?.detalhe;

  it("cada pacote tem o próprio prazo padrão, sem custo", () => {
    expect(prazo(ensaio({ pacoteId: "en-rapida" }))).toBe("em até 6h");
    expect(prazo(ensaio({ pacoteId: "en-mini" }))).toBe("em até 8h");
    expect(prazo(ensaio({ pacoteId: "en-padrao" }))).toBe("em até 24h");
    expect(prazo(ensaio({ pacoteId: "en-completo" }))).toBe("2–3 dias úteis");
    expect(prazo(evento({ pacoteId: "ev-essencial" }))).toBe("1–2 dias");
    expect(prazo(evento({ pacoteId: "ev-padrao3" }))).toBe("2–4 dias");
    expect(prazo(evento({ pacoteId: "ev-completo" }))).toMatch(/^3–5 dias úteis, com entregas parciais/);
  });

  it("expressas só no pacote que oferece: ensaio Completo +40 (36h) ou +50 (24h)", () => {
    expect(total(ensaio({ pacoteId: "en-completo", entregaId: "x36" }))).toBe(370);
    expect(total(ensaio({ pacoteId: "en-completo", entregaId: "x24" }))).toBe(380);
    // Pacote que não oferece a expressa: volta ao prazo padrão, sem cobrar.
    expect(total(ensaio({ pacoteId: "en-mini", entregaId: "x24" }))).toBe(100);
  });

  it("evento: Padrão expressa 24h +60, Completo expressa 1–3 dias +80", () => {
    expect(total(evento({ pacoteId: "ev-padrao3", entregaId: "ev24" }))).toBe(310);
    expect(total(evento({ pacoteId: "ev-completo", entregaId: "ev13" }))).toBe(440);
    expect(total(evento({ pacoteId: "ev-essencial", entregaId: "ev24" }))).toBe(150);
  });

  it("Personalizado: prazo pela quantidade de fotos", () => {
    expect(prazoPorFotos(5, CATALOGO)).toBe("em até 24h");
    expect(prazoPorFotos(10, CATALOGO)).toBe("em até 24h");
    expect(prazoPorFotos(11, CATALOGO)).toBe("36–48 horas");
    expect(prazoPorFotos(30, CATALOGO)).toBe("36–48 horas");
    expect(prazoPorFotos(31, CATALOGO)).toBe("3 dias");
    expect(prazoPorFotos(50, CATALOGO)).toBe("3 dias");
    expect(prazoPorFotos(51, CATALOGO)).toBe("3–5 dias, com entregas parciais");
    expect(prazo(evento({ pacoteId: "ev-personalizado", minutosPersonalizado: 120, fotosPersonalizado: 20 }))).toBe("36–48 horas");
  });
});

describe("Personalizado", () => {
  const pe = (min: number, fotos: number, extra: Partial<Selecao> = {}) =>
    ensaio({ pacoteId: "en-personalizado", minutosPersonalizado: min, fotosPersonalizado: fotos, ...extra });
  const pv = (min: number, fotos: number) => evento({ pacoteId: "ev-personalizado", minutosPersonalizado: min, fotosPersonalizado: fotos });

  it("ensaio: tempo a R$30/hora (blocos de 15 min) + fotos a R$6, todas a R$4,50 a partir de 30", () => {
    expect(total(pe(15, 5))).toBe(7.5 + 30);
    expect(total(pe(60, 10))).toBe(30 + 60);
    expect(total(pe(60, 29))).toBe(30 + 29 * 6);
    expect(total(pe(60, 30))).toBe(30 + 30 * 4.5);
  });

  it("evento: tempo a R$45/hora + fotos a R$6, todas a R$4,50 a partir de 60", () => {
    expect(total(pv(60, 20))).toBe(45 + 120);
    expect(total(pv(90, 59))).toBe(67.5 + 59 * 6);
    expect(total(pv(210, 90))).toBe(157.5 + 90 * 4.5);
  });

  it("sai perto dos pacotes de ensaio com o mesmo conteúdo", () => {
    expect(total(pe(60, 35))).toBeLessThan(200); // Padrão: 1h, 30–40 fotos
    expect(total(pe(105, 60))).toBeLessThan(330); // Completo: 1h45, 50–70 fotos
  });

  it("mínimos: ensaio 15 min e 5 fotos; evento 1h e 20 fotos", () => {
    expect(calcular(pe(15, 4), CATALOGO).pendencias.join()).toMatch(/mínimo de 5 fotos/);
    expect(calcular(pe(0, 5), CATALOGO).pendencias.join()).toMatch(/mínimo de 15 min/);
    expect(calcular(pv(30, 20), CATALOGO).pendencias.join()).toMatch(/mínimo de 1h de cobertura/);
    expect(calcular(pv(60, 19), CATALOGO).pendencias.join()).toMatch(/mínimo de 20 fotos/);
    expect(calcular(pe(15, 5), CATALOGO).pendencias).toEqual([]);
    expect(calcular(pv(60, 20), CATALOGO).pendencias).toEqual([]);
  });

  it("não tem hora extra nem foto extra; pacote fechado ignora tempo/fotos do Personalizado", () => {
    expect(total(pe(15, 5, { horasExtras: 3, fotosExtras: 10 }))).toBe(37.5);
    expect(total(ensaio({ pacoteId: "en-mini", minutosPersonalizado: 300, fotosPersonalizado: 50 }))).toBe(100);
  });

  it("foto extra dos pacotes continua separada (R$12, R$10 a partir de 15/50)", () => {
    expect(total(ensaio({ pacoteId: "en-mini", fotosExtras: 1 }))).toBe(112);
  });

  it("lê orçamentos da v4, que contavam horas inteiras (hp)", () => {
    const ref = decodificarReferencia("[ref EJ-7K2M9 v4 em=2026-11-08 c=evento p=ev-personalizado hp=2 fp=20]");
    expect(ref?.selecao.minutosPersonalizado).toBe(120);
    expect(ref && total(ref.selecao)).toBe(90 + 120);
  });
});

describe("fotógrafo auxiliar", () => {
  const aux = (extra: Partial<Selecao>): Selecao => ({ ...selecaoVazia("auxiliar"), ...extra });

  it("R$90 por diária com alimentação e transporte inclusos, sem deslocamento", () => {
    const c = calcular(aux({ diariasAuxiliar: 2, modoAuxiliar: "com", deslocamentoId: "20a30", pacoteId: "ev-padrao3" }), CATALOGO);
    expect(c.total).toBe(180);
    expect(c.linhas).toHaveLength(1);
    expect(c.totalEhMinimo).toBe(false);
  });

  it("R$120 por diária sem alimentação e transporte, mais o deslocamento pela distância", () => {
    expect(total(aux({ diariasAuxiliar: 1, modoAuxiliar: "sem", deslocamentoId: "20a30" }))).toBe(165);
    expect(calcular(aux({ diariasAuxiliar: 1, modoAuxiliar: "sem", deslocamentoId: "acima30" }), CATALOGO).totalEhMinimo).toBe(true);
  });
});

describe("tabela antiga e o que saiu do site", () => {
  it("pacotes, serviços e opções antigos nunca aparecem no montador", () => {
    expect(CATALOGO.pacotes.filter((p) => p.legado).some(pacoteDisponivel)).toBe(false);
    expect(CATALOGO.categorias.find((c) => c.id === "edicao")?.legado).toBe(true);
  });

  it("o painel ainda lê orçamentos antigos (pacotes, entrega e deslocamento da v2/v3, edição de fotos)", () => {
    expect(total(evento({ pacoteId: "ev-curta" }))).toBe(350);
    expect(total(evento({ pacoteId: "ev-padrao3", entregaId: "4d" }))).toBe(250 + 90);
    expect(calcular(evento({ pacoteId: "ev-curta", deslocamentoId: "acima10" }), CATALOGO).totalEhMinimo).toBe(true);
    expect(total({ ...selecaoVazia("edicao"), edicoes: 3, retoques: 1 })).toBe(3 * 5 + 10);
  });

  it("fotos brutas (fb) de orçamentos antigos são ignoradas", () => {
    const ref = decodificarReferencia("[ref EJ-7K2M9 v3 em=2026-10-09 c=evento p=ev-padrao3 fb=20]");
    expect(ref && total(ref.selecao)).toBe(250);
  });
});

describe("sinal", () => {
  it("é 40% do total, arredondado para cima em reais inteiros", () => {
    expect(valorSinal(250, 40)).toBe(100);
    expect(valorSinal(263, 40)).toBe(106); // 105,20
    expect(valorSinal(268, 40)).toBe(108); // 107,20
    expect(valorSinal(0, 40)).toBe(0);
  });

  it("sinal + restante = total", () => {
    const c = calcular(ensaio({ pacoteId: "en-mini", fotosExtras: 14 }), CATALOGO);
    expect(c.total).toBe(268);
    expect(c.sinal).toBe(108);
    expect(c.restante).toBe(160);
  });
});

describe("referência [ref]", () => {
  const ida = (selecao: Selecao) =>
    decodificarReferencia(
      `texto\n${codificarReferencia({ codigo: "EJ-7K2M9", versao: 4, emitidoEm: "2026-10-09", selecao, data: "2026-12-15", horario: "16:00" })}\nmais`,
    );

  it("vai e volta sem perder a escolha (pacote fechado com expressa)", () => {
    const selecao = evento({ pacoteId: "ev-padrao3", horasExtras: 2, entregaId: "ev24", deslocamentoId: "10a20" });
    const volta = ida(selecao);
    expect(volta?.selecao).toEqual({ ...selecao, diariasAuxiliar: 0 });
    expect(volta?.data).toBe("2026-12-15");
    expect(volta?.horario).toBe("16:00");
  });

  it("vai e volta com Personalizado e com auxiliar sem transporte", () => {
    const pers = evento({ pacoteId: "ev-personalizado", minutosPersonalizado: 210, fotosPersonalizado: 40 });
    expect(ida(pers)?.selecao).toEqual({ ...pers, diariasAuxiliar: 0 });
    const aux = { ...selecaoVazia("auxiliar"), diariasAuxiliar: 2, modoAuxiliar: "sem" as const, deslocamentoId: "10a20" };
    expect(ida(aux)?.selecao).toEqual(aux);
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
  const msg = (selecao: Selecao) => gerarMensagem({ codigo: "EJ-7K2M9", emitidoEm: "2026-10-09", selecao, cliente }, CATALOGO);
  const texto = msg(evento({ pacoteId: "ev-padrao3", horasExtras: 1, entregaId: "ev24" }));

  it("traz serviço, adicionais, deslocamento, entrega, total, sinal e restante", () => {
    expect(texto).toContain("*Serviço:* Evento pequeno — Padrão");
    expect(texto).toContain("• Hora extra em campo — R$ 45,00");
    expect(texto).toContain("*Deslocamento:* Até 10 km de Teresina — sem custo");
    expect(texto).toContain("*Entrega:* Expressa 24h (em até 24h) — R$ 60,00");
    // Entrega e deslocamento saem só nas linhas próprias, sem repetir na lista de itens.
    expect(texto).not.toMatch(/• (Entrega|Deslocamento)/);
    // 250 + 45 + 60 = 355 → sinal 142, restante 213
    expect(texto).toContain("*Total:* R$ 355,00");
    expect(texto).toContain("*Sinal (40%):* R$ 142,00");
    expect(texto).toContain("*Restante:* R$ 213,00");
    expect(texto).toContain("*Data desejada:* 15/12/2026 às 16:00");
    expect(texto).toContain("*Local:* Parque da Cidadania");
    expect(texto).toContain("Válido até 16/10/2026");
    // Quebra de linha e colchetes das observações não podem quebrar a leitura.
    expect(texto).toContain("*Observações:* Aniversário de 1 ano com tema safari");
  });

  it("Personalizado: itens de tempo e fotos e o prazo pela quantidade de fotos", () => {
    const t = msg(evento({ pacoteId: "ev-personalizado", minutosPersonalizado: 90, fotosPersonalizado: 20 }));
    expect(t).toContain("• Personalizado: cobertura de 1h30 — R$ 67,50");
    expect(t).toContain("• Personalizado: fotos editadas × 20 — R$ 120,00");
    expect(t).toContain("*Entrega:* Prazo padrão (36–48 horas) — incluso");
    expect(t).toContain("*Total:* R$ 187,50");
    expect(t).toContain("*Sinal (40%):* R$ 75,00");
  });

  it("auxiliar com transporte incluso: sem linhas de entrega e deslocamento", () => {
    const t = msg({ ...selecaoVazia("auxiliar"), diariasAuxiliar: 1 });
    expect(t).not.toContain("*Entrega:*");
    expect(t).not.toContain("*Deslocamento:*");
    expect(t).toContain("*Total:* R$ 90,00");
  });

  it("o painel lê de volta os dados do cliente e o valor, sem avisos", () => {
    const r = lerTextoColado(texto, CATALOGO);
    if (!r.ok) throw new Error(r.erro);
    expect(r.leitura.cliente.nome).toBe("Maria Souza");
    expect(r.leitura.cliente.telefone).toBe("(86) 98888-7777");
    expect(r.leitura.cliente.local).toBe("Parque da Cidadania");
    expect(r.leitura.cliente.data).toBe("2026-12-15");
    expect(r.leitura.calculo.total).toBe(355);
    expect(r.leitura.calculo.sinal).toBe(142);
    expect(r.leitura.avisos).toEqual([]);
  });

  it("avisa quando o cliente editou o total na conversa", () => {
    const r = lerTextoColado(texto.replace("*Total:* R$ 355,00", "*Total:* R$ 300,00"), CATALOGO);
    if (!r.ok) throw new Error(r.erro);
    expect(r.leitura.calculo.total).toBe(355);
    expect(r.leitura.avisos.join()).toMatch(/não bate/);
  });

  it("aceita o texto copiado do WhatsApp sem os asteriscos", () => {
    const r = lerTextoColado(texto.replace(/\*/g, ""), CATALOGO);
    if (!r.ok) throw new Error(r.erro);
    expect(r.leitura.cliente.nome).toBe("Maria Souza");
  });

  it("recusa texto sem a linha [ref]", () => {
    expect(lerTextoColado("Oi, quero um orçamento", CATALOGO).ok).toBe(false);
  });
});

// Testes das regras de preço, do sinal e da ida-e-volta do texto do WhatsApp.
// Se algum destes quebrar depois de mexer no catálogo, confira se a regra de
// negócio mudou de propósito antes de "consertar" o teste.

import { describe, expect, it } from "vitest";
import { CATALOGO } from "./catalogo";
import {
  calcular,
  codificarReferencia,
  decodificarReferencia,
  gerarMensagem,
  lerTextoColado,
  novoCodigo,
  percentualSinal,
  selecaoVazia,
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

describe("calcular", () => {
  it("soma pacote, hora extra de evento, fotos extras com preço de volume e entrega expressa", () => {
    const sel = { ...selecaoVazia("evento"), pacoteId: "ev-curta", horasExtras: 1, fotosExtras: 10, entregaId: "4d" };
    const c = calcular(sel, CATALOGO);
    // 350 + 90 + 10×11 + 90
    expect(c.total).toBe(640);
    expect(c.pendencias).toEqual([]);
    expect(c.totalEhMinimo).toBe(false);
  });

  it("cobra R$13 por foto extra abaixo de 10 unidades", () => {
    const c = calcular({ ...selecaoVazia("ensaio"), pacoteId: "en-mini", fotosExtras: 9 }, CATALOGO);
    expect(c.total).toBe(130 + 9 * 13);
  });

  it("usa a hora extra de ensaio (R$60), não a de evento", () => {
    const c = calcular({ ...selecaoVazia("ensaio"), pacoteId: "en-padrao", horasExtras: 2 }, CATALOGO);
    expect(c.total).toBe(220 + 120);
  });

  it("pede pacote quando a categoria tem sessão", () => {
    expect(calcular(selecaoVazia("ensaio"), CATALOGO).pendencias).toContain("Escolha um pacote.");
  });

  it("deslocamento acima de 10 km fica fora do total e marca o total como mínimo", () => {
    const c = calcular({ ...selecaoVazia("ensaio"), pacoteId: "en-mini", deslocamentoId: "acima10" }, CATALOGO);
    expect(c.total).toBe(130);
    expect(c.totalEhMinimo).toBe(true);
  });

  it("fotos brutas abaixo do mínimo geram pendência", () => {
    const c = calcular({ ...selecaoVazia("ensaio"), pacoteId: "en-mini", fotosBrutas: 5 }, CATALOGO);
    expect(c.pendencias.join()).toMatch(/mínimo de 20/);
  });

  it("auxiliar é 'a partir de' por diária e ignora escolhas de outras abas", () => {
    const sel = { ...selecaoVazia("auxiliar"), diariasAuxiliar: 2, pacoteId: "ev-curta", horasExtras: 3 };
    const c = calcular(sel, CATALOGO);
    expect(c.total).toBe(200);
    expect(c.linhas).toHaveLength(1);
    expect(c.totalEhMinimo).toBe(true);
  });

  it("edição avulsa soma edição e retoque", () => {
    const c = calcular({ ...selecaoVazia("edicao"), edicoes: 3, retoques: 1 }, CATALOGO);
    expect(c.total).toBe(3 * 5 + 10);
  });
});

describe("percentualSinal", () => {
  it("20% com 60 dias ou mais, 35% entre 15 e 59, 50% abaixo de 15", () => {
    expect(percentualSinal("2026-10-09", "2026-12-08", CATALOGO)).toBe(20); // 60 dias
    expect(percentualSinal("2026-10-09", "2026-12-07", CATALOGO)).toBe(35); // 59 dias
    expect(percentualSinal("2026-10-09", "2026-10-24", CATALOGO)).toBe(35); // 15 dias
    expect(percentualSinal("2026-10-09", "2026-10-23", CATALOGO)).toBe(50); // 14 dias
    expect(percentualSinal("2026-10-09", "2026-10-01", CATALOGO)).toBe(50); // data passada
  });
});

describe("referência [ref]", () => {
  it("vai e volta sem perder a escolha", () => {
    const selecao = { ...selecaoVazia("evento"), pacoteId: "ev-padrao", horasExtras: 2, fotosBrutas: 20, entregaId: "1d" };
    const linha = codificarReferencia({
      codigo: "EJ-7K2M9",
      versao: 1,
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
  const selecao = { ...selecaoVazia("evento"), pacoteId: "ev-curta", horasExtras: 1, entregaId: "4d" };
  const texto = gerarMensagem({ codigo: "EJ-7K2M9", emitidoEm: "2026-10-09", selecao, cliente }, CATALOGO);

  it("monta o texto com total, sem sinal enquanto ele estiver desligado no catálogo", () => {
    expect(texto).toContain("*Total:* R$ 530,00");
    expect(texto).not.toContain("Sinal");
    expect(texto).toContain("Válido até 16/10/2026");
    // Quebra de linha e colchetes das observações não podem quebrar a leitura.
    expect(texto).toContain("*Observações:* Aniversário de 1 ano com tema safari");
  });

  it("com o sinal ligado, informa o sinal pela antecedência", () => {
    const comSinal = { ...CATALOGO, cobrarSinal: true };
    const t = gerarMensagem({ codigo: "EJ-7K2M9", emitidoEm: "2026-10-09", selecao, cliente }, comSinal);
    expect(t).toContain("*Sinal (20%):* R$ 106,00");
  });

  it("o painel lê de volta os dados do cliente e o valor, sem avisos", () => {
    const r = lerTextoColado(texto, CATALOGO);
    if (!r.ok) throw new Error(r.erro);
    expect(r.leitura.cliente.nome).toBe("Maria Souza");
    expect(r.leitura.cliente.telefone).toBe("(86) 98888-7777");
    expect(r.leitura.cliente.local).toBe("Parque da Cidadania");
    expect(r.leitura.cliente.data).toBe("2026-12-15");
    expect(r.leitura.calculo.total).toBe(530);
    expect(r.leitura.avisos).toEqual([]);
  });

  it("avisa quando o cliente editou o total na conversa", () => {
    const editado = texto.replace("*Total:* R$ 530,00", "*Total:* R$ 300,00");
    const r = lerTextoColado(editado, CATALOGO);
    if (!r.ok) throw new Error(r.erro);
    expect(r.leitura.calculo.total).toBe(530);
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

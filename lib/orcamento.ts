// Regras do orçamento: cálculo, sinal, texto do WhatsApp e leitura do texto colado.
//
// É o arquivo mais importante do projeto. O mesmo código roda nos dois lados:
//  - no montador público, para mostrar o valor e montar a mensagem;
//  - no painel, para ler a mensagem colada e RECALCULAR o valor pela tabela.
//
// Por que recalcular no painel em vez de confiar no total escrito? O cliente pode
// editar a mensagem no WhatsApp antes de enviar. Por isso a mensagem leva uma
// linha "[ref …]" com a escolha do cliente codificada (pacote, quantidades, data).
// O painel lê essa linha, refaz a conta com o catálogo e avisa se o total escrito
// não bate. As linhas legíveis (Cliente, Local…) servem só para os dados pessoais.

import type { Catalogo, CategoriaId } from "./catalogo";
import {
  dataBR,
  dataBRparaIso,
  dataIsoValida,
  diasEntre,
  lerMoeda,
  moeda,
  somarDias,
} from "./formato";

/** O que o cliente escolheu no montador. Quantidades zeradas = item não escolhido. */
export interface Selecao {
  categoria: CategoriaId;
  pacoteId: string | null;
  horasExtras: number;
  fotosExtras: number;
  fotosBrutas: number;
  edicoes: number;
  retoques: number;
  entregaId: string;
  deslocamentoId: string;
  diariasAuxiliar: number;
}

export interface DadosCliente {
  nome: string;
  telefone: string;
  local: string;
  /** "AAAA-MM-DD" ou "" quando o cliente ainda não sabe a data. */
  data: string;
  /** "HH:MM" ou "". */
  horario: string;
  observacoes: string;
}

/**
 * fixo       → entra no total;
 * aPartirDe  → entra no total, mas o valor real pode ser maior (fotógrafo auxiliar);
 * aCombinar  → não entra no total, é definido na conversa (deslocamento acima de 10 km).
 */
export type TipoLinha = "fixo" | "aPartirDe" | "aCombinar";

export interface Linha {
  descricao: string;
  quantidade: number;
  unitario: number;
  valor: number;
  tipo: TipoLinha;
}

export interface Calculo {
  linhas: Linha[];
  total: number;
  /** Verdadeiro quando há item "a partir de" ou "a combinar": o total é um mínimo. */
  totalEhMinimo: boolean;
  /** Motivos que impedem enviar (ex.: falta escolher o pacote). Vazio = pode enviar. */
  pendencias: string[];
}

export function selecaoVazia(categoria: CategoriaId = "ensaio"): Selecao {
  return {
    categoria,
    pacoteId: null,
    horasExtras: 0,
    fotosExtras: 0,
    fotosBrutas: 0,
    edicoes: 0,
    retoques: 0,
    entregaId: "padrao",
    deslocamentoId: "ate10",
    diariasAuxiliar: 1,
  };
}

/** Preço unitário da foto extra: o de volume vale para TODAS quando a quantidade atinge o mínimo. */
export function precoFotoExtra(qtd: number, cat: Catalogo): number {
  return qtd >= cat.fotoExtra.volumeMin ? cat.fotoExtra.precoVolume : cat.fotoExtra.preco;
}

export function calcular(selecaoBruta: Selecao, cat: Catalogo): Calculo {
  const sel = normalizarSelecao(selecaoBruta);
  const linhas: Linha[] = [];
  const pendencias: string[] = [];
  const categoria = cat.categorias.find((c) => c.id === sel.categoria);
  if (!categoria) {
    return { linhas, total: 0, totalEhMinimo: false, pendencias: ["Categoria desconhecida."] };
  }

  const add = (descricao: string, quantidade: number, unitario: number, tipo: TipoLinha = "fixo") => {
    if (quantidade <= 0) return;
    linhas.push({ descricao, quantidade, unitario, valor: quantidade * unitario, tipo });
  };

  if (categoria.temSessao) {
    const pacote = cat.pacotes.find((p) => p.id === sel.pacoteId && p.categoria === categoria.id);
    if (!pacote) {
      pendencias.push("Escolha um pacote.");
    } else {
      add(`Pacote ${pacote.nome} (${pacote.duracao} · ${pacote.entrega})`, 1, pacote.preco);
    }
    if (categoria.horaExtra) add("Hora extra em campo", sel.horasExtras, categoria.horaExtra);
    add("Foto extra editada", sel.fotosExtras, precoFotoExtra(sel.fotosExtras, cat));
    if (sel.fotosBrutas > 0 && sel.fotosBrutas < cat.fotoBruta.minimo) {
      pendencias.push(`Fotos brutas: mínimo de ${cat.fotoBruta.minimo} unidades.`);
    }
    add("Foto bruta sem edição", sel.fotosBrutas, cat.fotoBruta.preco);
    add("Retoque pesado", sel.retoques, cat.retoquePesado);

    const entrega = cat.entregas.find((e) => e.id === sel.entregaId);
    if (!entrega) pendencias.push("Prazo de entrega inválido.");
    else if (entrega.preco > 0) add(`Entrega expressa (${entrega.detalhe})`, 1, entrega.preco);

    const desl = cat.deslocamentos.find((d) => d.id === sel.deslocamentoId);
    if (!desl) pendencias.push("Deslocamento inválido.");
    else if (desl.aCombinar) add(`Deslocamento: ${desl.nome.toLowerCase()}`, 1, 0, "aCombinar");
    else if (desl.preco > 0) add(`Deslocamento: ${desl.nome.toLowerCase()}`, 1, desl.preco);
  }

  if (categoria.id === "auxiliar") {
    if (sel.diariasAuxiliar < 1) pendencias.push("Informe ao menos 1 diária.");
    add("Diária de fotógrafo auxiliar", sel.diariasAuxiliar, cat.auxiliar.aPartirDe, "aPartirDe");
  }

  if (categoria.id === "edicao") {
    add("Edição de foto do cliente", sel.edicoes, cat.edicaoCliente);
    add("Retoque pesado", sel.retoques, cat.retoquePesado);
    if (sel.edicoes + sel.retoques === 0) pendencias.push("Informe quantas fotos quer editar.");
  }

  const total = linhas.filter((l) => l.tipo !== "aCombinar").reduce((s, l) => s + l.valor, 0);
  return { linhas, total, totalEhMinimo: linhas.some((l) => l.tipo !== "fixo"), pendencias };
}

/** Percentual de sinal pela antecedência: quanto mais longe a data, menor o sinal. */
export function percentualSinal(emitidoEm: string, dataServico: string, cat: Catalogo): number {
  const dias = diasEntre(emitidoEm, dataServico);
  const faixa = cat.sinal.find((f) => dias >= f.diasMin);
  return (faixa ?? cat.sinal[cat.sinal.length - 1]).percentual;
}

export function valorSinal(total: number, percentual: number): number {
  return Math.round(total * percentual) / 100;
}

// ---------------------------------------------------------------------------
// Código e linha [ref]
// ---------------------------------------------------------------------------

// Sem 0/O e 1/I/L: o código é lido em voz alta e digitado à mão às vezes.
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function novoCodigo(aleatorio: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALFABETO[Math.floor(aleatorio() * ALFABETO.length)];
  return `EJ-${s}`;
}

export interface Referencia {
  codigo: string;
  versao: number;
  emitidoEm: string;
  selecao: Selecao;
  data: string;
  horario: string;
}

// Chave curta de cada campo numérico da seleção na linha [ref].
const CHAVES_NUMERICAS: [keyof Selecao, string][] = [
  ["horasExtras", "he"],
  ["fotosExtras", "fe"],
  ["fotosBrutas", "fb"],
  ["edicoes", "ed"],
  ["retoques", "rt"],
  ["diariasAuxiliar", "ax"],
];

/**
 * Zera o que não vale para a categoria. O montador guarda as escolhas de todas
 * as abas (para o cliente poder ir e voltar sem perder nada), mas só as da
 * categoria escolhida podem ir para a mensagem e para o agendamento.
 */
export function normalizarSelecao(sel: Selecao): Selecao {
  const s = { ...sel };
  const comSessao = s.categoria === "ensaio" || s.categoria === "evento";
  if (!comSessao) {
    s.pacoteId = null;
    s.horasExtras = 0;
    s.fotosExtras = 0;
    s.fotosBrutas = 0;
    s.entregaId = "padrao";
    s.deslocamentoId = "ate10";
  }
  if (s.categoria !== "edicao") s.edicoes = 0;
  if (s.categoria !== "auxiliar") s.diariasAuxiliar = 0;
  if (s.categoria === "auxiliar") s.retoques = 0;
  return s;
}

/** Monta "[ref EJ-7K2M9 v1 em=2026-10-09 c=evento p=ev-curta he=1 …]". Campos zerados ficam de fora. */
export function codificarReferencia(r: Referencia): string {
  const s = normalizarSelecao(r.selecao);
  const partes = [r.codigo, `v${r.versao}`, `em=${r.emitidoEm}`, `c=${s.categoria}`];
  if (s.pacoteId) partes.push(`p=${s.pacoteId}`);
  for (const [campo, chave] of CHAVES_NUMERICAS) {
    const v = s[campo] as number;
    if (v > 0) partes.push(`${chave}=${v}`);
  }
  if (s.entregaId !== "padrao") partes.push(`en=${s.entregaId}`);
  if (s.deslocamentoId !== "ate10") partes.push(`ds=${s.deslocamentoId}`);
  if (r.data) partes.push(`dt=${r.data}`);
  if (r.horario) partes.push(`hr=${r.horario}`);
  return `[ref ${partes.join(" ")}]`;
}

const CATEGORIAS_VALIDAS: CategoriaId[] = ["ensaio", "evento", "auxiliar", "edicao"];

/** Lê a ÚLTIMA linha [ref …] do texto. Devolve null se não houver uma bem formada. */
export function decodificarReferencia(texto: string): Referencia | null {
  const achados = [...texto.matchAll(/\[ref\s+([^\]\n]+)\]/g)];
  if (achados.length === 0) return null;
  const tokens = achados[achados.length - 1][1].trim().split(/\s+/);
  const [codigo, versaoTxt, ...pares] = tokens;
  if (!/^EJ-[A-Z0-9]{5}$/.test(codigo ?? "") || !/^v\d+$/.test(versaoTxt ?? "")) return null;

  const mapa = new Map<string, string>();
  for (const p of pares) {
    const i = p.indexOf("=");
    if (i > 0) mapa.set(p.slice(0, i), p.slice(i + 1));
  }

  const categoria = mapa.get("c") as CategoriaId | undefined;
  const emitidoEm = mapa.get("em") ?? "";
  if (!categoria || !CATEGORIAS_VALIDAS.includes(categoria) || !dataIsoValida(emitidoEm)) return null;

  const selecao = selecaoVazia(categoria);
  // diariasAuxiliar começa em 1 no montador; na ref, ausente significa 0.
  selecao.diariasAuxiliar = 0;
  selecao.pacoteId = mapa.get("p") ?? null;
  for (const [campo, chave] of CHAVES_NUMERICAS) {
    const n = Number(mapa.get(chave) ?? 0);
    (selecao[campo] as number) = Number.isInteger(n) && n >= 0 && n <= 9999 ? n : 0;
  }
  selecao.entregaId = mapa.get("en") ?? "padrao";
  selecao.deslocamentoId = mapa.get("ds") ?? "ate10";

  const data = mapa.get("dt") ?? "";
  const horario = mapa.get("hr") ?? "";
  return {
    codigo,
    versao: Number(versaoTxt.slice(1)),
    emitidoEm,
    selecao,
    data: dataIsoValida(data) ? data : "",
    horario: /^\d{2}:\d{2}$/.test(horario) ? horario : "",
  };
}

// ---------------------------------------------------------------------------
// Texto do WhatsApp
// ---------------------------------------------------------------------------

/** Texto livre vai numa linha só e sem colchetes, para não confundir a leitura das linhas e da [ref]. */
function limparLivre(texto: string): string {
  return texto.replace(/[\r\n]+/g, " ").replace(/[[\]*]/g, "").replace(/\s{2,}/g, " ").trim();
}

export interface Mensagem {
  codigo: string;
  emitidoEm: string;
  selecao: Selecao;
  cliente: DadosCliente;
}

export function nomeServico(sel: Selecao, cat: Catalogo): string {
  const categoria = cat.categorias.find((c) => c.id === sel.categoria);
  const pacote = cat.pacotes.find((p) => p.id === sel.pacoteId);
  if (!categoria) return "—";
  return pacote && categoria.temSessao ? `${categoria.nome} — ${pacote.nome}` : categoria.nome;
}

/** Mensagem pronta para o WhatsApp. O formato das linhas com rótulo é lido de volta por `lerTextoColado`. */
export function gerarMensagem(m: Mensagem, cat: Catalogo): string {
  const calc = calcular(m.selecao, cat);
  const c = m.cliente;
  const l: string[] = [];

  l.push(`📸 *Orçamento ${m.codigo}* — ${cat.contato.nome}`, "");
  l.push(`*Cliente:* ${limparLivre(c.nome)}`);
  if (c.telefone.trim()) l.push(`*WhatsApp:* ${limparLivre(c.telefone)}`);
  l.push(`*Serviço:* ${nomeServico(m.selecao, cat)}`);
  if (c.data) l.push(`*Data desejada:* ${dataBR(c.data)}${c.horario ? ` às ${c.horario}` : ""}`);
  else l.push("*Data desejada:* a definir");
  if (c.local.trim()) l.push(`*Local:* ${limparLivre(c.local)}`);

  l.push("", "*Itens*");
  for (const it of calc.linhas) {
    const qtd = it.quantidade > 1 ? ` × ${it.quantidade}` : "";
    const valor =
      it.tipo === "aCombinar" ? "a combinar" : it.tipo === "aPartirDe" ? `a partir de ${moeda(it.valor)}` : moeda(it.valor);
    l.push(`• ${it.descricao}${qtd} — ${valor}`);
  }

  l.push("");
  const temCombinar = calc.linhas.some((x) => x.tipo === "aCombinar");
  const prefixo = calc.linhas.some((x) => x.tipo === "aPartirDe") ? "a partir de " : "";
  l.push(`*Total:* ${prefixo}${moeda(calc.total)}${temCombinar ? " + itens a combinar" : ""}`);
  // Sinal só entra na mensagem quando está ligado no catálogo (CATALOGO.cobrarSinal).
  if (cat.cobrarSinal && c.data) {
    const pct = percentualSinal(m.emitidoEm, c.data, cat);
    l.push(`*Sinal (${pct}%):* ${moeda(valorSinal(calc.total, pct))} — reserva a data`);
  } else if (cat.cobrarSinal) {
    l.push("*Sinal:* definido quando a data for confirmada");
  }
  l.push(`Válido até ${dataBR(somarDias(m.emitidoEm, cat.validadeDias))}`);

  if (c.observacoes.trim()) l.push("", `*Observações:* ${limparLivre(c.observacoes)}`);

  l.push(
    "",
    codificarReferencia({
      codigo: m.codigo,
      versao: cat.versao,
      emitidoEm: m.emitidoEm,
      selecao: m.selecao,
      data: c.data,
      horario: c.horario,
    }),
    "_(não apague a linha acima: ela identifica o seu orçamento)_",
  );
  return l.join("\n");
}

// ---------------------------------------------------------------------------
// Leitura do texto colado no painel
// ---------------------------------------------------------------------------

export interface LeituraOrcamento {
  referencia: Referencia;
  cliente: DadosCliente;
  calculo: Calculo;
  /** Total escrito na mensagem (pode ter sido editado pelo cliente). */
  totalNoTexto: number | null;
  /** Avisos que não impedem criar o agendamento, mas merecem atenção. */
  avisos: string[];
}

export type ResultadoLeitura = { ok: true; leitura: LeituraOrcamento } | { ok: false; erro: string };

/** Valor da linha "*Rótulo:* valor" (com ou sem asteriscos). */
function campo(texto: string, rotulo: string): string {
  const re = new RegExp(`^\\s*\\*?${rotulo}:\\*?\\s*(.*)$`, "im");
  return texto.match(re)?.[1]?.trim() ?? "";
}

export function lerTextoColado(texto: string, cat: Catalogo): ResultadoLeitura {
  const ref = decodificarReferencia(texto);
  if (!ref) {
    return {
      ok: false,
      erro: "Não encontrei a linha [ref …] no texto. Cole a mensagem inteira, do jeito que o cliente enviou.",
    };
  }

  const calc = calcular(ref.selecao, cat);
  const pendenciasGraves = calc.pendencias.filter((p) => !p.startsWith("Fotos brutas"));
  if (calc.linhas.length === 0 || pendenciasGraves.length > 0) {
    return { ok: false, erro: `O código do orçamento está incompleto: ${calc.pendencias.join(" ")}` };
  }

  // Data e horário: a [ref] é a fonte confiável; a linha legível é o plano B.
  let data = ref.data;
  let horario = ref.horario;
  if (!data) {
    const legivel = campo(texto, "Data desejada");
    data = dataBRparaIso(legivel) ?? "";
    horario = horario || (legivel.match(/(\d{2}:\d{2})/)?.[1] ?? "");
  }

  const cliente: DadosCliente = {
    nome: campo(texto, "Cliente"),
    telefone: campo(texto, "WhatsApp"),
    local: campo(texto, "Local"),
    data,
    horario,
    observacoes: campo(texto, "Observações"),
  };

  const avisos: string[] = [];
  if (ref.versao !== cat.versao) {
    avisos.push(
      `Orçamento gerado com a tabela de preços v${ref.versao}; a atual é v${cat.versao}. O valor abaixo já está pela tabela atual.`,
    );
  }
  const totalNoTexto = lerMoeda(campo(texto, "Total"));
  if (totalNoTexto !== null && Math.abs(totalNoTexto - calc.total) >= 0.01) {
    avisos.push(
      `O total escrito na mensagem (${moeda(totalNoTexto)}) não bate com a tabela (${moeda(calc.total)}). Confira se o texto foi editado.`,
    );
  }
  avisos.push(...calc.pendencias);
  if (!cliente.nome) avisos.push("A mensagem não tem o nome do cliente.");

  return { ok: true, leitura: { referencia: ref, cliente, calculo: calc, totalNoTexto, avisos } };
}

// Modelo do agendamento do painel e as contas em cima dele (pago, restante, etapas).
//
// Um agendamento nasce de um orçamento colado (ver `lerTextoColado`) e guarda uma
// CÓPIA dos itens e do total daquele momento: se a tabela de preços mudar depois,
// o que foi combinado com o cliente não muda junto.

import type { Catalogo } from "./catalogo";
import { calcular, type LeituraOrcamento, type Linha, nomeServico, percentualSinal, type Selecao, valorSinal } from "./orcamento";

export const ETAPAS = [
  { id: "recebido", nome: "Recebido", descricao: "Orçamento chegou, falta confirmar data" },
  { id: "confirmado", nome: "Confirmado", descricao: "Data combinada, aguardando sinal" },
  { id: "sinal_pago", nome: "Sinal pago", descricao: "Data reservada" },
  { id: "realizado", nome: "Realizado", descricao: "Sessão feita, em edição" },
  { id: "previa_enviada", nome: "Prévia enviada", descricao: "Prévia de 3–5 fotos entregue" },
  { id: "entregue", nome: "Entregue", descricao: "Link final enviado" },
] as const;

export type StatusAgendamento = (typeof ETAPAS)[number]["id"] | "cancelado";

export interface Pagamento {
  id: string;
  data: string;
  valor: number;
  descricao: string;
}

/** Cobranças de pós-venda: remarcação, reedição, foto extra pedida depois… */
export interface Extra {
  id: string;
  descricao: string;
  valor: number;
}

export interface Agendamento {
  id: string;
  codigo: string;
  criadoEm: string;
  atualizadoEm: string;
  status: StatusAgendamento;
  /** Quando cada etapa foi alcançada (ISO completo), para o histórico. */
  historico: { status: StatusAgendamento; em: string }[];

  clienteNome: string;
  clienteTelefone: string;
  local: string;
  data: string;
  horario: string;
  observacoes: string;
  /** Anotações suas, que o cliente nunca vê. */
  notas: string;

  servico: string;
  selecao: Selecao;
  catalogoVersao: number;
  emitidoEm: string;
  itens: Linha[];
  totalOrcado: number;
  totalEhMinimo: boolean;
  /** Valor fechado na conversa (ex.: depois de combinar o deslocamento). null = vale o orçado. */
  valorCombinado: number | null;
  sinalPercentual: number | null;

  extras: Extra[];
  pagamentos: Pagamento[];
}

export interface EstadoAgenda {
  /** Aumenta a cada gravação; o servidor recusa gravar por cima de uma versão mais nova. */
  versao: number;
  agendamentos: Agendamento[];
}

export function novoId(): string {
  return crypto.randomUUID();
}

export function criarDeLeitura(l: LeituraOrcamento, cat: Catalogo, agora = new Date()): Agendamento {
  const em = agora.toISOString();
  const { referencia: ref, cliente, calculo } = l;
  return {
    id: novoId(),
    codigo: ref.codigo,
    criadoEm: em,
    atualizadoEm: em,
    status: "recebido",
    historico: [{ status: "recebido", em }],
    clienteNome: cliente.nome,
    clienteTelefone: cliente.telefone,
    local: cliente.local,
    data: cliente.data,
    horario: cliente.horario,
    observacoes: cliente.observacoes,
    notas: "",
    servico: nomeServico(ref.selecao, cat),
    selecao: ref.selecao,
    catalogoVersao: cat.versao,
    emitidoEm: ref.emitidoEm,
    itens: calculo.linhas,
    totalOrcado: calculo.total,
    totalEhMinimo: calculo.totalEhMinimo,
    valorCombinado: null,
    sinalPercentual: cliente.data ? percentualSinal(ref.emitidoEm, cliente.data, cat) : null,
    extras: [],
    pagamentos: [],
  };
}

/** Recalcula os itens pela tabela atual (usado só se você pedir, nunca automático). */
export function itensAtuais(a: Agendamento, cat: Catalogo) {
  return calcular(a.selecao, cat);
}

export function valorTotal(a: Agendamento): number {
  const base = a.valorCombinado ?? a.totalOrcado;
  return base + a.extras.reduce((s, e) => s + e.valor, 0);
}

export function valorPago(a: Agendamento): number {
  return a.pagamentos.reduce((s, p) => s + p.valor, 0);
}

export function valorRestante(a: Agendamento): number {
  return Math.max(0, valorTotal(a) - valorPago(a));
}

export function valorDoSinal(a: Agendamento): number | null {
  if (a.sinalPercentual === null) return null;
  return valorSinal(a.valorCombinado ?? a.totalOrcado, a.sinalPercentual);
}

export function nomeStatus(s: StatusAgendamento): string {
  return s === "cancelado" ? "Cancelado" : (ETAPAS.find((e) => e.id === s)?.nome ?? s);
}

export function indiceEtapa(s: StatusAgendamento): number {
  return ETAPAS.findIndex((e) => e.id === s);
}

export function ativo(a: Agendamento): boolean {
  return a.status !== "cancelado" && a.status !== "entregue";
}

export function mudarStatus(a: Agendamento, status: StatusAgendamento, agora = new Date()): Agendamento {
  if (a.status === status) return a;
  const em = agora.toISOString();
  return { ...a, status, atualizadoEm: em, historico: [...a.historico, { status, em }] };
}

/** Ordem da agenda: com data primeiro (mais próxima antes, depois por horário), sem data por último. */
export function compararPorData(a: Agendamento, b: Agendamento): number {
  if (a.data && b.data) return (a.data + a.horario).localeCompare(b.data + b.horario);
  if (a.data) return -1;
  if (b.data) return 1;
  return b.criadoEm.localeCompare(a.criadoEm);
}

/**
 * Checagem mínima do que chega do navegador. O corpo vem do próprio dono dos
 * dados (a rota exige login), então o objetivo é não gravar lixo que quebraria
 * a próxima leitura — não é defesa contra outro usuário.
 */
export function estadoValido(v: unknown): v is { versaoBase: number; agendamentos: Agendamento[] } {
  if (typeof v !== "object" || v === null) return false;
  const e = v as { versaoBase?: unknown; agendamentos?: unknown };
  return (
    typeof e.versaoBase === "number" &&
    Array.isArray(e.agendamentos) &&
    e.agendamentos.every(
      (a) =>
        typeof a === "object" &&
        a !== null &&
        typeof (a as Agendamento).id === "string" &&
        typeof (a as Agendamento).status === "string" &&
        Array.isArray((a as Agendamento).pagamentos),
    )
  );
}

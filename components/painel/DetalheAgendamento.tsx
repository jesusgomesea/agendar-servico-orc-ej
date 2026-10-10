// Detalhe de um agendamento: etapa, data/local, cliente, valores, pagamentos e notas.
//
// Tudo é editado numa cópia local e só vai ao servidor no "Salvar" — assim dá
// para mexer em vários campos e desistir. Fechar com alteração pendente pergunta.
"use client";

import { MessageCircle, Plus, Trash2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  ETAPAS,
  indiceEtapa,
  mudarStatus,
  novoId,
  valorDoSinal,
  valorPago,
  valorRestante,
  valorTotal,
  type Agendamento,
  type StatusAgendamento,
} from "@/lib/agenda";
import { CATALOGO } from "@/lib/catalogo";
import { cn } from "@/lib/cn";
import { dataBR, hojeIso, lerMoeda, linkWhatsApp, moeda } from "@/lib/formato";
import { percentualSinal } from "@/lib/orcamento";
import { Botao, classesBotao } from "@/components/ui/Botao";
import { Campo, CampoTexto, classesEntrada } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import SeloStatus from "./SeloStatus";

interface Props {
  agendamento: Agendamento | null;
  aoFechar: () => void;
  aoSalvar: (a: Agendamento) => Promise<boolean>;
  aoExcluir: (id: string) => Promise<boolean>;
  salvando: boolean;
}

/** Atalhos de cobrança de pós-venda, com os valores das políticas. */
const EXTRAS_RAPIDOS = [
  { descricao: "Remarcação", valor: 45 },
  { descricao: "Reedição (por foto)", valor: 18 },
  { descricao: "Foto extra editada", valor: CATALOGO.fotoExtra.preco },
];

export default function DetalheAgendamento({ agendamento, aoFechar, aoSalvar, aoExcluir, salvando }: Props) {
  const [rascunho, setRascunho] = useState<Agendamento | null>(agendamento);

  // Abriu outro agendamento (ou o mesmo foi regravado): começa do que está salvo.
  useEffect(() => setRascunho(agendamento), [agendamento]);

  if (!agendamento || !rascunho) return <Modal aberto={false} aoFechar={aoFechar} titulo="">{null}</Modal>;

  const a = rascunho;
  const alterado = JSON.stringify(a) !== JSON.stringify(agendamento);
  const mudar = <K extends keyof Agendamento>(campo: K, valor: Agendamento[K]) => setRascunho({ ...a, [campo]: valor });

  const fechar = () => {
    if (alterado && !confirm("Descartar as alterações não salvas?")) return;
    aoFechar();
  };

  const salvar = async () => {
    const final = { ...a, atualizadoEm: new Date().toISOString() };
    // Data mudou: o percentual do sinal segue a antecedência entre o orçamento e a nova data.
    if (CATALOGO.cobrarSinal && final.data !== agendamento.data) {
      final.sinalPercentual = final.data ? percentualSinal(final.emitidoEm, final.data, CATALOGO) : null;
    }
    // Mudança de etapa já registrou o histórico em mudarStatus; aqui só grava.
    if (await aoSalvar(final)) aoFechar();
  };

  const excluir = async () => {
    if (!confirm(`Excluir o agendamento de ${a.clienteNome || "cliente sem nome"}? Isso não pode ser desfeito.`)) return;
    if (await aoExcluir(a.id)) aoFechar();
  };

  const irPara = (s: StatusAgendamento) => setRascunho(mudarStatus(a, s));
  const etapaAtual = indiceEtapa(a.status);
  const sinal = valorDoSinal(a);
  const linkCliente = linkWhatsApp(a.clienteTelefone);

  const novoPagamento = () => {
    const sugestao = a.pagamentos.length === 0 && sinal !== null ? sinal : valorRestante(a);
    mudar("pagamentos", [
      ...a.pagamentos,
      { id: novoId(), data: hojeIso(), valor: sugestao, descricao: a.pagamentos.length === 0 && sinal !== null ? "Sinal" : "Pagamento" },
    ]);
  };

  return (
    <Modal
      aberto
      aoFechar={fechar}
      largura="g"
      titulo={a.clienteNome || "Cliente sem nome"}
      descricao={`${a.servico} · ${a.codigo}`}
      rodape={
        <>
          <Botao variante="perigo" className="mr-auto" onClick={excluir} disabled={salvando}>
            <Trash2 className="size-4" /> Excluir
          </Botao>
          <Botao variante="fantasma" onClick={fechar}>
            Fechar
          </Botao>
          <Botao variante="primario" onClick={salvar} disabled={!alterado || salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-7">
        {/* Etapas */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-suave">Etapa</h3>
            <SeloStatus status={a.status} />
          </div>
          {a.status === "cancelado" ? (
            <Botao variante="secundario" tamanho="p" onClick={() => irPara("recebido")}>
              Reabrir agendamento
            </Botao>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {ETAPAS.map((e, i) => (
                <button
                  key={e.id}
                  type="button"
                  title={e.descricao}
                  onClick={() => irPara(e.id)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs transition-colors",
                    i === etapaAtual
                      ? "border-destaque bg-destaque text-sobre-destaque font-semibold"
                      : i < etapaAtual
                        ? "border-borda-forte text-suave"
                        : "border-borda text-fraco hover:border-borda-forte hover:text-texto",
                  )}
                >
                  {i + 1}. {e.nome}
                </button>
              ))}
              <button
                type="button"
                onClick={() => irPara("cancelado")}
                className="h-8 rounded-full border border-borda px-3 text-xs text-fraco hover:border-erro/50 hover:text-erro"
              >
                Cancelar
              </button>
            </div>
          )}
        </section>

        {/* Agenda e cliente */}
        <section className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Data" type="date" value={a.data} onChange={(e) => mudar("data", e.target.value)} />
          <Campo rotulo="Horário" type="time" value={a.horario} onChange={(e) => mudar("horario", e.target.value)} />
          <div className="sm:col-span-2">
            <Campo rotulo="Local" value={a.local} onChange={(e) => mudar("local", e.target.value)} />
          </div>
          <Campo rotulo="Cliente" value={a.clienteNome} onChange={(e) => mudar("clienteNome", e.target.value)} />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Campo rotulo="WhatsApp" type="tel" value={a.clienteTelefone} onChange={(e) => mudar("clienteTelefone", e.target.value)} />
            </div>
            {linkCliente && (
              <a href={linkCliente} target="_blank" rel="noopener noreferrer" className={classesBotao("secundario", "m", "h-11! px-3!")} aria-label="Abrir conversa no WhatsApp">
                <MessageCircle className="size-4" />
              </a>
            )}
          </div>
        </section>

        {/* Valores */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-suave">Orçamento</h3>
          <ul className="flex flex-col gap-1.5 rounded-xl border border-borda bg-superficie-2 p-4 text-sm">
            {a.itens.map((l, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="text-suave">
                  {l.descricao}
                  {l.quantidade > 1 && ` × ${l.quantidade}`}
                </span>
                <span className="tabular">{l.tipo === "aCombinar" ? "a combinar" : moeda(l.valor)}</span>
              </li>
            ))}
            <li className="mt-1 flex justify-between border-t border-borda pt-2">
              <span>{a.totalEhMinimo ? "Orçado (mínimo)" : "Orçado"}</span>
              <span className="tabular font-semibold">{moeda(a.totalOrcado)}</span>
            </li>
          </ul>
          <div className="mt-4 max-w-xs">
            <CampoValor
              key={a.id}
              rotulo="Valor fechado"
              valor={a.valorCombinado}
              placeholder={moeda(a.totalOrcado)}
              aoMudar={(v) => mudar("valorCombinado", v)}
              dica={a.totalEhMinimo ? "Preencha depois de combinar o deslocamento ou a diária." : "Deixe vazio para usar o valor orçado."}
            />
          </div>
        </section>

        {/* Extras de pós-venda */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-suave">Cobranças extras</h3>
            <div className="flex flex-wrap gap-1.5">
              {EXTRAS_RAPIDOS.map((x) => (
                <Botao
                  key={x.descricao}
                  variante="secundario"
                  tamanho="p"
                  onClick={() => mudar("extras", [...a.extras, { id: novoId(), ...x }])}
                >
                  <Plus className="size-3.5" /> {x.descricao}
                </Botao>
              ))}
              <Botao variante="fantasma" tamanho="p" onClick={() => mudar("extras", [...a.extras, { id: novoId(), descricao: "", valor: 0 }])}>
                <Plus className="size-3.5" /> Outro
              </Botao>
            </div>
          </div>
          <ListaValores
            itens={a.extras}
            vazio="Nenhuma cobrança extra."
            aoMudar={(extras) => mudar("extras", extras)}
            placeholder="Descrição"
          />
        </section>

        {/* Pagamentos */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-suave">Pagamentos recebidos</h3>
            <Botao variante="secundario" tamanho="p" onClick={novoPagamento}>
              <Plus className="size-3.5" /> Registrar pagamento
            </Botao>
          </div>
          <ListaValores
            itens={a.pagamentos}
            vazio="Nenhum pagamento registrado."
            aoMudar={(pagamentos) => mudar("pagamentos", pagamentos as Agendamento["pagamentos"])}
            comData
            placeholder="Entrada, restante…"
          />
          <dl className={cn("mt-4 grid gap-3", CATALOGO.cobrarSinal ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
            <Numero rotulo="Total" valor={moeda(valorTotal(a))} />
            {CATALOGO.cobrarSinal && <Numero rotulo={sinal !== null ? `Sinal (${a.sinalPercentual}%)` : "Sinal"} valor={sinal !== null ? moeda(sinal) : "sem data"} />}
            <Numero rotulo="Pago" valor={moeda(valorPago(a))} />
            <Numero rotulo="Restante" valor={moeda(valorRestante(a))} destaque={valorRestante(a) > 0} />
          </dl>
        </section>

        {/* Observações e notas */}
        <section className="grid gap-4">
          {a.observacoes && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-suave">Observações do cliente</p>
              <p className="rounded-lg bg-superficie-2 px-3 py-2.5 text-sm">{a.observacoes}</p>
            </div>
          )}
          <CampoTexto
            rotulo="Suas notas"
            dica="Só você vê."
            value={a.notas}
            onChange={(e) => mudar("notas", e.target.value)}
            placeholder="Referências, pedidos especiais, equipamento…"
          />
        </section>

        {/* Histórico */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-suave">Histórico</h3>
          <ol className="flex flex-col gap-1 text-xs text-fraco">
            <li>Orçamento emitido pelo cliente em {dataBR(a.emitidoEm)}</li>
            {a.historico.map((h, i) => (
              <li key={i}>
                {new Date(h.em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} — {ETAPAS.find((e) => e.id === h.status)?.nome ?? "Cancelado"}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Modal>
  );
}

interface ItemValor {
  id: string;
  descricao: string;
  valor: number;
  data?: string;
}

/** Lista editável de descrição + valor (e data, nos pagamentos). */
function ListaValores({
  itens,
  aoMudar,
  vazio,
  comData,
  placeholder,
}: {
  itens: ItemValor[];
  aoMudar: (itens: ItemValor[]) => void;
  vazio: string;
  comData?: boolean;
  placeholder: string;
}) {
  if (itens.length === 0) return <p className="text-sm text-fraco">{vazio}</p>;
  const trocar = (id: string, parcial: Partial<ItemValor>) => aoMudar(itens.map((i) => (i.id === id ? { ...i, ...parcial } : i)));
  return (
    <ul className="flex flex-col gap-2">
      {itens.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {comData && (
            <input
              type="date"
              aria-label="Data do pagamento"
              value={i.data ?? ""}
              onChange={(e) => trocar(i.id, { data: e.target.value })}
              className={cn(classesEntrada, "h-10 w-40")}
            />
          )}
          <input
            aria-label="Descrição"
            value={i.descricao}
            placeholder={placeholder}
            onChange={(e) => trocar(i.id, { descricao: e.target.value })}
            className={cn(classesEntrada, "h-10 min-w-0 flex-1")}
          />
          <EntradaValor valor={i.valor} aoMudar={(v) => trocar(i.id, { valor: v ?? 0 })} className={cn(classesEntrada, "tabular h-10 w-28 text-right")} />
          <button
            type="button"
            onClick={() => aoMudar(itens.filter((x) => x.id !== i.id))}
            className="grid size-10 shrink-0 place-items-center rounded-lg text-fraco hover:bg-superficie-3 hover:text-erro"
            aria-label="Remover"
          >
            <X className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Numero({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-lg border border-borda px-3 py-2">
      <dt className="text-xs text-fraco">{rotulo}</dt>
      <dd className={cn("tabular mt-0.5 font-semibold", destaque && "text-aviso")}>{valor}</dd>
    </div>
  );
}

/** Texto de um valor em reais para editar: 150 → "150", 150.5 → "150,50". */
function textoDoValor(v: number | null): string {
  if (v === null) return "";
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",");
}

/**
 * Campo de valor em reais que grava a cada tecla. Guarda o texto digitado à
 * parte (senão "150," viraria "150" no meio da digitação) e manda o número já
 * convertido; vazio = null.
 */
function EntradaValor({ valor, aoMudar, className, ...resto }: { valor: number | null; aoMudar: (v: number | null) => void; className?: string; placeholder?: string; id?: string }) {
  const [texto, setTexto] = useState(() => textoDoValor(valor));
  return (
    <input
      aria-label="Valor"
      inputMode="decimal"
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value);
        aoMudar(e.target.value.trim() ? lerMoeda(e.target.value) : null);
      }}
      className={className}
      {...resto}
    />
  );
}

function CampoValor({ rotulo, dica, ...resto }: { rotulo: string; dica?: string; valor: number | null; aoMudar: (v: number | null) => void; placeholder?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-suave">
        {rotulo}
      </label>
      <EntradaValor id={id} className={cn(classesEntrada, "tabular h-11 w-full")} {...resto} />
      {dica && <p className="text-xs text-fraco">{dica}</p>}
    </div>
  );
}

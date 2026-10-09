// Tela principal do painel: números do momento, busca, abas e a lista da agenda.
//
// Abas:
//  Agenda      – tudo em andamento (não cancelado nem entregue), por data, agrupado por mês;
//  Entregues   – trabalhos concluídos, do mais recente para o mais antigo;
//  Cancelados.
// O calendário mensal fica para a Fase 2 (ver docs/MANUTENCAO.md); a lista por
// data cobre o uso diário.
"use client";

import { logout } from "@netlify/identity";
import { CalendarClock, ClipboardPaste, Download, ExternalLink, LogOut, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ativo, compararPorData, valorRestante, valorTotal, type Agendamento } from "@/lib/agenda";
import { cn } from "@/lib/cn";
import { MODO_LOCAL } from "@/lib/modoLocal";
import { diasEntre, hojeIso, moeda, partesData } from "@/lib/formato";
import { Botao, classesBotao } from "@/components/ui/Botao";
import { classesEntrada } from "@/components/ui/Campo";
import { useAviso } from "@/components/ui/Avisos";
import ColarOrcamento from "./ColarOrcamento";
import DetalheAgendamento from "./DetalheAgendamento";
import SeloStatus from "./SeloStatus";
import { useAgenda } from "./useAgenda";

type Aba = "agenda" | "entregues" | "cancelados";

const MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function Painel() {
  const agenda = useAgenda();
  const avisar = useAviso();
  const [aba, setAba] = useState<Aba>("agenda");
  const [busca, setBusca] = useState("");
  const [colando, setColando] = useState(false);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const hoje = hojeIso();

  const aberto = agenda.lista.find((a) => a.id === abertoId) ?? null;

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const casa = (a: Agendamento) =>
      !termo || [a.clienteNome, a.codigo, a.local, a.servico, a.clienteTelefone].some((t) => t.toLowerCase().includes(termo));
    const porAba = agenda.lista.filter((a) =>
      aba === "agenda" ? ativo(a) : aba === "entregues" ? a.status === "entregue" : a.status === "cancelado",
    );
    const ordenados = porAba.filter(casa).sort(compararPorData);
    return aba === "agenda" ? ordenados : ordenados.reverse();
  }, [agenda.lista, aba, busca]);

  const numeros = useMemo(() => {
    const ativos = agenda.lista.filter(ativo);
    return {
      aguardando: ativos.filter((a) => a.status === "recebido").length,
      proximos: ativos.filter((a) => a.data && a.data >= hoje && diasEntre(hoje, a.data) <= 30).length,
      aReceber: ativos.filter((a) => a.status !== "recebido").reduce((s, a) => s + valorRestante(a), 0),
    };
  }, [agenda.lista, hoje]);

  const criar = async (a: Agendamento) => {
    const ok = await agenda.adicionar(a);
    if (ok) {
      avisar("Agendamento criado.");
      setAbertoId(a.id);
    }
    return ok;
  };

  const salvar = async (a: Agendamento) => {
    const ok = await agenda.atualizar(a);
    if (ok) avisar("Alterações salvas.");
    return ok;
  };

  const excluir = async (id: string) => {
    const ok = await agenda.remover(id);
    if (ok) avisar("Agendamento excluído.", "info");
    return ok;
  };

  const baixarCopia = () => {
    if (!agenda.estado) return;
    const blob = new Blob([JSON.stringify(agenda.estado, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agenda-ej-${hoje}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sair = async () => {
    try {
      await logout();
    } finally {
      // Navegação completa: o cookie de sessão apagado precisa valer na próxima requisição.
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-dvh">
      {MODO_LOCAL && (
        <p className="bg-aviso/15 px-4 py-1.5 text-center text-xs text-aviso">
          Modo local: sem login, agenda salva em .dados-locais/agenda.json neste computador.
        </p>
      )}
      <header className="border-b border-borda">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo estática pequena */}
            <img src="/logo.png" alt="" width={36} height={31} />
            <span className="font-titulo text-lg font-semibold">Painel</span>
          </div>
          <nav className="flex items-center gap-1">
            <a href="/" target="_blank" className={classesBotao("fantasma", "p")} title="Abrir o site público">
              <ExternalLink className="size-4" /> <span className="hidden sm:inline">Site</span>
            </a>
            <Botao variante="fantasma" tamanho="p" onClick={baixarCopia} title="Baixar uma cópia da agenda (JSON)" disabled={!agenda.estado}>
              <Download className="size-4" /> <span className="hidden sm:inline">Cópia</span>
            </Botao>
            <Botao variante="fantasma" tamanho="p" onClick={sair}>
              <LogOut className="size-4" /> <span className="hidden sm:inline">Sair</span>
            </Botao>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-24">
        {agenda.erro ? (
          <div role="alert" className="rounded-2xl border border-erro/40 bg-superficie p-6">
            <p className="font-semibold text-erro">Não foi possível abrir a agenda</p>
            <p className="mt-1 text-sm text-suave">{agenda.erro}</p>
            <Botao variante="secundario" className="mt-4" onClick={agenda.recarregar}>
              <RefreshCw className="size-4" /> Tentar de novo
            </Botao>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-titulo text-3xl font-semibold">Agenda</h1>
                <p className="mt-1 text-sm text-suave">Cole aqui os orçamentos que chegam pelo WhatsApp.</p>
              </div>
              <Botao variante="primario" tamanho="g" onClick={() => setColando(true)} disabled={agenda.carregando}>
                <ClipboardPaste className="size-5" /> Colar orçamento
              </Botao>
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              <Numero rotulo="Aguardando confirmação" valor={String(numeros.aguardando)} />
              <Numero rotulo="Nos próximos 30 dias" valor={String(numeros.proximos)} />
              <Numero rotulo="A receber" valor={moeda(numeros.aReceber)} />
            </dl>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Filtrar agendamentos" className="flex gap-1 rounded-lg border border-borda bg-superficie p-1">
                {(
                  [
                    ["agenda", "Agenda"],
                    ["entregues", "Entregues"],
                    ["cancelados", "Cancelados"],
                  ] as [Aba, string][]
                ).map(([id, nome]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={aba === id}
                    onClick={() => setAba(id)}
                    className={cn("h-8 rounded-md px-3 text-sm", aba === id ? "bg-superficie-3 font-medium text-texto" : "text-suave hover:text-texto")}
                  >
                    {nome}
                  </button>
                ))}
              </div>
              <label className="relative w-full sm:w-64">
                <span className="sr-only">Buscar</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fraco" />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome, código, local…"
                  className={cn(classesEntrada, "h-10 w-full pl-9 text-sm")}
                />
              </label>
            </div>

            <div className="mt-4">
              {agenda.carregando && !agenda.estado ? (
                <p className="py-16 text-center text-sm text-suave">Carregando agenda…</p>
              ) : filtrados.length === 0 ? (
                <Vazio aba={aba} buscando={!!busca.trim()} />
              ) : (
                <ListaAgrupada itens={filtrados} agruparPorMes={aba === "agenda"} hoje={hoje} aoAbrir={setAbertoId} />
              )}
            </div>
          </>
        )}
      </main>

      <ColarOrcamento aberto={colando} aoFechar={() => setColando(false)} existentes={agenda.lista} aoCriar={criar} />
      <DetalheAgendamento agendamento={aberto} aoFechar={() => setAbertoId(null)} aoSalvar={salvar} aoExcluir={excluir} salvando={agenda.salvando} />
    </div>
  );
}

function ListaAgrupada({
  itens,
  agruparPorMes,
  hoje,
  aoAbrir,
}: {
  itens: Agendamento[];
  agruparPorMes: boolean;
  hoje: string;
  aoAbrir: (id: string) => void;
}) {
  const grupos: { titulo: string; itens: Agendamento[] }[] = [];
  for (const a of itens) {
    const titulo = !agruparPorMes ? "" : a.data ? `${MESES_LONGOS[Number(a.data.slice(5, 7)) - 1]} ${a.data.slice(0, 4)}` : "Sem data definida";
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.titulo === titulo) ultimo.itens.push(a);
    else grupos.push({ titulo, itens: [a] });
  }

  return (
    <div className="flex flex-col gap-6">
      {grupos.map((g) => (
        <section key={g.titulo || "todos"}>
          {g.titulo && <h2 className="mb-2 text-xs font-semibold tracking-widest text-fraco uppercase">{g.titulo}</h2>}
          <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie">
            {g.itens.map((a) => (
              <li key={a.id}>
                <ItemAgenda a={a} hoje={hoje} aoAbrir={() => aoAbrir(a.id)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ItemAgenda({ a, hoje, aoAbrir }: { a: Agendamento; hoje: string; aoAbrir: () => void }) {
  const p = a.data ? partesData(a.data) : null;
  const passou = !!a.data && a.data < hoje;
  // Data passou e o trabalho nem foi marcado como realizado: algo ficou para trás.
  const atrasado = passou && ["recebido", "confirmado", "sinal_pago"].includes(a.status);
  const restante = valorRestante(a);

  return (
    <button type="button" onClick={aoAbrir} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-superficie-2">
      <div className={cn("w-12 shrink-0 text-center", passou && "opacity-50")}>
        {p ? (
          <>
            <p className="text-[11px] text-fraco uppercase">{p.semana}</p>
            <p className="tabular font-titulo text-2xl leading-none font-semibold">{p.dia}</p>
            <p className="text-[11px] text-suave uppercase">{p.mes}</p>
          </>
        ) : (
          <CalendarClock className="mx-auto size-5 text-fraco" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{a.clienteNome || "Cliente sem nome"}</p>
        <p className="truncate text-sm text-suave">
          {a.servico}
          {a.horario && ` · ${a.horario}`}
          {a.local && ` · ${a.local}`}
        </p>
        {atrasado && <p className="text-xs text-aviso">A data já passou — atualize a etapa.</p>}
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="tabular text-sm">{moeda(valorTotal(a))}</p>
        <p className={cn("tabular text-xs", restante > 0 ? "text-fraco" : "text-ok")}>{restante > 0 ? `falta ${moeda(restante)}` : "quitado"}</p>
      </div>
      <SeloStatus status={a.status} />
    </button>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-borda bg-superficie px-3 py-3 sm:px-4">
      <dt className="text-xs leading-tight text-suave">{rotulo}</dt>
      <dd className="tabular mt-1 font-titulo text-base font-semibold whitespace-nowrap sm:text-2xl">{valor}</dd>
    </div>
  );
}

function Vazio({ aba, buscando }: { aba: Aba; buscando: boolean }) {
  const texto = buscando
    ? "Nada encontrado com essa busca."
    : aba === "agenda"
      ? "Nenhum agendamento em andamento. Quando um cliente mandar o orçamento, use “Colar orçamento”."
      : aba === "entregues"
        ? "Nenhum trabalho entregue ainda."
        : "Nenhum agendamento cancelado.";
  return <p className="rounded-xl border border-dashed border-borda px-6 py-14 text-center text-sm text-suave">{texto}</p>;
}

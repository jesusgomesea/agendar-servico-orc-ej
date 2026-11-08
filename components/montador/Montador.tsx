// Montador de orçamento — a página pública que o cliente usa.
//
// Fluxo: escolhe o serviço → o pacote → ajustes (horas, fotos, entrega,
// deslocamento) → seus dados → "Enviar pelo WhatsApp". O valor é calculado a
// cada clique por `calcular()` (lib/orcamento.ts), a mesma conta que o painel
// refaz ao colar a mensagem.
//
// O rascunho fica no localStorage do aparelho do cliente: se ele fechar a aba
// para conferir a agenda e voltar, não perde o que montou. É só conveniência —
// qualquer falha de leitura/escrita é ignorada.
"use client";

import { Camera, Check, PartyPopper, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CATALOGO, entregaValeNo, pacoteDisponivel, type Catalogo, type CategoriaId, type Pacote } from "@/lib/catalogo";
import { cn } from "@/lib/cn";
import { hojeIso, moeda } from "@/lib/formato";
import { calcular, precoFoto, prazoEntrega, selecaoVazia, type DadosCliente, type Selecao } from "@/lib/orcamento";
import { Campo, CampoTexto } from "@/components/ui/Campo";
import { Contador } from "@/components/ui/Contador";
import Resumo from "./Resumo";

// v3 desde a tabela v4: rascunhos antigos tinham fotos brutas, retoque e "Edição de fotos".
const CHAVE_RASCUNHO = "ej-rascunho-v3";

const ICONES: Partial<Record<CategoriaId, ReactNode>> = {
  ensaio: <Camera className="size-5" />,
  evento: <PartyPopper className="size-5" />,
  auxiliar: <Users className="size-5" />,
};

const CLIENTE_VAZIO: DadosCliente = { nome: "", telefone: "", local: "", data: "", horario: "", observacoes: "" };

/**
 * Tira da seleção o que o cliente não pode escolher agora: serviço ou pacote
 * fora do site (legado ou desativado, ex.: Sessão Rápida fora de data especial),
 * expressa que o pacote não oferece e faixa de deslocamento que saiu da tabela.
 * Usado ao restaurar o rascunho e ao trocar de serviço/pacote, para a tela nunca
 * mostrar algo escondido.
 */
function ajustarAoServico(s: Selecao, cat: Catalogo): Selecao {
  const categoria = cat.categorias.find((c) => c.id === s.categoria);
  const r = categoria && !categoria.legado ? { ...s } : { ...s, categoria: "ensaio" as CategoriaId };
  const pacote = cat.pacotes.find((p) => p.id === r.pacoteId);
  const entrega = cat.entregas.find((e) => e.id === r.entregaId);
  const desl = cat.deslocamentos.find((d) => d.id === r.deslocamentoId);
  const pacoteOk = pacote && pacote.categoria === r.categoria && pacoteDisponivel(pacote);
  return {
    ...r,
    pacoteId: pacoteOk ? r.pacoteId : null,
    entregaId: entrega && pacoteOk && entregaValeNo(entrega, r.pacoteId) ? r.entregaId : "padrao",
    deslocamentoId: desl && !desl.legado ? r.deslocamentoId : "ate10",
  };
}

export default function Montador() {
  const cat = CATALOGO;
  const [selecao, setSelecao] = useState<Selecao>(() => selecaoVazia("ensaio"));
  const [cliente, setCliente] = useState<DadosCliente>(CLIENTE_VAZIO);
  // Só começa a gravar o rascunho depois de restaurá-lo. É estado (e não ref)
  // de propósito: com ref, a gravação rodava no mesmo ciclo com o formulário
  // ainda vazio e apagava o rascunho antes de ele ser lido — no modo de
  // desenvolvimento, que roda os efeitos duas vezes, o rascunho sempre se perdia.
  const [restaurado, setRestaurado] = useState(false);

  // Restaura o rascunho depois de montar (no servidor não existe localStorage,
  // e ler já no primeiro render causaria diferença de hidratação).
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(CHAVE_RASCUNHO);
      if (bruto) {
        const r = JSON.parse(bruto) as { selecao?: Partial<Selecao>; cliente?: Partial<DadosCliente> };
        if (r.selecao) setSelecao((s) => ajustarAoServico({ ...s, ...r.selecao }, cat));
        if (r.cliente) setCliente((c) => ({ ...c, ...r.cliente, data: r.cliente?.data && r.cliente.data >= hojeIso() ? r.cliente.data : "" }));
      }
    } catch {
      // Rascunho ilegível ou armazenamento bloqueado: começa do zero.
    }
    setRestaurado(true);
  }, [cat]);

  useEffect(() => {
    if (!restaurado) return;
    try {
      localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({ selecao, cliente }));
    } catch {
      // Sem armazenamento (aba anônima, cota): segue sem rascunho.
    }
  }, [selecao, cliente, restaurado]);

  const calculo = useMemo(() => calcular(selecao, cat), [selecao, cat]);
  const categoria = cat.categorias.find((c) => c.id === selecao.categoria)!;
  const pacotes = cat.pacotes.filter((p) => p.categoria === categoria.id && pacoteDisponivel(p));
  const pacote = pacotes.find((p) => p.id === selecao.pacoteId);
  const personalizado = !!pacote?.personalizado;
  const expressas = pacote ? cat.entregas.filter((e) => entregaValeNo(e, pacote.id)) : [];
  const prazo = prazoEntrega({ ...selecao, entregaId: "padrao" }, cat);
  const modoAuxiliar = cat.auxiliar.modos.find((m) => m.id === selecao.modoAuxiliar) ?? cat.auxiliar.modos[0];

  const mudar = <K extends keyof Selecao>(campo: K, valor: Selecao[K]) => setSelecao((s) => ({ ...s, [campo]: valor }));
  const mudarCliente = <K extends keyof DadosCliente>(campo: K, valor: DadosCliente[K]) => setCliente((c) => ({ ...c, [campo]: valor }));

  const escolherCategoria = (id: CategoriaId) =>
    setSelecao((s) => {
      if (s.categoria === id) return s;
      // O pacote de outra categoria é limpo (não sobra um "Padrão" de ensaio num evento).
      return ajustarAoServico({ ...s, categoria: id, diariasAuxiliar: Math.max(1, s.diariasAuxiliar) }, cat);
    });

  const escolherPacote = (p: Pacote) =>
    setSelecao((s) => {
      const regra = cat.categorias.find((c) => c.id === p.categoria)?.personalizado;
      // Personalizado começa no mínimo de horas e fotos, para o total já sair válido.
      const comMinimos =
        p.personalizado && regra
          ? { horasPersonalizado: Math.max(regra.horasMin, s.horasPersonalizado), fotosPersonalizado: Math.max(regra.fotosMin, s.fotosPersonalizado) }
          : {};
      return ajustarAoServico({ ...s, pacoteId: p.id, ...comMinimos }, cat);
    });

  let passo = 1;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 lg:pb-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        <div className="flex flex-col gap-12">
          <Passo numero={passo++} titulo="Qual serviço você procura?">
            <div className="grid gap-3 sm:grid-cols-2">
              {cat.categorias
                .filter((c) => !c.legado)
                .map((c) => (
                  <Opcao key={c.id} selecionada={selecao.categoria === c.id} aoEscolher={() => escolherCategoria(c.id)}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-suave">{ICONES[c.id]}</span>
                      <span>
                        <span className="block font-semibold">{c.nome}</span>
                        <span className="mt-0.5 block text-sm text-suave">{c.descricao}</span>
                      </span>
                    </div>
                  </Opcao>
                ))}
            </div>
          </Passo>

          {categoria.temSessao && (
            <Passo numero={passo++} titulo="Escolha o pacote" subtitulo="O prazo de entrega depende do pacote.">
              <div className="grid gap-3 sm:grid-cols-2">
                {pacotes.map((p) => (
                  <Opcao key={p.id} selecionada={selecao.pacoteId === p.id} aoEscolher={() => escolherPacote(p)}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-titulo text-xl font-semibold">{p.nome}</span>
                      <span className="tabular text-lg font-semibold">{p.personalizado ? "sob medida" : moeda(p.preco)}</span>
                    </div>
                    <p className="mt-2 text-sm text-suave">{p.duracao}</p>
                    <p className="text-sm text-suave">{p.personalizado ? p.entrega : `${p.entrega} editadas`}</p>
                    <p className="mt-2 text-xs text-fraco">
                      {p.personalizado
                        ? `${moeda(categoria.personalizado?.valorHora ?? 0)} por hora · ${moeda(categoria.foto?.preco ?? 0)} por foto`
                        : `Entrega ${p.prazo}`}
                    </p>
                    {p.aviso && <p className="mt-2 text-xs text-suave">{p.aviso}</p>}
                    {p.destaque && (
                      <span className="mt-3 inline-block rounded-full border border-borda-forte px-2 py-0.5 text-xs text-suave">Mais escolhido</span>
                    )}
                  </Opcao>
                ))}
              </div>
            </Passo>
          )}

          {categoria.id === "auxiliar" && (
            <Passo numero={passo++} titulo="Como é a diária?" subtitulo={cat.auxiliar.observacao}>
              <div className="grid gap-2 sm:grid-cols-2">
                {cat.auxiliar.modos.map((m) => (
                  <Opcao key={m.id} compacta selecionada={selecao.modoAuxiliar === m.id} aoEscolher={() => mudar("modoAuxiliar", m.id)}>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">{m.nome}</span>
                      <span className="tabular text-sm">{moeda(m.diaria)}</span>
                    </span>
                  </Opcao>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-borda bg-superficie">
                <Linha titulo="Diárias" preco={`${moeda(modoAuxiliar.diaria)} cada`}>
                  <Contador rotulo="diárias" valor={selecao.diariasAuxiliar} aoMudar={(n) => mudar("diariasAuxiliar", n)} minimo={1} maximo={30} />
                </Linha>
              </div>
              {modoAuxiliar.cobraDeslocamento && (
                <>
                  <h3 className="mt-8 mb-3 text-sm font-semibold text-suave">Local do trabalho</h3>
                  <Deslocamentos cat={cat} escolhido={selecao.deslocamentoId} aoEscolher={(id) => mudar("deslocamentoId", id)} />
                </>
              )}
            </Passo>
          )}

          {categoria.temSessao && (
            <Passo
              numero={passo++}
              titulo={personalizado ? "Monte o seu pacote" : "Ajuste do seu jeito"}
              subtitulo={personalizado ? "Escolha as horas de cobertura e quantas fotos editadas quer." : "Opcional. Deixe em zero o que não precisar."}
            >
              <div className="divide-y divide-borda rounded-xl border border-borda bg-superficie">
                {personalizado && categoria.personalizado && categoria.foto ? (
                  <>
                    <Linha
                      titulo="Horas de cobertura"
                      preco={`${moeda(categoria.personalizado.valorHora)} / hora`}
                      descricao={`Mínimo de ${categoria.personalizado.horasMin}h`}
                    >
                      <Contador
                        rotulo="horas de cobertura"
                        valor={selecao.horasPersonalizado}
                        aoMudar={(n) => mudar("horasPersonalizado", n)}
                        minimo={categoria.personalizado.horasMin}
                        maximo={12}
                        unidade="h"
                      />
                    </Linha>
                    <Linha
                      titulo="Fotos editadas"
                      preco={`${moeda(precoFoto(selecao.fotosPersonalizado, categoria))} / foto`}
                      descricao={`Mínimo de ${categoria.personalizado.fotosMin} · ${moeda(categoria.foto.precoVolume)} cada a partir de ${categoria.foto.volumeMin}`}
                    >
                      <Contador
                        rotulo="fotos editadas"
                        valor={selecao.fotosPersonalizado}
                        aoMudar={(n) => mudar("fotosPersonalizado", n)}
                        minimo={categoria.personalizado.fotosMin}
                        maximo={500}
                      />
                    </Linha>
                  </>
                ) : (
                  <>
                    <Linha titulo="Hora extra em campo" preco={`${moeda(categoria.horaExtra ?? 0)} / hora`}>
                      <Contador rotulo="horas extras" valor={selecao.horasExtras} aoMudar={(n) => mudar("horasExtras", n)} maximo={8} unidade="h" />
                    </Linha>
                    {categoria.foto && (
                      <Linha
                        titulo="Fotos extras editadas"
                        preco={`${moeda(precoFoto(selecao.fotosExtras, categoria))} / foto`}
                        descricao={`${moeda(categoria.foto.precoVolume)} cada a partir de ${categoria.foto.volumeMin}`}
                      >
                        <Contador rotulo="fotos extras" valor={selecao.fotosExtras} aoMudar={(n) => mudar("fotosExtras", n)} maximo={300} />
                      </Linha>
                    )}
                  </>
                )}
              </div>

              <h3 className="mt-8 mb-3 text-sm font-semibold text-suave">Prazo de entrega</h3>
              {!pacote || !prazo ? (
                <p className="text-sm text-suave">Escolha um pacote para ver o prazo.</p>
              ) : expressas.length === 0 ? (
                <p className="rounded-xl border border-borda bg-superficie px-4 py-3 text-sm">
                  <span className="font-semibold">{prazo.detalhe}</span>
                  <span className="text-suave"> · incluso{personalizado ? " (pela quantidade de fotos)" : ""}</span>
                </p>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Opcao compacta selecionada={selecao.entregaId === "padrao"} aoEscolher={() => mudar("entregaId", "padrao")}>
                      <span className="flex items-baseline justify-between gap-2">
                        <span>
                          <span className="block text-sm font-semibold">Prazo padrão</span>
                          <span className="block text-xs text-suave">{prazo.detalhe}</span>
                        </span>
                        <span className="tabular text-sm">incluso</span>
                      </span>
                    </Opcao>
                    {expressas.map((e) => (
                      <Opcao key={e.id} compacta selecionada={selecao.entregaId === e.id} aoEscolher={() => mudar("entregaId", e.id)}>
                        <span className="flex items-baseline justify-between gap-2">
                          <span>
                            <span className="block text-sm font-semibold">{e.nome}</span>
                            <span className="block text-xs text-suave">{e.detalhe}</span>
                          </span>
                          <span className="tabular shrink-0 text-sm">+ {moeda(e.preco)}</span>
                        </span>
                      </Opcao>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-fraco">A entrega expressa depende da agenda da semana; confirmo na conversa.</p>
                </>
              )}

              <h3 className="mt-8 mb-3 text-sm font-semibold text-suave">Local do ensaio ou evento</h3>
              <Deslocamentos cat={cat} escolhido={selecao.deslocamentoId} aoEscolher={(id) => mudar("deslocamentoId", id)} />
            </Passo>
          )}

          <Passo numero={passo++} titulo="Seus dados" subtitulo="Para eu te responder e reservar a data.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Seu nome" autoComplete="name" value={cliente.nome} onChange={(e) => mudarCliente("nome", e.target.value)} obrigatorio maxLength={80} />
              <Campo
                rotulo="Seu WhatsApp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(86) 9 0000-0000"
                value={cliente.telefone}
                onChange={(e) => mudarCliente("telefone", e.target.value)}
                obrigatorio
                maxLength={20}
              />
              <Campo
                rotulo="Data desejada"
                type="date"
                min={hojeIso()}
                value={cliente.data}
                onChange={(e) => mudarCliente("data", e.target.value)}
                dica="Se ainda não souber, deixe em branco."
              />
              <Campo rotulo="Horário" type="time" value={cliente.horario} onChange={(e) => mudarCliente("horario", e.target.value)} dica="Aproximado, se souber." />
              <div className="sm:col-span-2">
                <Campo
                  rotulo="Local"
                  placeholder="Ex.: Parque Potycabana, Teresina"
                  value={cliente.local}
                  onChange={(e) => mudarCliente("local", e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="sm:col-span-2">
                <CampoTexto
                  rotulo="Observações"
                  placeholder="Tema, quantidade de pessoas, ideias…"
                  value={cliente.observacoes}
                  onChange={(e) => mudarCliente("observacoes", e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
          </Passo>
        </div>

        <aside id="resumo" className="scroll-mt-6 lg:sticky lg:top-6 lg:self-start">
          <Resumo selecao={selecao} cliente={cliente} calculo={calculo} />
        </aside>
      </div>

      {/* Barra fixa no celular: o resumo fica lá embaixo, então o total precisa estar sempre à vista. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-borda bg-fundo/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs text-suave">{calculo.totalEhMinimo ? "Total a partir de" : "Total"}</p>
            <p className="tabular text-lg font-semibold">{moeda(calculo.total)}</p>
          </div>
          <a href="#resumo" className="inline-flex h-11 items-center rounded-lg bg-destaque px-5 text-sm font-semibold text-sobre-destaque">
            Ver resumo e enviar
          </a>
        </div>
      </div>
    </div>
  );
}

function Deslocamentos({ cat, escolhido, aoEscolher }: { cat: Catalogo; escolhido: string; aoEscolher: (id: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {cat.deslocamentos
        .filter((d) => !d.legado)
        .map((d) => (
          <Opcao key={d.id} compacta selecionada={escolhido === d.id} aoEscolher={() => aoEscolher(d.id)}>
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{d.nome}</span>
              <span className="text-sm text-suave">{d.aCombinar ? "a combinar" : d.preco ? `+ ${moeda(d.preco)}` : "sem custo"}</span>
            </span>
          </Opcao>
        ))}
    </div>
  );
}

function Passo({ numero, titulo, subtitulo, children }: { numero: number; titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`passo-${numero}`}>
      <div className="mb-5 flex items-baseline gap-3">
        <span className="font-titulo text-sm text-fraco tabular">{String(numero).padStart(2, "0")}</span>
        <div>
          <h2 id={`passo-${numero}`} className="font-titulo text-2xl font-semibold">
            {titulo}
          </h2>
          {subtitulo && <p className="mt-1 text-sm text-suave">{subtitulo}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Opcao({
  selecionada,
  aoEscolher,
  compacta,
  children,
}: {
  selecionada: boolean;
  aoEscolher: () => void;
  compacta?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selecionada}
      onClick={aoEscolher}
      className={cn(
        "relative w-full rounded-xl border text-left transition-colors",
        compacta ? "px-4 py-3" : "p-4",
        selecionada ? "border-destaque bg-superficie-2" : "border-borda bg-superficie hover:border-borda-forte",
      )}
    >
      {selecionada && (
        <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-destaque text-sobre-destaque">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}

function Linha({ titulo, descricao, preco, children }: { titulo: string; descricao?: string; preco: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="font-medium">{titulo}</p>
        <p className="text-sm text-suave">
          {preco}
          {descricao && <span className="text-fraco"> · {descricao}</span>}
        </p>
      </div>
      {children}
    </div>
  );
}

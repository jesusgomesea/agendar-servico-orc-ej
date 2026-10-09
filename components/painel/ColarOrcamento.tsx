// "Colar orçamento": transforma a mensagem que o cliente mandou no WhatsApp em agendamento.
//
// A leitura acontece enquanto você cola (lerTextoColado). Antes de criar, a tela
// mostra o que foi entendido e os avisos: total editado pelo cliente, tabela de
// preços antiga, código já importado (o cliente pode ter mandado duas vezes).
"use client";

import { AlertTriangle, ClipboardPaste } from "lucide-react";
import { useMemo, useState } from "react";
import { criarDeLeitura, type Agendamento } from "@/lib/agenda";
import { CATALOGO } from "@/lib/catalogo";
import { dataBR, moeda } from "@/lib/formato";
import { lerTextoColado, nomeServico } from "@/lib/orcamento";
import { Botao } from "@/components/ui/Botao";
import { classesEntrada } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  existentes: Agendamento[];
  aoCriar: (a: Agendamento) => Promise<boolean>;
}

export default function ColarOrcamento({ aberto, aoFechar, existentes, aoCriar }: Props) {
  const [texto, setTexto] = useState("");
  const [criando, setCriando] = useState(false);
  const resultado = useMemo(() => (texto.trim() ? lerTextoColado(texto, CATALOGO) : null), [texto]);

  const duplicado = resultado?.ok ? existentes.find((a) => a.codigo === resultado.leitura.referencia.codigo) : undefined;

  const fechar = () => {
    setTexto("");
    aoFechar();
  };

  const colarDaAreaDeTransferencia = async () => {
    try {
      setTexto(await navigator.clipboard.readText());
    } catch {
      // Navegador não deixou ler: a pessoa cola com Ctrl+V no campo.
    }
  };

  const criar = async () => {
    if (!resultado?.ok) return;
    setCriando(true);
    const ok = await aoCriar(criarDeLeitura(resultado.leitura, CATALOGO));
    setCriando(false);
    if (ok) fechar();
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={fechar}
      largura="g"
      titulo="Colar orçamento"
      descricao="Cole a mensagem inteira que o cliente enviou pelo WhatsApp."
      rodape={
        <>
          <Botao variante="fantasma" onClick={fechar}>
            Cancelar
          </Botao>
          <Botao variante="primario" onClick={criar} disabled={!resultado?.ok || criando}>
            {criando ? "Criando…" : duplicado ? "Criar mesmo assim" : "Criar agendamento"}
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="relative">
          <textarea
            aria-label="Mensagem do cliente"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="📸 Orçamento EJ-XXXXX — Eluan Jesus Fotografia…"
            className={`${classesEntrada} min-h-40 w-full py-3 font-mono text-xs`}
            autoFocus
          />
          {!texto && (
            <Botao variante="secundario" tamanho="p" className="absolute right-3 bottom-3" onClick={colarDaAreaDeTransferencia}>
              <ClipboardPaste className="size-4" /> Colar
            </Botao>
          )}
        </div>

        {resultado && !resultado.ok && (
          <p role="alert" className="rounded-lg border border-erro/40 bg-erro/5 px-3 py-2.5 text-sm text-erro">
            {resultado.erro}
          </p>
        )}

        {resultado?.ok && (
          <div className="rounded-xl border border-borda bg-superficie-2 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-titulo text-lg font-semibold">{resultado.leitura.cliente.nome || "Cliente sem nome"}</p>
              <p className="tabular text-sm text-suave">{resultado.leitura.referencia.codigo}</p>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Info rotulo="Serviço" valor={nomeServico(resultado.leitura.referencia.selecao, CATALOGO)} />
              <Info rotulo="WhatsApp" valor={resultado.leitura.cliente.telefone || "—"} />
              <Info
                rotulo="Data"
                valor={
                  resultado.leitura.cliente.data
                    ? `${dataBR(resultado.leitura.cliente.data)}${resultado.leitura.cliente.horario ? ` às ${resultado.leitura.cliente.horario}` : ""}`
                    : "a definir"
                }
              />
              <Info rotulo="Local" valor={resultado.leitura.cliente.local || "—"} />
            </dl>
            <ul className="mt-4 flex flex-col gap-1.5 border-t border-borda pt-3 text-sm">
              {resultado.leitura.calculo.linhas.map((l, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span className="text-suave">
                    {l.descricao}
                    {l.quantidade > 1 && ` × ${l.quantidade}`}
                  </span>
                  <span className="tabular">{l.tipo === "aCombinar" ? "a combinar" : moeda(l.valor)}</span>
                </li>
              ))}
              <li className="mt-1 flex justify-between border-t border-borda pt-2 font-semibold">
                <span>Total pela tabela</span>
                <span className="tabular">{moeda(resultado.leitura.calculo.total)}</span>
              </li>
            </ul>
          </div>
        )}

        {resultado?.ok && (duplicado || resultado.leitura.avisos.length > 0) && (
          <ul className="flex flex-col gap-2 text-sm text-aviso">
            {duplicado && (
              <Aviso>
                Já existe um agendamento com este código ({duplicado.clienteNome}, {duplicado.data ? dataBR(duplicado.data) : "sem data"}). Pode
                ser a mesma mensagem colada de novo.
              </Aviso>
            )}
            {resultado.leitura.avisos.map((a) => (
              <Aviso key={a}>{a}</Aviso>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-fraco">{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

// Resumo do orçamento ao lado do montador: itens, total, sinal e o botão de enviar.
//
// "Enviar pelo WhatsApp" gera um código novo a cada clique e abre o wa.me com a
// mensagem pronta (gerarMensagem). Há também "Copiar mensagem" porque, em alguns
// computadores, o link do WhatsApp abre o app errado ou nada — o cliente então
// cola o texto na conversa por conta própria.
"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { CATALOGO } from "@/lib/catalogo";
import { dataBR, diasEntre, hojeIso, linkWhatsApp, moeda, soDigitos } from "@/lib/formato";
import {
  gerarMensagem,
  nomeServico,
  novoCodigo,
  percentualSinal,
  valorSinal,
  type Calculo,
  type DadosCliente,
  type Selecao,
} from "@/lib/orcamento";
import { Botao } from "@/components/ui/Botao";
import { useAviso } from "@/components/ui/Avisos";

interface Props {
  selecao: Selecao;
  cliente: DadosCliente;
  calculo: Calculo;
}

export default function Resumo({ selecao, cliente, calculo }: Props) {
  const cat = CATALOGO;
  const avisar = useAviso();
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const hoje = hojeIso();

  const faltando = [...calculo.pendencias];
  if (!cliente.nome.trim()) faltando.push("Informe seu nome.");
  if (soDigitos(cliente.telefone).length < 10) faltando.push("Informe seu WhatsApp com DDD.");
  if (cliente.data && cliente.data < hoje) faltando.push("A data desejada já passou.");

  const temCombinar = calculo.linhas.some((l) => l.tipo === "aCombinar");
  const aPartirDe = calculo.linhas.some((l) => l.tipo === "aPartirDe");
  const pct = cliente.data ? percentualSinal(hoje, cliente.data, cat) : null;

  const montarTexto = () => gerarMensagem({ codigo: novoCodigo(), emitidoEm: hoje, selecao, cliente }, cat);

  const enviar = () => {
    setTentouEnviar(true);
    if (faltando.length) return;
    const link = linkWhatsApp(cat.contato.whatsapp, montarTexto());
    if (link) window.open(link, "_blank", "noopener");
  };

  const copiar = async () => {
    setTentouEnviar(true);
    if (faltando.length) return;
    try {
      await navigator.clipboard.writeText(montarTexto());
      avisar("Mensagem copiada. Cole na conversa do WhatsApp.");
    } catch {
      avisar("Não consegui copiar automaticamente. Use o botão do WhatsApp.", "erro");
    }
  };

  return (
    <div className="rounded-2xl border border-borda bg-superficie">
      <div className="border-b border-borda px-5 py-4">
        <p className="text-xs tracking-widest text-fraco uppercase">Seu orçamento</p>
        <p className="mt-1 font-titulo text-xl font-semibold">{nomeServico(selecao, cat)}</p>
      </div>

      <div className="px-5 py-4">
        {calculo.linhas.length === 0 ? (
          <p className="text-sm text-suave">Escolha as opções ao lado para ver o valor.</p>
        ) : (
          <ul className="flex flex-col gap-2.5 text-sm">
            {calculo.linhas.map((l, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="text-suave">
                  {l.descricao}
                  {l.quantidade > 1 && <span className="text-fraco"> × {l.quantidade}</span>}
                </span>
                <span className="tabular shrink-0 text-right">
                  {l.tipo === "aCombinar" ? <span className="text-suave">a combinar</span> : moeda(l.valor)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-baseline justify-between border-t border-borda pt-4">
          <span className="text-sm text-suave">{aPartirDe ? "Total a partir de" : "Total"}</span>
          <span className="tabular font-titulo text-3xl font-semibold">{moeda(calculo.total)}</span>
        </div>
        {temCombinar && <p className="mt-1 text-right text-xs text-fraco">+ deslocamento a combinar</p>}

        <div className="mt-4 rounded-lg bg-superficie-2 px-3 py-2.5 text-sm">
          {pct !== null && cliente.data >= hoje ? (
            <p>
              <span className="font-semibold">Sinal de {pct}%: {moeda(valorSinal(calculo.total, pct))}</span>
              <span className="text-suave">
                {" "}
                para reservar {dataBR(cliente.data)} (faltam {diasEntre(hoje, cliente.data)} dias).
              </span>
            </p>
          ) : (
            <p className="text-suave">
              O sinal reserva a data e depende da antecedência:{" "}
              {cat.sinal.map((f, i) => (
                <span key={f.diasMin}>
                  {i > 0 && " · "}
                  <span className="text-texto">{f.percentual}%</span> {f.diasMin > 0 ? `com ${f.diasMin}+ dias` : "em cima da hora"}
                </span>
              ))}
              .
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-borda px-5 py-4">
        {tentouEnviar && faltando.length > 0 && (
          <ul role="alert" className="mb-1 flex flex-col gap-1 text-sm text-aviso">
            {faltando.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        )}
        <Botao variante="whats" tamanho="g" onClick={enviar}>
          <MessageCircle className="size-5" />
          Enviar pelo WhatsApp
        </Botao>
        <Botao variante="fantasma" tamanho="m" onClick={copiar}>
          <Copy className="size-4" />
          Copiar mensagem
        </Botao>
        <p className="text-center text-xs text-fraco">
          Orçamento válido por {cat.validadeDias} dias. A data só é garantida após a confirmação e o sinal.
        </p>
      </div>
    </div>
  );
}

// Seletor de quantidade "− 3 +", usado para horas extras, fotos extras etc.
//
// `minimoQuandoAtivo` cobre itens com quantidade mínima (fotos brutas: 0 ou 20+):
// do 0 o "+" pula direto para o mínimo, e do mínimo o "−" volta para 0, para o
// cliente nunca parar num valor que o orçamento recusaria.
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  rotulo: string;
  valor: number;
  aoMudar: (n: number) => void;
  minimo?: number;
  maximo?: number;
  passo?: number;
  minimoQuandoAtivo?: number;
  unidade?: string;
}

export function Contador({ rotulo, valor, aoMudar, minimo = 0, maximo = 999, passo = 1, minimoQuandoAtivo, unidade }: Props) {
  const menos = () => {
    if (minimoQuandoAtivo && valor <= minimoQuandoAtivo) return aoMudar(minimo);
    aoMudar(Math.max(minimo, valor - passo));
  };
  const mais = () => {
    if (minimoQuandoAtivo && valor < minimoQuandoAtivo) return aoMudar(minimoQuandoAtivo);
    aoMudar(Math.min(maximo, valor + passo));
  };
  const botao = "grid size-9 place-items-center rounded-md text-suave hover:bg-superficie-3 hover:text-texto disabled:opacity-30";

  return (
    <div className="inline-flex items-center rounded-lg border border-borda bg-superficie-2" role="group" aria-label={rotulo}>
      <button type="button" className={botao} onClick={menos} disabled={valor <= minimo} aria-label={`Diminuir ${rotulo}`}>
        <Minus className="size-4" />
      </button>
      <output className={cn("tabular min-w-12 text-center text-sm font-semibold", valor === 0 && "text-fraco")} aria-live="polite">
        {valor}
        {unidade && valor > 0 ? <span className="ml-0.5 font-normal text-suave">{unidade}</span> : null}
      </output>
      <button type="button" className={botao} onClick={mais} disabled={valor >= maximo} aria-label={`Aumentar ${rotulo}`}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}

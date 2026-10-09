// Janela modal sobre o <dialog> nativo do navegador.
//
// Por que nativo e não Radix: o <dialog> já prende o foco, fecha com Esc e põe o
// fundo escuro (::backdrop), sem dependência. No orcaaqui, a animação de fechar
// do Radix deixava o overlay preso com diálogos aninhados; aqui não há animação.
"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: "m" | "g";
}

export function Modal({ aberto, aoFechar, titulo, descricao, children, rodape, largura = "m" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      // Clique no fundo escuro (fora da caixa) fecha a janela.
      onClick={(e) => e.target === ref.current && aoFechar()}
      className={cn(
        "m-auto max-h-[92dvh] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-borda bg-superficie p-0 text-texto",
        largura === "g" ? "max-w-3xl" : "max-w-lg",
      )}
    >
      {aberto && (
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-borda px-5 py-4">
            <div>
              <h2 className="font-titulo text-xl font-semibold">{titulo}</h2>
              {descricao && <p className="mt-0.5 text-sm text-suave">{descricao}</p>}
            </div>
            <button
              type="button"
              onClick={aoFechar}
              className="grid size-8 shrink-0 place-items-center rounded-md text-suave hover:bg-superficie-3 hover:text-texto"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {rodape && <footer className="flex flex-wrap justify-end gap-2 border-t border-borda px-5 py-3">{rodape}</footer>}
        </div>
      )}
    </dialog>
  );
}

// Botão padrão do site. Variantes:
//  primario   – ação principal da tela (fundo claro, texto preto);
//  secundario – ação comum (contorno);
//  fantasma   – ação discreta (só texto);
//  whats      – exclusivo do "Enviar pelo WhatsApp" (o único verde do site);
//  perigo     – excluir/cancelar.
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variante = "primario" | "secundario" | "fantasma" | "whats" | "perigo";
type Tamanho = "p" | "m" | "g";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-destaque text-sobre-destaque hover:bg-white",
  secundario: "border border-borda-forte text-texto hover:bg-superficie-3",
  fantasma: "text-suave hover:text-texto hover:bg-superficie-2",
  whats: "bg-whats text-sobre-whats hover:bg-whats-forte font-semibold",
  perigo: "border border-erro/40 text-erro hover:bg-erro/10",
};

const TAMANHOS: Record<Tamanho, string> = {
  p: "h-8 px-3 text-sm gap-1.5",
  m: "h-10 px-4 text-sm gap-2",
  g: "h-12 px-5 text-base gap-2",
};

export function classesBotao(variante: Variante = "secundario", tamanho: Tamanho = "m", extra?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
    "disabled:opacity-40 disabled:pointer-events-none select-none",
    VARIANTES[variante],
    TAMANHOS[tamanho],
    extra,
  );
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
}

export const Botao = forwardRef<HTMLButtonElement, Props>(function Botao(
  { variante, tamanho, className, type = "button", ...resto },
  ref,
) {
  return <button ref={ref} type={type} className={classesBotao(variante, tamanho, className)} {...resto} />;
});

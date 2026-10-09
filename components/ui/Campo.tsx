// Campos de formulário com rótulo, dica e erro já ligados por id (acessível a leitor de tela).
import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Sem largura de propósito: quem usa define (w-full, w-28…). Com "w-full" aqui,
// uma largura fixa passada junto perdia ou ganhava conforme a ordem do CSS gerado.
export const classesEntrada = cn(
  "rounded-lg border border-borda bg-superficie-2 px-3 text-texto placeholder:text-fraco",
  "hover:border-borda-forte focus:border-destaque focus:outline-none transition-colors",
);

interface Base {
  rotulo: string;
  dica?: ReactNode;
  erro?: string;
  obrigatorio?: boolean;
}

function Moldura({ id, rotulo, dica, erro, obrigatorio, children }: Base & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-suave">
        {rotulo}
        {obrigatorio && <span className="text-fraco"> *</span>}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="text-xs text-erro">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="text-xs text-fraco">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

export function Campo({ rotulo, dica, erro, obrigatorio, className, ...resto }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} dica={dica} erro={erro} obrigatorio={obrigatorio}>
      <input
        id={id}
        aria-invalid={!!erro}
        aria-describedby={erro ? `${id}-erro` : dica ? `${id}-dica` : undefined}
        required={obrigatorio}
        className={cn(classesEntrada, "h-11 w-full", className)}
        {...resto}
      />
    </Moldura>
  );
}

export function CampoTexto({
  rotulo,
  dica,
  erro,
  obrigatorio,
  className,
  ...resto
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} dica={dica} erro={erro} obrigatorio={obrigatorio}>
      <textarea
        id={id}
        aria-invalid={!!erro}
        aria-describedby={erro ? `${id}-erro` : dica ? `${id}-dica` : undefined}
        required={obrigatorio}
        className={cn(classesEntrada, "py-2.5 min-h-24 w-full", className)}
        {...resto}
      />
    </Moldura>
  );
}

// Moldura comum das telas de entrar / recuperar senha / nova senha / aceitar convite.
import type { ReactNode } from "react";

export default function MolduraAuth({ titulo, descricao, children }: { titulo: string; descricao: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <a href="/" className="mx-auto mb-8 block w-fit" aria-label="Voltar ao site">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo estática pequena, sem ganho com next/image */}
          <img src="/logo.png" alt="Eluan Jesus Fotografia" width={72} height={62} />
        </a>
        <div className="rounded-2xl border border-borda bg-superficie p-6">
          <h1 className="font-titulo text-2xl font-semibold">{titulo}</h1>
          <p className="mt-1 mb-6 text-sm text-suave">{descricao}</p>
          {children}
        </div>
      </div>
    </main>
  );
}

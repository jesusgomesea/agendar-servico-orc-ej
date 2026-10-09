// Portão das telas do painel: sem sessão, manda para /entrar.
// É só conforto de navegação — quem protege os dados é /api/agenda no servidor.
"use client";

import { useEffect, type ReactNode } from "react";
import { useSessao } from "./ProvedorSessao";

export default function Protegido({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useSessao();

  useEffect(() => {
    if (!carregando && !usuario) window.location.replace("/entrar");
  }, [carregando, usuario]);

  if (carregando || !usuario) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-suave">Carregando…</p>
      </div>
    );
  }
  return <>{children}</>;
}

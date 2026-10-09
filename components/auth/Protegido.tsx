// Portão das telas do painel: sem sessão, manda para /entrar.
// É só conforto de navegação — quem protege os dados é /api/agenda no servidor.
"use client";

import { useEffect, type ReactNode } from "react";
import { MODO_LOCAL } from "@/lib/modoLocal";
import { useSessao } from "./ProvedorSessao";

export default function Protegido({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useSessao();

  useEffect(() => {
    if (MODO_LOCAL) return;
    if (!carregando && !usuario) window.location.replace("/entrar");
  }, [carregando, usuario]);

  // Modo local (só `next dev`, ver lib/modoLocal.ts): sem Identity, sem portão.
  if (MODO_LOCAL) return <>{children}</>;

  if (carregando || !usuario) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-suave">Carregando…</p>
      </div>
    );
  }
  return <>{children}</>;
}

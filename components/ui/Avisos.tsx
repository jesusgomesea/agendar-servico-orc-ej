// Avisos rápidos no canto da tela ("Agendamento criado", "Erro ao salvar"…).
// Implementação mínima própria: uma lista em contexto que some sozinha em 4s.
"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tipo = "ok" | "erro" | "info";
interface Aviso {
  id: number;
  texto: string;
  tipo: Tipo;
}

const Contexto = createContext<(texto: string, tipo?: Tipo) => void>(() => {});

export function useAviso() {
  return useContext(Contexto);
}

let proximoId = 1;

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const avisar = useCallback((texto: string, tipo: Tipo = "ok") => {
    const id = proximoId++;
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === "erro" ? 7000 : 4000);
  }, []);

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {avisos.map((a) => (
          <div
            key={a.id}
            role={a.tipo === "erro" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto max-w-md rounded-lg border bg-superficie-2 px-4 py-2.5 text-sm shadow-lg shadow-black/50",
              a.tipo === "erro" ? "border-erro/50 text-erro" : a.tipo === "info" ? "border-borda-forte" : "border-ok/40 text-ok",
            )}
          >
            {a.texto}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

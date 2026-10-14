// Estado da agenda no painel: carrega de /api/agenda e grava a lista inteira a cada alteração.
//
// Cada ação (criar, salvar, excluir) espera a resposta do servidor antes de mudar
// a tela: são ações pontuais, e assim o que aparece é sempre o que está gravado.
// Em conflito (409 — outro aparelho gravou antes), recarrega e avisa.
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Agendamento, EstadoAgenda } from "@/lib/agenda";
import { useAviso } from "@/components/ui/Avisos";

interface Carga {
  estado: EstadoAgenda | null;
  carregando: boolean;
  erro: string | null;
}

export function useAgenda() {
  const avisar = useAviso();
  const [carga, setCarga] = useState<Carga>({ estado: null, carregando: true, erro: null });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarga((c) => ({ ...c, carregando: true }));
    try {
      // Limite de tempo: sem ele, um servidor que não responde deixava o painel
      // "carregando" para sempre, com "Colar orçamento" desabilitado e sem erro.
      const r = await fetch("/api/agenda", { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) {
        setCarga({ estado: null, carregando: false, erro: corpo.erro ?? `Erro ${r.status} ao carregar a agenda.` });
        return;
      }
      setCarga({ estado: corpo as EstadoAgenda, carregando: false, erro: null });
    } catch (e) {
      const tempoEsgotado = e instanceof DOMException && e.name === "TimeoutError";
      setCarga({
        estado: null,
        carregando: false,
        erro: tempoEsgotado ? "O servidor demorou demais para responder. Tente de novo." : "Sem conexão com o servidor.",
      });
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const gravar = useCallback(
    async (agendamentos: Agendamento[]): Promise<boolean> => {
      if (!carga.estado) return false;
      setSalvando(true);
      try {
        const r = await fetch("/api/agenda", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versaoBase: carga.estado.versao, agendamentos }),
        });
        const corpo = await r.json().catch(() => ({}));
        if (r.status === 409) {
          avisar(corpo.erro ?? "A agenda mudou em outro aparelho.", "erro");
          await carregar();
          return false;
        }
        if (!r.ok) {
          avisar(corpo.erro ?? `Erro ${r.status} ao salvar.`, "erro");
          return false;
        }
        setCarga({ estado: corpo as EstadoAgenda, carregando: false, erro: null });
        return true;
      } catch {
        avisar("Sem conexão: a alteração não foi salva.", "erro");
        return false;
      } finally {
        setSalvando(false);
      }
    },
    [carga.estado, avisar, carregar],
  );

  const lista = carga.estado?.agendamentos ?? [];

  return {
    ...carga,
    lista,
    salvando,
    recarregar: carregar,
    adicionar: (a: Agendamento) => gravar([...lista, a]),
    atualizar: (a: Agendamento) => gravar(lista.map((x) => (x.id === a.id ? a : x))),
    remover: (id: string) => gravar(lista.filter((x) => x.id !== id)),
  };
}

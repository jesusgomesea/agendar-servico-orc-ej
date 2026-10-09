// Sessão do Netlify Identity disponível para o React (useSessao) + tratamento dos links de e-mail.
//
// Os links de convite, recuperação de senha e troca de e-mail voltam com o token
// no hash da URL (#invite_token=…) e podem cair em QUALQUER página — por isso o
// tratamento mora aqui, montado no layout raiz, e não numa rota /callback.
//
// A sessão é resolvida no navegador para as páginas continuarem estáticas; quem
// garante o acesso de verdade é /api/agenda (ver lib/server/acesso.ts).
"use client";

import { getUser, handleAuthCallback, onAuthChange, type User } from "@netlify/identity";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface Sessao {
  usuario: User | null;
  carregando: boolean;
}

const ContextoSessao = createContext<Sessao>({ usuario: null, carregando: true });

export function useSessao() {
  return useContext(ContextoSessao);
}

/** Chave do sessionStorage onde o token de convite espera a pessoa escolher a senha. */
export const CHAVE_CONVITE = "ej-convite";

const HASH_DE_AUTENTICACAO = /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/;

function temTokenNoHash() {
  return typeof window !== "undefined" && HASH_DE_AUTENTICACAO.test(window.location.hash);
}

export default function ProvedorSessao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);
  // Já no primeiro render, senão a página pisca por baixo do token antes do redirecionamento.
  const [processandoLink, setProcessandoLink] = useState(temTokenNoHash);
  const [erroDoLink, setErroDoLink] = useState("");

  useEffect(() => {
    let vivo = true;
    getUser().then((u) => {
      if (!vivo) return;
      setUsuario(u);
      setCarregando(false);
    });
    const cancelar = onAuthChange((_evento, u) => setUsuario(u));
    return () => {
      vivo = false;
      cancelar();
    };
  }, []);

  useEffect(() => {
    if (!temTokenNoHash()) return;
    handleAuthCallback()
      .then((resultado) => {
        if (!resultado) return setProcessandoLink(false);
        // Convite: a conta ainda não tem senha, então não há sessão. O token vai
        // para o sessionStorage (e não para a URL, onde ficaria no histórico) e a
        // pessoa escolhe a senha em /aceitar-convite.
        if (resultado.type === "invite" && resultado.token) {
          sessionStorage.setItem(CHAVE_CONVITE, resultado.token);
          window.location.href = "/aceitar-convite";
          return;
        }
        // Recuperação: a pessoa JÁ está logada, mas ainda sem senha nova.
        // Navegação completa (e não router.push) para o cookie novo chegar ao servidor.
        window.location.href = resultado.type === "recovery" ? "/nova-senha" : "/painel";
      })
      .catch((erro: unknown) => {
        setErroDoLink(erro instanceof Error ? erro.message : "Não foi possível validar o link.");
        setProcessandoLink(false);
      });
  }, []);

  if (processandoLink || erroDoLink) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center">
        {erroDoLink ? (
          <div>
            <p className="mb-2 font-semibold text-erro">Link inválido ou expirado</p>
            <p className="mb-4 text-sm text-suave">{erroDoLink}</p>
            <a href="/entrar" className="text-sm font-semibold underline-offset-4 hover:underline">
              Ir para a tela de entrada
            </a>
          </div>
        ) : (
          <p className="text-sm text-suave">Validando o link…</p>
        )}
      </div>
    );
  }

  return <ContextoSessao.Provider value={{ usuario, carregando }}>{children}</ContextoSessao.Provider>;
}

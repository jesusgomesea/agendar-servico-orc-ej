// Tela de login do painel. Não há "criar conta": o acesso é só por convite
// (Netlify Identity em "Invite only") e pela lista EMAILS_PAINEL no servidor.
"use client";

import { login } from "@netlify/identity";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import MolduraAuth from "@/components/auth/MolduraAuth";
import { useSessao } from "@/components/auth/ProvedorSessao";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";

export default function EntrarPage() {
  const { usuario, carregando } = useSessao();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!carregando && usuario) window.location.href = "/painel";
  }, [carregando, usuario]);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await login(email, senha);
      // Navegação completa obrigatória: router.push() faz navegação suave e o
      // cookie de sessão recém-escrito não chegaria ao servidor.
      window.location.href = "/painel";
    } catch {
      setErro("E-mail ou senha incorretos.");
      setEnviando(false);
    }
  };

  return (
    <MolduraAuth titulo="Área do fotógrafo" descricao="Entre para ver sua agenda e os orçamentos recebidos.">
      <form onSubmit={entrar} className="flex flex-col gap-4">
        <Campo rotulo="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} obrigatorio autoFocus />
        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          obrigatorio
        />
        {erro && (
          <p role="alert" className="text-sm text-erro">
            {erro}
          </p>
        )}
        <Botao type="submit" variante="primario" tamanho="g" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Botao>
      </form>
      <Link href="/recuperar-senha" className="mt-4 block text-center text-sm text-suave hover:text-texto">
        Esqueci minha senha
      </Link>
    </MolduraAuth>
  );
}

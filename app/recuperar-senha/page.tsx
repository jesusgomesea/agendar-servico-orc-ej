// Pedido de recuperação de senha: o Netlify Identity manda o link por e-mail.
// A resposta é igual para e-mail cadastrado e não cadastrado — senão o formulário
// viraria um jeito de descobrir quem tem conta.
"use client";

import { requestPasswordRecovery } from "@netlify/identity";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import MolduraAuth from "@/components/auth/MolduraAuth";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await requestPasswordRecovery(email);
    } catch {
      // Ignorado de propósito (ver comentário do topo).
    } finally {
      setEnviado(true);
      setEnviando(false);
    }
  };

  return (
    <MolduraAuth titulo="Recuperar senha" descricao="Enviaremos um link para você criar uma senha nova.">
      {enviado ? (
        <p className="text-sm text-suave">
          Se <strong className="text-texto">{email}</strong> tiver acesso ao painel, o link chega em alguns minutos. Confira também a caixa de
          spam.
        </p>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <Campo rotulo="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} obrigatorio autoFocus />
          <Botao type="submit" variante="primario" tamanho="g" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar link"}
          </Botao>
        </form>
      )}
      <Link href="/entrar" className="mt-4 block text-center text-sm text-suave hover:text-texto">
        Voltar para entrar
      </Link>
    </MolduraAuth>
  );
}

// Formulário "nova senha + confirmar", usado na recuperação e no aceite de convite.
"use client";

import { useState, type FormEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";

const MINIMO = 8;

export default function FormSenha({ textoBotao, aoEnviar }: { textoBotao: string; aoEnviar: (senha: string) => Promise<void> }) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    if (senha.length < MINIMO) return setErro(`A senha precisa ter ao menos ${MINIMO} caracteres.`);
    if (senha !== confirmacao) return setErro("As duas senhas não são iguais.");
    setEnviando(true);
    try {
      await aoEnviar(senha);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar a senha.");
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <Campo rotulo="Senha nova" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} obrigatorio autoFocus />
      <Campo
        rotulo="Repita a senha"
        type="password"
        autoComplete="new-password"
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        obrigatorio
      />
      {erro && (
        <p role="alert" className="text-sm text-erro">
          {erro}
        </p>
      )}
      <Botao type="submit" variante="primario" tamanho="g" disabled={enviando}>
        {enviando ? "Salvando…" : textoBotao}
      </Botao>
    </form>
  );
}

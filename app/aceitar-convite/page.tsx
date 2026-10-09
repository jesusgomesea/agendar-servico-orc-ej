// Primeiro acesso: quem recebeu o convite do Netlify Identity escolhe a senha.
// O token chega pelo sessionStorage (gravado pelo ProvedorSessao ao abrir o link).
"use client";

import { acceptInvite } from "@netlify/identity";
import { useEffect, useState } from "react";
import FormSenha from "@/components/auth/FormSenha";
import MolduraAuth from "@/components/auth/MolduraAuth";
import { CHAVE_CONVITE } from "@/components/auth/ProvedorSessao";

export default function AceitarConvitePage() {
  // undefined = ainda lendo o sessionStorage; null = não há convite pendente.
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setToken(sessionStorage.getItem(CHAVE_CONVITE));
  }, []);

  return (
    <MolduraAuth titulo="Boas-vindas" descricao="Crie a senha do seu acesso ao painel.">
      {token === undefined ? null : token ? (
        <FormSenha
          textoBotao="Criar senha e entrar"
          aoEnviar={async (senha) => {
            await acceptInvite(token, senha);
            sessionStorage.removeItem(CHAVE_CONVITE);
            window.location.href = "/painel";
          }}
        />
      ) : (
        <p className="text-sm text-suave">
          Não encontrei um convite aberto. Abra de novo o link do e-mail de convite, ou{" "}
          <a href="/entrar" className="text-texto underline underline-offset-4">
            entre com sua senha
          </a>
          .
        </p>
      )}
    </MolduraAuth>
  );
}

// Última etapa da recuperação: o link do e-mail já abriu a sessão
// (ProvedorSessao); aqui só se grava a senha nova.
"use client";

import { updateUser } from "@netlify/identity";
import FormSenha from "@/components/auth/FormSenha";
import MolduraAuth from "@/components/auth/MolduraAuth";

export default function NovaSenhaPage() {
  return (
    <MolduraAuth titulo="Senha nova" descricao="Escolha a senha que vai usar para entrar no painel.">
      <FormSenha
        textoBotao="Salvar e entrar"
        aoEnviar={async (senha) => {
          await updateUser({ password: senha });
          window.location.href = "/painel";
        }}
      />
    </MolduraAuth>
  );
}

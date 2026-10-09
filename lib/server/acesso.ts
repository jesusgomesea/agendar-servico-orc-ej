// Quem pode usar o painel: usuário logado no Netlify Identity E com e-mail na lista.
//
// Por que a lista, se o Identity já fica "Invite only"? Porque essa opção vive no
// painel do Netlify e basta alguém mudá-la para "Open" (ou esquecer de mudar no
// primeiro deploy) para qualquer pessoa criar conta e ver a agenda com nomes e
// telefones de clientes. A lista fecha a porta no código.
//
// Variável de ambiente EMAILS_PAINEL (no painel do Netlify, não em arquivo):
// e-mails separados por vírgula. Sem ela, NINGUÉM entra — falha fechada.
import "server-only";

import { getUser } from "@netlify/identity";
import { MODO_LOCAL } from "@/lib/modoLocal";

export type Acesso =
  | { ok: true; email: string }
  | { ok: false; status: 401 | 403; erro: string };

function emailsPermitidos(): string[] {
  return (process.env.EMAILS_PAINEL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function verificarAcesso(): Promise<Acesso> {
  // Só no `next dev` com a variável ligada (ver lib/modoLocal.ts).
  if (MODO_LOCAL) return { ok: true, email: "modo-local" };

  const usuario = await getUser();
  if (!usuario) return { ok: false, status: 401, erro: "Faça login para continuar." };

  const permitidos = emailsPermitidos();
  if (permitidos.length === 0) {
    return {
      ok: false,
      status: 403,
      erro: "Painel sem dono configurado: defina a variável EMAILS_PAINEL no Netlify.",
    };
  }
  if (!usuario.email || !permitidos.includes(usuario.email.toLowerCase())) {
    return { ok: false, status: 403, erro: "Esta conta não tem acesso ao painel." };
  }
  return { ok: true, email: usuario.email };
}

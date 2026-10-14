// API da agenda do painel: GET carrega, PUT grava. Única rota de servidor do site.
//
// Tudo passa por `verificarAcesso()` (login + lista EMAILS_PAINEL). O portão na
// tela do painel é só conforto; a garantia está aqui.
//
// Controle de versão: o PUT manda a `versaoBase` que o navegador carregou. Se a
// agenda no servidor já estiver em outra versão (você editou no celular e no
// computador ao mesmo tempo), a gravação é recusada com 409 e o painel recarrega
// — em vez de uma aba apagar silenciosamente o que a outra salvou.
import { estadoValido } from "@/lib/agenda";
import { verificarAcesso } from "@/lib/server/acesso";
import { gravarAgendaSeIgual, lerAgenda } from "@/lib/server/agenda";

export const dynamic = "force-dynamic";

/**
 * Falha de armazenamento (Blobs fora do ar, ambiente sem Blobs…) vira um 500 com
 * a causa na mensagem, em vez de derrubar a função (o Netlify devolvia 502 sem
 * explicação). O detalhe completo fica nos logs da função.
 */
function falhaDeArmazenamento(e: unknown) {
  console.error("[agenda] falha no armazenamento:", e);
  const causa = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return Response.json({ erro: `Não foi possível acessar a agenda no servidor (${causa}).` }, { status: 500 });
}

const LIMITE_BYTES = 4 * 1024 * 1024;

export async function GET() {
  const acesso = await verificarAcesso();
  if (!acesso.ok) return Response.json({ erro: acesso.erro }, { status: acesso.status });
  try {
    const { estado } = await lerAgenda();
    return Response.json(estado, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return falhaDeArmazenamento(e);
  }
}

export async function PUT(req: Request) {
  const acesso = await verificarAcesso();
  if (!acesso.ok) return Response.json({ erro: acesso.erro }, { status: acesso.status });

  const texto = await req.text();
  if (texto.length > LIMITE_BYTES) {
    return Response.json({ erro: "Agenda grande demais para gravar de uma vez." }, { status: 413 });
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    return Response.json({ erro: "Corpo inválido." }, { status: 400 });
  }
  if (!estadoValido(corpo)) return Response.json({ erro: "Formato de agenda inválido." }, { status: 400 });

  try {
    const { estado: atual, etag } = await lerAgenda();
    const conflito = () =>
      Response.json(
        { erro: "A agenda foi alterada em outro aparelho. Recarregue para ver a versão mais nova." },
        { status: 409 },
      );
    if (corpo.versaoBase !== atual.versao) return conflito();

    const novo = { versao: atual.versao + 1, agendamentos: corpo.agendamentos };
    if (!(await gravarAgendaSeIgual(novo, etag))) return conflito();
    return Response.json(novo);
  } catch (e) {
    return falhaDeArmazenamento(e);
  }
}

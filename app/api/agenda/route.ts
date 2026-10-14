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
 * Cada chamada de rede (login no Identity, leitura/gravação no Blobs) tem um
 * limite. Sem isso, uma chamada travada segurava a função até o Netlify cortar
 * (~10 s, 502 sem explicação) e o painel ficava "carregando". Os limites somados
 * ficam abaixo do corte do Netlify, para a resposta dizer QUAL etapa travou.
 */
const LIMITE_ETAPA_MS = 3_000;

class EtapaTravada extends Error {
  constructor(etapa: string) {
    super(`${etapa} não respondeu em ${LIMITE_ETAPA_MS / 1000} s`);
    this.name = "EtapaTravada";
  }
}

async function comLimite<T>(etapa: string, tarefa: Promise<T>): Promise<T> {
  let relogio: ReturnType<typeof setTimeout> | undefined;
  const inicio = Date.now();
  try {
    return await Promise.race([
      tarefa,
      new Promise<never>((_, rejeitar) => {
        relogio = setTimeout(() => rejeitar(new EtapaTravada(etapa)), LIMITE_ETAPA_MS);
      }),
    ]);
  } finally {
    clearTimeout(relogio);
    console.info(`[agenda] ${etapa}: ${Date.now() - inicio} ms`);
  }
}

/**
 * Falha no servidor vira um 500 com a causa na mensagem (aparece no painel), em
 * vez de derrubar a função. O detalhe completo fica nos logs da função.
 */
function falhaNoServidor(e: unknown) {
  console.error("[agenda] falha:", e);
  const causa = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  // Só diz SE a configuração do Blobs chegou à função (nunca o conteúdo, que tem token).
  const blobs = (globalThis as { netlifyBlobsContext?: unknown }).netlifyBlobsContext || process.env.NETLIFY_BLOBS_CONTEXT;
  return Response.json(
    { erro: `Não foi possível acessar a agenda no servidor (${causa}; config. do Blobs ${blobs ? "presente" : "ausente"}).` },
    { status: 500 },
  );
}

const LIMITE_BYTES = 4 * 1024 * 1024;

export async function GET() {
  try {
    const acesso = await comLimite("Login (Netlify Identity)", verificarAcesso());
    if (!acesso.ok) return Response.json({ erro: acesso.erro }, { status: acesso.status });
    const { estado } = await comLimite("Leitura da agenda (Netlify Blobs)", lerAgenda());
    return Response.json(estado, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return falhaNoServidor(e);
  }
}

export async function PUT(req: Request) {
  let acesso;
  try {
    acesso = await comLimite("Login (Netlify Identity)", verificarAcesso());
  } catch (e) {
    return falhaNoServidor(e);
  }
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
    const { estado: atual, etag } = await comLimite("Leitura da agenda (Netlify Blobs)", lerAgenda());
    const conflito = () =>
      Response.json(
        { erro: "A agenda foi alterada em outro aparelho. Recarregue para ver a versão mais nova." },
        { status: 409 },
      );
    if (corpo.versaoBase !== atual.versao) return conflito();

    const novo = { versao: atual.versao + 1, agendamentos: corpo.agendamentos };
    if (!(await comLimite("Gravação da agenda (Netlify Blobs)", gravarAgendaSeIgual(novo, etag)))) return conflito();
    return Response.json(novo);
  } catch (e) {
    return falhaNoServidor(e);
  }
}

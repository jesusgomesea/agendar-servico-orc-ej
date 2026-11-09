// GET /api/recalcular?ref=[ref EJ-… …] — recalcula um orçamento pela tabela atual.
//
// Pública e sem estado: recebe só a linha [ref] (sem nome, telefone nem local)
// e devolve itens, total, sinal, restante e prazo. É o que o Orça Aqui chama ao
// colar uma mensagem deste site. Regras e formato em lib/recalculo.ts.
import { CATALOGO } from "@/lib/catalogo";
import { recalcularReferencia } from "@/lib/recalculo";

export const dynamic = "force-dynamic";

// Sem dado pessoal na resposta: qualquer origem pode chamar (inclusive a tela do Orça Aqui no navegador).
const CABECALHOS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref") ?? "";
  if (ref.length > 2000) return Response.json({ ok: false, erro: "Parâmetro ref grande demais." }, { status: 400, headers: CABECALHOS });
  const r = recalcularReferencia(ref, CATALOGO);
  return Response.json(r, { status: r.ok ? 200 : 400, headers: CABECALHOS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...CABECALHOS, "Access-Control-Allow-Methods": "GET, OPTIONS" } });
}

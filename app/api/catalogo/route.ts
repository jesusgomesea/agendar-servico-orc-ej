// GET /api/catalogo — a tabela de preços atual em JSON (pacotes, prazos, extras, sinal…).
//
// Pública: é o mesmo conteúdo que o montador mostra. Serve para o Orça Aqui
// montar orçamentos do EJ com a tabela daqui. Gerada no build (estática); muda
// a cada deploy, junto com `versao`.
import { CATALOGO } from "@/lib/catalogo";
import { catalogoPublico } from "@/lib/recalculo";

export const dynamic = "force-static";

export function GET() {
  return Response.json(catalogoPublico(CATALOGO), { headers: { "Access-Control-Allow-Origin": "*" } });
}

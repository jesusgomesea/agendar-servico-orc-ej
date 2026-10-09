// Tabela de preços da Eluan Jesus Fotografia — fonte única de valores do site.
//
// Tudo que o cliente vê no montador e tudo que o painel recalcula sai daqui.
// Mudou preço? Edite este arquivo E aumente `versao`: o código que vai no texto
// do WhatsApp carrega a versão, e o painel avisa quando um orçamento foi gerado
// com uma tabela anterior (o valor que o cliente viu pode não bater mais).
//
// Fase 2 do plano: estes valores passam a ser editáveis pelo painel (Netlify
// Blobs). Por isso o resto do código recebe o catálogo como parâmetro em vez de
// importar a constante direto — trocar a origem não mexe nas regras.

export type CategoriaId = "ensaio" | "evento" | "auxiliar" | "edicao";

export interface Categoria {
  id: CategoriaId;
  nome: string;
  descricao: string;
  /** Valor da hora extra em campo; ausente = categoria sem hora extra. */
  horaExtra?: number;
  /** Prazo de entrega padrão, já incluso no preço. */
  prazoPadrao?: string;
  /** Categoria com sessão de fotos: aceita pacote, hora extra, fotos extras, entrega e deslocamento. */
  temSessao: boolean;
}

export interface Pacote {
  id: string;
  categoria: CategoriaId;
  nome: string;
  duracao: string;
  entrega: string;
  preco: number;
  destaque?: boolean;
}

export interface OpcaoEntrega {
  id: string;
  nome: string;
  detalhe: string;
  preco: number;
}

export interface OpcaoDeslocamento {
  id: string;
  nome: string;
  preco: number;
  /** Valor definido na conversa — o orçamento mostra "a combinar". */
  aCombinar?: boolean;
}

export interface FaixaSinal {
  /** A faixa vale quando faltam pelo menos `diasMin` dias até a data do serviço. */
  diasMin: number;
  percentual: number;
}

export interface Catalogo {
  versao: number;
  contato: { nome: string; whatsapp: string; cidade: string; instagram?: string };
  categorias: Categoria[];
  pacotes: Pacote[];
  fotoExtra: { preco: number; precoVolume: number; volumeMin: number };
  fotoBruta: { preco: number; minimo: number };
  edicaoCliente: number;
  retoquePesado: number;
  entregas: OpcaoEntrega[];
  deslocamentos: OpcaoDeslocamento[];
  auxiliar: { aPartirDe: number; observacao: string };
  /** Ordenadas da maior antecedência para a menor; a última deve ter diasMin 0. */
  sinal: FaixaSinal[];
  validadeDias: number;
  incluso: string[];
  politicas: { titulo: string; texto: string }[];
}

export const CATALOGO: Catalogo = {
  versao: 1,
  contato: {
    nome: "Eluan Jesus Fotografia",
    // Formato internacional sem símbolos, exigido pelo link wa.me.
    whatsapp: "5586994514136",
    cidade: "Teresina",
  },
  categorias: [
    {
      id: "ensaio",
      nome: "Ensaio ao ar livre",
      descricao: "Individual, casal, família, gestante ou formatura infantil",
      horaExtra: 60,
      prazoPadrao: "até 10 dias",
      temSessao: true,
    },
    {
      id: "evento",
      nome: "Evento pequeno",
      descricao: "Aniversários, chás de bebê, eventos casuais e formaturas pequenas",
      horaExtra: 90,
      prazoPadrao: "até 10 dias",
      temSessao: true,
    },
    {
      id: "auxiliar",
      nome: "Fotógrafo auxiliar",
      descricao: "Diária de apoio para outro fotógrafo ou produção",
      temSessao: false,
    },
    {
      id: "edicao",
      nome: "Edição de fotos",
      descricao: "Você já tem as fotos e quer o tratamento profissional",
      temSessao: false,
    },
  ],
  pacotes: [
    { id: "en-mini", categoria: "ensaio", nome: "Mini", duracao: "30 min · 1 local", entrega: "15–20 fotos", preco: 130 },
    { id: "en-padrao", categoria: "ensaio", nome: "Padrão", duracao: "1h · até 2 looks", entrega: "30–40 fotos", preco: 220, destaque: true },
    { id: "en-completo", categoria: "ensaio", nome: "Completo", duracao: "1h30–2h · vários locais", entrega: "50–70 fotos", preco: 330 },
    { id: "ev-express", categoria: "evento", nome: "Express", duracao: "até 1h30", entrega: "30–40 fotos", preco: 250 },
    { id: "ev-curta", categoria: "evento", nome: "Curta", duracao: "até 2h30", entrega: "60–80 fotos", preco: 350, destaque: true },
    { id: "ev-padrao", categoria: "evento", nome: "Padrão", duracao: "3h–4h30", entrega: "100–130 fotos", preco: 530 },
    { id: "ev-estendida", categoria: "evento", nome: "Estendida", duracao: "5h–6h", entrega: "150–200 fotos", preco: 750 },
  ],
  // A partir de 10 unidades, TODAS as fotos extras saem pelo preço de volume
  // (não só as que passam de 10).
  fotoExtra: { preco: 13, precoVolume: 11, volumeMin: 10 },
  fotoBruta: { preco: 5, minimo: 20 },
  edicaoCliente: 22,
  retoquePesado: 35,
  entregas: [
    { id: "padrao", nome: "Prazo padrão", detalhe: "até 10 dias", preco: 0 },
    { id: "6d", nome: "Expressa 6 dias", detalhe: "até 6 dias", preco: 60 },
    { id: "4d", nome: "Expressa 4 dias", detalhe: "até 4 dias", preco: 90 },
    { id: "1d", nome: "Expressa 24h", detalhe: "até 1 dia depois", preco: 120 },
  ],
  deslocamentos: [
    { id: "ate10", nome: "Até 10 km de Teresina", preco: 0 },
    { id: "acima10", nome: "Acima de 10 km", preco: 0, aCombinar: true },
  ],
  auxiliar: {
    aPartirDe: 100,
    observacao: "Valor final depende de locomoção, equipamentos e duração.",
  },
  sinal: [
    { diasMin: 60, percentual: 20 },
    { diasMin: 15, percentual: 35 },
    { diasMin: 0, percentual: 50 },
  ],
  validadeDias: 7,
  incluso: [
    "Alta resolução, sem marca d'água",
    "Tratamento de cor e luz",
    "Prévia em 48h (3–5 fotos)",
    "1 rodada de ajuste",
    "Entrega por link digital",
  ],
  politicas: [
    { titulo: "Remarcação", texto: "A 2ª remarcação, ou qualquer remarcação com menos de 48h, tem taxa de R$45." },
    { titulo: "Reedição", texto: "Ajustes fora da rodada incluída ou do combinado: R$18 por foto." },
    { titulo: "Entrega expressa", texto: "Sujeita à agenda da semana; confirmo a disponibilidade na conversa." },
    { titulo: "Sinal", texto: "A data só fica reservada após o pagamento do sinal." },
  ],
};

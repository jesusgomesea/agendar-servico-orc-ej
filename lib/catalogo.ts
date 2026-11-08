// Tabela de preços da Eluan Jesus Fotografia — fonte única de valores do site.
//
// Tudo que o cliente vê no montador e tudo que o painel recalcula sai daqui:
// pacotes, adicionais, prazos, deslocamento, sinal, "Incluso" e "Bom saber".
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

/** Preço de lançamento de um pacote: vale enquanto `ativo` e houver vagas. */
export interface Lancamento {
  ativo: boolean;
  valor: number;
  /** Atualizado à mão aqui a cada evento fechado com o preço de lançamento. */
  vagasRestantes: number;
  aviso: string;
}

export interface Pacote {
  id: string;
  categoria: CategoriaId;
  nome: string;
  duracao: string;
  entrega: string;
  /** Preço cheio. O vigente sai de `precoDoPacote()` (considera o lançamento). */
  preco: number;
  destaque?: boolean;
  /** false = some do montador (o painel ainda lê orçamentos antigos com ele). Ausente = ativo. */
  ativo?: boolean;
  /** Aviso curto mostrado no cartão do pacote. */
  aviso?: string;
  lancamento?: Lancamento;
  /**
   * Pacote que saiu da tabela. Fica aqui só para o painel ler mensagens antigas
   * que ainda circulam (ids nunca são reaproveitados — ver MANUTENCAO §3). Pode
   * ser apagado quando os orçamentos que o usam expirarem (`validadeDias`).
   */
  legado?: boolean;
}

export interface OpcaoEntrega {
  id: string;
  nome: string;
  detalhe: string;
  preco: number;
  /** Serviços em que a opção aparece. Ausente = todos com sessão. */
  categorias?: CategoriaId[];
}

export interface OpcaoDeslocamento {
  id: string;
  nome: string;
  preco: number;
  /** Valor definido na conversa — o orçamento mostra "a combinar". */
  aCombinar?: boolean;
  /** Saiu da tabela; só para ler mensagens antigas (ver `Pacote.legado`). */
  legado?: boolean;
}

/** Texto de "Incluso" ou "Bom saber". `categorias` ausente = vale para todos os serviços. */
export interface ItemTexto {
  titulo?: string;
  texto: string;
  categorias?: CategoriaId[];
}

export interface FaixaCancelamento {
  /** A faixa vale quando o aviso chega com pelo menos `diasMin` dias de antecedência. */
  diasMin: number;
  /** Percentual do valor total que fica com o fotógrafo. */
  percentualRetido: number;
}

export interface Catalogo {
  versao: number;
  /** Nome de apresentação: muda aqui e vale no site todo (cabeçalho, título, mensagem, login). */
  marca: { nome: string; complemento: string };
  contato: { nome: string; whatsapp: string; cidade: string; instagram: string };
  categorias: Categoria[];
  pacotes: Pacote[];
  fotoExtra: { preco: number; precoVolume: number; volumeMin: number };
  fotoBruta: { preco: number; minimo: number; categorias: CategoriaId[]; aviso: string };
  edicaoCliente: number;
  retoquePesado: number;
  entregas: OpcaoEntrega[];
  deslocamentos: OpcaoDeslocamento[];
  auxiliar: { aPartirDe: number; observacao: string };
  /** Percentual do total cobrado como sinal; arredondado para cima em reais inteiros. */
  sinalPercentual: number;
  reserva: string;
  /** Até quantas horas antes da sessão a remarcação por chuva é decidida. */
  chuvaHorasAntes: number;
  cancelamento: {
    /** Dias após assinar o contrato em que a desistência devolve tudo. */
    devolucaoIntegralDias: number;
    /** Ordenadas da maior antecedência para a menor; a última deve ter diasMin 0. */
    faixas: FaixaCancelamento[];
  };
  validadeDias: number;
  incluso: ItemTexto[];
  politicas: ItemTexto[];
}

const MARCA = { nome: "Eluan Jesus", complemento: "Fotografia" };
const INSTAGRAM = "@eluan.jesus";

// Valores das políticas que entram nos textos do "Bom saber" (e no contrato).
const CHUVA_HORAS_ANTES = 3;
const CANCELAMENTO = {
  devolucaoIntegralDias: 7,
  faixas: [
    { diasMin: 31, percentualRetido: 10 }, // mais de 30 dias
    { diasMin: 8, percentualRetido: 15 }, // de 30 a 8 dias
    { diasMin: 0, percentualRetido: 20 }, // 7 dias ou menos
  ],
};
const retidos = CANCELAMENTO.faixas.map((f) => f.percentualRetido);

export const CATALOGO: Catalogo = {
  // v3 (08/11/2026): eventos Essencial/Padrão/Completo (Essencial com preço de
  // lançamento), Sessão Rápida, ensaio Mini R$100 e Padrão R$200, hora extra de
  // evento R$70, fotos brutas só em evento, Expressa 24h só em evento (+R$60),
  // deslocamento em faixas e sinal fixo de 40%.
  // v2 (09/10/2026): edição de foto do cliente R$22→R$5 e retoque pesado R$35→R$10.
  versao: 3,
  marca: MARCA,
  contato: {
    nome: `${MARCA.nome} ${MARCA.complemento}`,
    // Formato internacional sem símbolos, exigido pelo link wa.me.
    whatsapp: "5586994514136",
    cidade: "Teresina",
    instagram: INSTAGRAM,
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
      horaExtra: 70,
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
    {
      id: "en-rapida",
      categoria: "ensaio",
      nome: "Sessão Rápida",
      duracao: "15 min · 1 local fixo definido pelo fotógrafo",
      entrega: "5 fotos",
      preco: 75,
      // Agenda coletiva (vários clientes no mesmo local e dia). false esconde o pacote.
      ativo: true,
      aviso: `Disponível apenas em datas especiais divulgadas no Instagram ${INSTAGRAM}.`,
    },
    { id: "en-mini", categoria: "ensaio", nome: "Mini", duracao: "30 min · 1 local", entrega: "15–20 fotos", preco: 100 },
    { id: "en-padrao", categoria: "ensaio", nome: "Padrão", duracao: "1h · até 2 looks", entrega: "30–40 fotos", preco: 200, destaque: true },
    { id: "en-completo", categoria: "ensaio", nome: "Completo", duracao: "1h30–2h · vários locais", entrega: "50–70 fotos", preco: 330 },

    // Ids novos de propósito: "ev-padrao" já existia com outro conteúdo (3h–4h30).
    {
      id: "ev-essencial",
      categoria: "evento",
      nome: "Essencial",
      duracao: "até 1h30 de cobertura",
      entrega: "30 fotos",
      preco: 250,
      lancamento: {
        ativo: true,
        valor: 150,
        vagasRestantes: 5,
        aviso: "Preço de lançamento para os primeiros 5 eventos, mediante autorização de uso das fotos no portfólio.",
      },
    },
    { id: "ev-padrao3", categoria: "evento", nome: "Padrão", duracao: "até 2h30 de cobertura", entrega: "50–60 fotos", preco: 350, destaque: true },
    { id: "ev-completo", categoria: "evento", nome: "Completo", duracao: "até 3h30 de cobertura", entrega: "80–100 fotos", preco: 480 },

    // Tabela v2: só para ler orçamentos antigos no painel.
    { id: "ev-express", categoria: "evento", nome: "Express", duracao: "até 1h30", entrega: "30–40 fotos", preco: 250, legado: true },
    { id: "ev-curta", categoria: "evento", nome: "Curta", duracao: "até 2h30", entrega: "60–80 fotos", preco: 350, legado: true },
    { id: "ev-padrao", categoria: "evento", nome: "Padrão", duracao: "3h–4h30", entrega: "100–130 fotos", preco: 530, legado: true },
    { id: "ev-estendida", categoria: "evento", nome: "Estendida", duracao: "5h–6h", entrega: "150–200 fotos", preco: 750, legado: true },
  ],
  // A partir de 10 unidades, TODAS as fotos extras saem pelo preço de volume
  // (não só as que passam de 10). Vale igual para ensaio e evento.
  fotoExtra: { preco: 13, precoVolume: 11, volumeMin: 10 },
  fotoBruta: {
    preco: 5,
    minimo: 20,
    categorias: ["evento"],
    aviso: "Arquivos sem tratamento de cor e luz, entregues como saíram da câmera.",
  },
  edicaoCliente: 5,
  retoquePesado: 10,
  entregas: [
    { id: "padrao", nome: "Prazo padrão", detalhe: "até 10 dias", preco: 0 },
    { id: "6d", nome: "Expressa 6 dias", detalhe: "até 6 dias", preco: 60 },
    { id: "4d", nome: "Expressa 4 dias", detalhe: "até 4 dias", preco: 90 },
    { id: "1d", nome: "Expressa 24h", detalhe: "até 1 dia depois", preco: 60, categorias: ["evento"] },
  ],
  deslocamentos: [
    { id: "ate10", nome: "Até 10 km de Teresina", preco: 0 },
    { id: "10a20", nome: "10 a 20 km de Teresina", preco: 25 },
    { id: "20a30", nome: "20 a 30 km de Teresina", preco: 45 },
    { id: "acima30", nome: "Acima de 30 km", preco: 0, aCombinar: true },
    { id: "acima10", nome: "Acima de 10 km", preco: 0, aCombinar: true, legado: true },
  ],
  auxiliar: {
    aPartirDe: 100,
    observacao: "Valor final depende de locomoção, equipamentos e duração.",
  },
  sinalPercentual: 40,
  reserva: "A data fica reservada após a assinatura do contrato pelo gov.br e o pagamento do sinal via Pix.",
  chuvaHorasAntes: CHUVA_HORAS_ANTES,
  cancelamento: CANCELAMENTO,
  validadeDias: 7,
  incluso: [
    { texto: "Alta resolução, sem marca d'água" },
    { texto: "Tratamento de cor e luz" },
    { texto: "Prévia em 48h (3–5 fotos)" },
    { texto: "1 rodada de ajuste" },
    { texto: "Entrega por link digital" },
    { texto: "Prévia de 3 a 5 fotos editadas ainda durante o evento", categorias: ["evento"] },
  ],
  politicas: [
    { titulo: "Remarcação", texto: "A 2ª remarcação, ou qualquer remarcação com menos de 48h, tem taxa de R$45." },
    { titulo: "Reedição", texto: "Ajustes fora da rodada incluída ou do combinado: R$18 por foto." },
    { titulo: "Entrega expressa", texto: "Sujeita à agenda da semana; confirmo a disponibilidade na conversa." },
    {
      titulo: "Chuva ou mau tempo",
      texto: `Remarcação por clima não tem taxa. Eu avalio as condições e confirmo até ${CHUVA_HORAS_ANTES} horas antes; a nova data segue a disponibilidade da agenda.`,
      categorias: ["ensaio"],
    },
    {
      titulo: "Desistência e cancelamento",
      texto:
        `Até ${CANCELAMENTO.devolucaoIntegralDias} dias após assinar o contrato, você pode desistir e recebe de volta tudo o que pagou. ` +
        `Depois desse prazo, fico com ${Math.min(...retidos)}% a ${Math.max(...retidos)}% do valor total, conforme a antecedência do aviso, ` +
        "e devolvo o resto do sinal. Se preferir, em vez de cancelar, você pode remarcar e manter o sinal como crédito. Os detalhes estão no contrato.",
    },
  ],
};

/** Pacote que o cliente pode escolher no montador agora. */
export function pacoteDisponivel(p: Pacote): boolean {
  return !p.legado && p.ativo !== false;
}

/** Preço de lançamento valendo (ligado e com vagas) para o pacote, ou null. */
export function lancamentoVigente(p: Pacote): Lancamento | null {
  const l = p.lancamento;
  return l && l.ativo && l.vagasRestantes > 0 ? l : null;
}

/** Preço que vale hoje para o pacote: o de lançamento enquanto houver vagas, senão o cheio. */
export function precoDoPacote(p: Pacote): number {
  return lancamentoVigente(p)?.valor ?? p.preco;
}

/** A opção de entrega existe para este serviço? */
export function entregaValeNa(e: OpcaoEntrega, categoria: CategoriaId): boolean {
  return !e.categorias || e.categorias.includes(categoria);
}

/** O texto (Incluso / Bom saber) vale para este serviço? */
export function textoValeNa(t: ItemTexto, categoria: CategoriaId): boolean {
  return !t.categorias || t.categorias.includes(categoria);
}

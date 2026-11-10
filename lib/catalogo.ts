// Tabela de preços da Eluan Jesus Fotografia — fonte única de valores do site.
//
// Tudo que o cliente vê no montador e tudo que a API de recálculo (Orça Aqui) refaz sai daqui:
// pacotes, prazos, adicionais, deslocamento, auxiliar e sinal.
// Mudou preço? Edite este arquivo E aumente `versao`: o código que vai no texto
// do WhatsApp carrega a versão, e o Orça Aqui avisa quando um orçamento foi gerado
// com uma tabela anterior (o valor que o cliente viu pode não bater mais).
//
// Políticas (incluso, chuva, cancelamento, remarcação…) saíram do site na v4:
// são cláusulas do contrato, enviado em PDF pelo WhatsApp.
//
// Fase 2 do plano: estes valores passam a ser editáveis (Netlify
// Blobs). Por isso o resto do código recebe o catálogo como parâmetro em vez de
// importar a constante direto — trocar a origem não mexe nas regras.

export type CategoriaId = "ensaio" | "evento" | "auxiliar" | "edicao";

/** Preço da foto editada: o de volume vale para TODAS quando a quantidade atinge `volumeMin`. */
export interface PrecoFoto {
  preco: number;
  precoVolume: number;
  volumeMin: number;
}

export interface Categoria {
  id: CategoriaId;
  nome: string;
  descricao: string;
  /** Categoria com sessão de fotos: aceita pacote, hora extra, fotos extras, entrega e deslocamento. */
  temSessao: boolean;
  /** Valor da hora extra em campo nos pacotes fechados. */
  horaExtra?: number;
  /**
   * Foto extra dos pacotes fechados. Separada da foto do Personalizado de
   * propósito: é acréscimo depois do pacote (muitas vezes definido só após a
   * entrega) e não precisa competir com o preço do Personalizado.
   */
  foto?: PrecoFoto;
  /** Pacote Personalizado: tempo de cobertura em blocos de minutos + fotos editadas. */
  personalizado?: Personalizado;
  /** Saiu do site; continua aqui só para a API ler orçamentos antigos. */
  legado?: boolean;
}

/**
 * Regras do Personalizado. Calibradas (v5) para sair perto dos pacotes fechados
 * com o mesmo conteúdo — o Personalizado ganha quando o cliente quer menos
 * tempo ou menos fotos que um pacote.
 */
export interface Personalizado {
  valorHora: number;
  /** Tempo cobrado em blocos deste tamanho (o contador anda de bloco em bloco). */
  blocoMinutos: number;
  minutosMin: number;
  minutosMax: number;
  fotosMin: number;
  foto: PrecoFoto;
}

export interface Pacote {
  id: string;
  categoria: CategoriaId;
  nome: string;
  duracao: string;
  entrega: string;
  preco: number;
  /** Prazo de entrega padrão (sem custo) deste pacote. */
  prazo: string;
  destaque?: boolean;
  /** false = some do montador (a API ainda lê orçamentos antigos com ele). Ausente = ativo. */
  ativo?: boolean;
  /** Aviso curto mostrado no cartão do pacote. */
  aviso?: string;
  /**
   * Pacote montado pelo cliente: preço = tempo × valor da hora + fotos × preço
   * da foto (ver `Categoria.personalizado`). `preco` e
   * `prazo` não valem; o prazo sai de `prazoPorFotos()`.
   */
  personalizado?: boolean;
  /**
   * Pacote que saiu da tabela. Fica aqui só para a API ler mensagens antigas
   * que ainda circulam (ids nunca são reaproveitados — ver MANUTENCAO §3). Pode
   * ser apagado quando os orçamentos que o usam expirarem (`validadeDias`).
   */
  legado?: boolean;
}

/** Entrega expressa (o prazo padrão é o `prazo` do pacote, id "padrao"). */
export interface OpcaoEntrega {
  id: string;
  nome: string;
  detalhe: string;
  preco: number;
  /** Pacotes que oferecem esta opção. Ausente = opção legada (só leitura de orçamentos antigos). */
  pacotes?: string[];
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

/** Prazo do Personalizado pela quantidade de fotos: vale a primeira faixa com `ateFotos` ≥ fotos. */
export interface FaixaPrazo {
  ateFotos: number;
  prazo: string;
}

export interface ModoAuxiliar {
  id: "com" | "sem";
  nome: string;
  diaria: number;
  /** Cobra deslocamento (transporte por conta do fotógrafo fora de Teresina). */
  cobraDeslocamento: boolean;
}

export interface Catalogo {
  versao: number;
  /** Nome de apresentação: muda aqui e vale no site todo (cabeçalho, título, mensagem, login). */
  marca: { nome: string; complemento: string };
  contato: { nome: string; whatsapp: string; cidade: string; instagram: string };
  categorias: Categoria[];
  pacotes: Pacote[];
  /** Ordenadas pela quantidade de fotos; a última deve cobrir qualquer quantidade. */
  prazosPersonalizado: FaixaPrazo[];
  entregas: OpcaoEntrega[];
  deslocamentos: OpcaoDeslocamento[];
  auxiliar: { modos: ModoAuxiliar[]; observacao: string };
  /** Só para ler orçamentos antigos de "Edição de fotos" e retoque pesado (saíram na v4). */
  legadoEdicao: { edicaoCliente: number; retoquePesado: number };
  /** Percentual do total cobrado como sinal; arredondado para cima em reais inteiros. */
  sinalPercentual: number;
  reserva: string;
  validadeDias: number;
}

const MARCA = { nome: "Eluan Jesus", complemento: "Fotografia" };
const INSTAGRAM = "@eluan.jesus";

export const CATALOGO: Catalogo = {
  // v5 (08/11/2026): Personalizado mais em conta — tempo em blocos (ensaio de
  // 15 min, mínimo 15 min; evento de 30 min, mínimo 1h) e foto a R$6, todas a
  // R$4,50 a partir de 30 (ensaio) ou 60 (evento). Foto extra dos pacotes segue R$12/R$10.
  // v4 (08/11/2026): prazo de entrega por pacote, Personalizado (horas + fotos),
  // ensaio hora extra R$35, evento Padrão R$250 / Completo R$360 / hora extra
  // R$45, foto extra R$12 (R$10 a partir de 15 no ensaio e 50 no evento), auxiliar
  // R$90/R$120, sem lançamento, sem fotos brutas, sem retoque e sem "Edição de fotos".
  // v3: eventos novos, Sessão Rápida, sinal 40%, deslocamento em faixas.
  versao: 5,
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
      temSessao: true,
      horaExtra: 35,
      foto: { preco: 12, precoVolume: 10, volumeMin: 15 },
      personalizado: {
        valorHora: 30,
        blocoMinutos: 15,
        minutosMin: 15,
        minutosMax: 480,
        fotosMin: 5,
        foto: { preco: 6, precoVolume: 4.5, volumeMin: 30 },
      },
    },
    {
      id: "evento",
      nome: "Evento pequeno",
      descricao: "Aniversários, chás de bebê, eventos casuais e formaturas pequenas",
      temSessao: true,
      horaExtra: 45,
      foto: { preco: 12, precoVolume: 10, volumeMin: 50 },
      personalizado: {
        valorHora: 45,
        blocoMinutos: 30,
        minutosMin: 60,
        minutosMax: 720,
        fotosMin: 20,
        foto: { preco: 6, precoVolume: 4.5, volumeMin: 60 },
      },
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
      legado: true,
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
      prazo: "em até 6h",
      // Agenda coletiva (vários clientes no mesmo local e dia). false esconde o pacote.
      ativo: true,
      aviso: `Disponível apenas em datas especiais divulgadas no Instagram ${INSTAGRAM}.`,
    },
    { id: "en-mini", categoria: "ensaio", nome: "Mini", duracao: "30 min · 1 local", entrega: "15–20 fotos", preco: 100, prazo: "em até 8h" },
    {
      id: "en-padrao",
      categoria: "ensaio",
      nome: "Padrão",
      duracao: "1h · até 2 looks",
      entrega: "30–40 fotos",
      preco: 200,
      prazo: "em até 24h",
      destaque: true,
    },
    {
      id: "en-completo",
      categoria: "ensaio",
      nome: "Completo",
      duracao: "1h30–2h · vários locais",
      entrega: "50–70 fotos",
      preco: 330,
      prazo: "2–3 dias úteis",
    },
    {
      id: "en-personalizado",
      categoria: "ensaio",
      nome: "Personalizado",
      duracao: "Você escolhe o tempo de cobertura",
      entrega: "Você escolhe quantas fotos",
      preco: 0,
      prazo: "",
      personalizado: true,
    },

    { id: "ev-essencial", categoria: "evento", nome: "Essencial", duracao: "até 1h30 de cobertura", entrega: "30 fotos", preco: 150, prazo: "1–2 dias" },
    {
      id: "ev-padrao3",
      categoria: "evento",
      nome: "Padrão",
      duracao: "até 2h30 de cobertura",
      entrega: "50–60 fotos",
      preco: 250,
      prazo: "2–4 dias",
      destaque: true,
    },
    {
      id: "ev-completo",
      categoria: "evento",
      nome: "Completo",
      duracao: "até 3h30 de cobertura",
      entrega: "80–100 fotos",
      preco: 360,
      prazo: "3–5 dias úteis, com entregas parciais ao longo dos dias",
    },
    {
      id: "ev-personalizado",
      categoria: "evento",
      nome: "Personalizado",
      duracao: "Você escolhe o tempo de cobertura",
      entrega: "Você escolhe quantas fotos",
      preco: 0,
      prazo: "",
      personalizado: true,
    },

    // Tabela v2: só para a API ler orçamentos antigos.
    { id: "ev-express", categoria: "evento", nome: "Express", duracao: "até 1h30", entrega: "30–40 fotos", preco: 250, prazo: "até 10 dias", legado: true },
    { id: "ev-curta", categoria: "evento", nome: "Curta", duracao: "até 2h30", entrega: "60–80 fotos", preco: 350, prazo: "até 10 dias", legado: true },
    { id: "ev-padrao", categoria: "evento", nome: "Padrão", duracao: "3h–4h30", entrega: "100–130 fotos", preco: 530, prazo: "até 10 dias", legado: true },
    { id: "ev-estendida", categoria: "evento", nome: "Estendida", duracao: "5h–6h", entrega: "150–200 fotos", preco: 750, prazo: "até 10 dias", legado: true },
  ],
  prazosPersonalizado: [
    { ateFotos: 10, prazo: "em até 24h" },
    { ateFotos: 30, prazo: "36–48 horas" },
    { ateFotos: 50, prazo: "3 dias" },
    { ateFotos: Number.POSITIVE_INFINITY, prazo: "3–5 dias, com entregas parciais" },
  ],
  entregas: [
    { id: "x36", nome: "Expressa 36h", detalhe: "em até 36h", preco: 40, pacotes: ["en-completo"] },
    { id: "x24", nome: "Expressa 24h", detalhe: "em até 24h", preco: 50, pacotes: ["en-completo"] },
    { id: "ev24", nome: "Expressa 24h", detalhe: "em até 24h", preco: 60, pacotes: ["ev-padrao3"] },
    { id: "ev13", nome: "Expressa", detalhe: "entrega completa em 1–3 dias", preco: 80, pacotes: ["ev-completo"] },
    // Tabela v3 (sem `pacotes`): só para ler orçamentos antigos.
    { id: "6d", nome: "Expressa 6 dias", detalhe: "até 6 dias", preco: 60 },
    { id: "4d", nome: "Expressa 4 dias", detalhe: "até 4 dias", preco: 90 },
    { id: "1d", nome: "Expressa 24h", detalhe: "até 1 dia depois", preco: 60 },
  ],
  deslocamentos: [
    { id: "ate10", nome: "Até 10 km de Teresina", preco: 0 },
    { id: "10a20", nome: "10 a 20 km de Teresina", preco: 25 },
    { id: "20a30", nome: "20 a 30 km de Teresina", preco: 45 },
    { id: "acima30", nome: "Acima de 30 km", preco: 0, aCombinar: true },
    { id: "acima10", nome: "Acima de 10 km", preco: 0, aCombinar: true, legado: true },
  ],
  auxiliar: {
    modos: [
      { id: "com", nome: "Com alimentação e transporte inclusos", diaria: 90, cobraDeslocamento: false },
      { id: "sem", nome: "Sem alimentação e transporte", diaria: 120, cobraDeslocamento: true },
    ],
    observacao: "Fora de Teresina e sem transporte oferecido, o deslocamento é cobrado pela distância.",
  },
  legadoEdicao: { edicaoCliente: 5, retoquePesado: 10 },
  sinalPercentual: 40,
  reserva: "A data fica reservada após a assinatura do contrato pelo gov.br e o pagamento do sinal via Pix.",
  validadeDias: 7,
};

/** Pacote que o cliente pode escolher no montador agora. */
export function pacoteDisponivel(p: Pacote): boolean {
  return !p.legado && p.ativo !== false;
}

/** Expressa disponível para o pacote escolhido (as legadas só valem para ler orçamentos antigos). */
export function entregaValeNo(e: OpcaoEntrega, pacoteId: string | null): boolean {
  return !!e.pacotes && !!pacoteId && e.pacotes.includes(pacoteId);
}

/** Prazo do Personalizado pela quantidade de fotos. */
export function prazoPorFotos(fotos: number, cat: Catalogo): string {
  const faixas = cat.prazosPersonalizado;
  return (faixas.find((f) => fotos <= f.ateFotos) ?? faixas[faixas.length - 1]).prazo;
}

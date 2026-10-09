// Formatação de dinheiro e datas, e contas de calendário usadas no site todo.
//
// Datas circulam como texto "AAAA-MM-DD" (o mesmo do <input type="date">), nunca
// como Date: o Date carrega fuso horário, e "2026-12-15" convertido em Date à
// meia-noite UTC vira dia 14 no horário de Teresina (UTC-3). Quando é preciso
// fazer conta, a conversão usa UTC dos dois lados e o fuso se anula.

const FORMATO_MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 1234.5 → "R$ 1.234,50" (com espaço normal, para o texto do WhatsApp não quebrar estranho). */
export function moeda(valor: number): string {
  return FORMATO_MOEDA.format(valor).replace(/ /g, " ");
}

/** "R$ 1.234,50" → 1234.5. Aceita "R$1234", "1.234,50", "1234,5". Devolve null se não houver número. */
export function lerMoeda(texto: string): number | null {
  // "150.50" digitado com ponto (teclado de celular) vira "150,50"; "1.500" continua milhar.
  if (/^\s*(R\$\s*)?\d+\.\d{1,2}\s*$/.test(texto)) texto = texto.replace(".", ",");
  const m = texto.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/);
  if (!m) return null;
  const inteiro = Number(m[1].replace(/\./g, ""));
  const centavos = m[2] ? Number(m[2].padEnd(2, "0")) / 100 : 0;
  return inteiro + centavos;
}

const RE_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function dataIsoValida(texto: string | null | undefined): texto is string {
  if (!texto || !RE_DATA_ISO.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

/** "2026-12-15" → "15/12/2026". */
export function dataBR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** "15/12/2026" → "2026-12-15" (ou null se não for uma data válida). */
export function dataBRparaIso(br: string): string | null {
  const m = br.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return dataIsoValida(iso) ? iso : null;
}

/** Data de hoje no relógio de quem está usando (não em UTC), como "AAAA-MM-DD". */
export function hojeIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Dias corridos de `de` até `ate` (negativo se `ate` já passou). */
export function diasEntre(de: string, ate: string): number {
  const ms = Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Partes curtas para cartões de agenda: { dia: "15", mes: "dez", semana: "ter" }. */
export function partesData(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return {
    dia: String(d.getUTCDate()).padStart(2, "0"),
    mes: MESES[d.getUTCMonth()],
    semana: DIAS_SEMANA[d.getUTCDay()],
    ano: d.getUTCFullYear(),
  };
}

/** Só dígitos; "(86) 99451-4136" → "86994514136". */
export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** Link wa.me para um telefone brasileiro digitado de qualquer jeito; null se não parecer telefone. */
export function linkWhatsApp(telefone: string, texto?: string): string | null {
  let n = soDigitos(telefone);
  if (n.length === 10 || n.length === 11) n = `55${n}`;
  if (n.length < 12) return null;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

// Junta classes CSS ignorando as vazias: cn("a", cond && "b") → "a b" ou "a".
// Sem tailwind-merge: duas classes da mesma propriedade (ex.: "w-full" e "w-28")
// NÃO se resolvem pela ordem em que aparecem aqui, e sim pela ordem no CSS
// gerado. Por isso as classes-base (classesEntrada, classesBotao) evitam fixar
// largura, e quando é preciso forçar uma altura usa-se "!" (ex.: "h-11!").
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

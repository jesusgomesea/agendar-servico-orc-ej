// Testes de unidade das regras de preço e do texto do orçamento (lib/).
// Não cobre telas: o que precisa ser exato é a conta e a leitura do texto colado.
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { include: ["lib/**/*.test.ts"] },
});

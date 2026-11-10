// Layout raiz: fontes, metadados de compartilhamento e o provedor de avisos.
// O painel de agendamentos saiu daqui e mora no Orça Aqui; este site é só o
// montador público e a API pública de recálculo/catálogo.
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CATALOGO } from "@/lib/catalogo";
import { ProvedorAvisos } from "@/components/ui/Avisos";
import "./globals.css";

export const metadata: Metadata = {
  // URL é preenchida pelo Netlify no build (endereço principal do site); serve
  // para a imagem da prévia no WhatsApp sair com endereço completo.
  metadataBase: new URL(process.env.URL ?? "http://localhost:3000"),
  title: `${CATALOGO.contato.nome} — Orçamento online`,
  description: "Monte seu orçamento de ensaio ou evento em Teresina, veja o valor na hora e envie pelo WhatsApp.",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  // O link circula no WhatsApp e no Instagram: a prévia precisa ficar bonita.
  openGraph: {
    title: `${CATALOGO.contato.nome} — Orçamento online`,
    description: "Monte seu orçamento, veja o valor na hora e envie pelo WhatsApp.",
    images: ["/icone-512.png"],
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <ProvedorAvisos>{children}</ProvedorAvisos>
      </body>
    </html>
  );
}

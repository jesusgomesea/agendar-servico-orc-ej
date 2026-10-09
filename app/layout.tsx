// Layout raiz: fontes, metadados de compartilhamento e os provedores globais
// (sessão do Identity — que trata os links de e-mail em qualquer página — e avisos).
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import ProvedorSessao from "@/components/auth/ProvedorSessao";
import { ProvedorAvisos } from "@/components/ui/Avisos";
import "./globals.css";

export const metadata: Metadata = {
  // URL é preenchida pelo Netlify no build (endereço principal do site); serve
  // para a imagem da prévia no WhatsApp sair com endereço completo.
  metadataBase: new URL(process.env.URL ?? "http://localhost:3000"),
  title: "Eluan Jesus Fotografia — Orçamento online",
  description: "Monte seu orçamento de ensaio ou evento em Teresina, veja o valor na hora e envie pelo WhatsApp.",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  // O link circula no WhatsApp e no Instagram: a prévia precisa ficar bonita.
  openGraph: {
    title: "Eluan Jesus Fotografia — Orçamento online",
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
        <ProvedorSessao>
          <ProvedorAvisos>{children}</ProvedorAvisos>
        </ProvedorSessao>
      </body>
    </html>
  );
}

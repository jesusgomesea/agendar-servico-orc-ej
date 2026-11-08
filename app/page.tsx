// Página pública (/): apresentação curta + montador de orçamento.
// Incluso, sinal e políticas saíram da página na tabela v4: viraram cláusulas do contrato.
// É Server Component só para ficar estática; a parte interativa é o <Montador/>.
import { CATALOGO } from "@/lib/catalogo";
import Montador from "@/components/montador/Montador";

export default function Inicio() {
  const cat = CATALOGO;
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <a href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo estática pequena */}
          <img src="/logo.png" alt="" width={44} height={38} />
          <span className="font-titulo text-lg leading-tight font-semibold">
            {cat.marca.nome}
            <span className="block text-xs font-normal tracking-[0.2em] text-suave uppercase">{cat.marca.complemento}</span>
          </span>
        </a>
        <span className="text-sm text-suave">{cat.contato.cidade} · PI</span>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-8 pb-14 sm:pt-14">
        <p className="mb-4 text-xs tracking-[0.25em] text-fraco uppercase">Orçamento online</p>
        <h1 className="max-w-3xl font-titulo text-4xl leading-[1.1] font-semibold sm:text-6xl">
          Monte seu orçamento e veja o valor na hora.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-suave">
          Escolha o serviço, ajuste do seu jeito e envie pelo WhatsApp. Eu confirmo a data e fechamos tudo por lá.
        </p>
      </section>

      <Montador />

      <footer className="border-t border-borda">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 pb-28 text-sm text-fraco lg:pb-6">
          <span>
            © {new Date().getFullYear()} {cat.contato.nome} · {cat.contato.cidade}
          </span>
          <a href="/painel" className="hover:text-texto">
            Área do fotógrafo
          </a>
        </div>
      </footer>
    </>
  );
}

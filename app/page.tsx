// Página pública (/): apresentação curta + montador de orçamento + o que está incluso e as políticas.
// É Server Component só para ficar estática; a parte interativa é o <Montador/>.
import { CATALOGO, type ItemTexto } from "@/lib/catalogo";
import Montador from "@/components/montador/Montador";

export default function Inicio() {
  const cat = CATALOGO;
  // Item que vale só para alguns serviços ganha a indicação (ex.: "só em evento pequeno").
  const so = (t: ItemTexto) =>
    t.categorias ? ` (${t.categorias.map((id) => cat.categorias.find((c) => c.id === id)?.nome.toLowerCase()).join(", ")})` : "";
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

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 md:grid-cols-3">
        <div className="rounded-2xl border border-borda bg-superficie p-5">
          <h2 className="font-titulo text-lg font-semibold">Incluso em todos os pacotes</h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm text-suave">
            {cat.incluso.map((i) => (
              <li key={i.texto}>
                — {i.texto}
                {so(i) && <span className="text-fraco">{so(i)}</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-borda bg-superficie p-5">
          <h2 className="font-titulo text-lg font-semibold">Sinal para reservar</h2>
          <p className="mt-3 text-sm text-suave">
            <span className="tabular font-semibold text-texto">{cat.sinalPercentual}%</span> do total, arredondado para cima. O restante é pago até o
            dia do ensaio ou evento.
          </p>
          <p className="mt-3 text-xs text-fraco">{cat.reserva}</p>
        </div>
        <div className="rounded-2xl border border-borda bg-superficie p-5">
          <h2 className="font-titulo text-lg font-semibold">Bom saber</h2>
          <dl className="mt-3 flex flex-col gap-2.5 text-sm">
            {cat.politicas.map((p) => (
              <div key={p.titulo}>
                <dt className="text-texto">
                  {p.titulo}
                  {so(p) && <span className="text-fraco">{so(p)}</span>}
                </dt>
                <dd className="text-suave">{p.texto}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

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

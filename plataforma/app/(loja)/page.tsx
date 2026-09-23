import Link from "next/link";
import { BannerHero } from "@/components/loja/BannerHero";
import { SecaoProdutos } from "@/components/loja/SecaoProdutos";
import { CabecalhoSecao } from "@/components/loja/ui";
import { Icone, iconeValido, type NomeIcone } from "@/components/Icone";
import { categoriasComProdutos, lerConfig, listarProdutos } from "@/lib/catalogo";
import { listarBanners, montarSecoes } from "@/lib/home";

export const revalidate = 60;

/**
 * A home inteira vem do painel (Home → Banners / Seções / Textos).
 * Nada aqui é escrito no código: o que o painel não tiver, some da página.
 */
export default async function Home() {
  const [produtos, categorias, config, banners] = await Promise.all([
    listarProdutos(),
    categoriasComProdutos(),
    lerConfig(),
    listarBanners(),
  ]);
  const secoes = await montarSecoes(produtos);
  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));
  const textos = config.home_textos;

  return (
    <>
      <BannerHero slides={banners} />

      {/* O banner vai até a borda, então a folga de cima desta faixa tem que vir
          dela mesma: sem ela os botões de categoria encostam na foto. */}
      {textos.categorias.ativo && categorias.length > 1 && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <div className="flex flex-wrap justify-center gap-2">
            {categorias.map((c) => (
              <Link
                key={c.id}
                href={`/categoria/${c.slug}`}
                className="rounded-full border-[1.5px] border-borda bg-cartao px-5 py-2 text-sm font-semibold hover:border-terracota hover:bg-terracota-claro hover:text-marrom"
              >
                {c.nome}
              </Link>
            ))}
          </div>
        </section>
      )}

      {secoes.map((s) => (
        <SecaoProdutos key={s.id} secao={s} nomesCategorias={nomes} />
      ))}

      {textos.como_funciona.ativo && (
        <section id="como-funciona" className="scroll-mt-24 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4">
            <CabecalhoSecao
              selo={textos.como_funciona.selo}
              titulo={textos.como_funciona.titulo}
              subtitulo={textos.como_funciona.subtitulo || undefined}
            />
            <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {textos.como_funciona.passos.map((p, i) => (
                <li key={`${p.titulo}-${i}`} className="rounded-card border border-borda bg-cartao p-6">
                  <span className="font-display text-4xl font-bold text-terracota-claro [-webkit-text-stroke:1.5px_var(--color-terracota)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mb-2 mt-3 text-lg font-semibold">{p.titulo}</h3>
                  <p className="text-sm text-texto-suave">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {textos.chamada.ativo && (
        <section className="px-4 pb-16 sm:pb-24">
          <div className="mx-auto max-w-6xl rounded-grande bg-gradient-to-br from-[#7a5c48] to-marrom px-6 py-14 text-center text-creme-claro">
            <h2 className="text-3xl font-semibold text-creme-claro sm:text-4xl">{textos.chamada.titulo}</h2>
            {textos.chamada.texto && (
              <p className="mx-auto mt-3 max-w-xl opacity-90">{textos.chamada.texto}</p>
            )}
            <Link
              href={textos.chamada.link || "/produtos"}
              className="mt-8 inline-flex rounded-full bg-creme-claro px-7 py-3.5 font-semibold text-marrom transition hover:-translate-y-0.5"
            >
              {textos.chamada.botao}
            </Link>
          </div>
        </section>
      )}

      {textos.beneficios.ativo && textos.beneficios.itens.length > 0 && (
        <section className="bg-creme-claro py-14">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4">
            {textos.beneficios.itens.map((b, i) => (
              <Beneficio key={`${b.titulo}-${i}`} icone={iconeValido(b.icone)} titulo={b.titulo} texto={b.texto} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Beneficio({ icone, titulo, texto }: { icone: NomeIcone; titulo: string; texto: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-terracota-claro text-terracota">
        <Icone nome={icone} className="h-6 w-6" />
      </div>
      <h3 className="mb-1 text-base font-semibold">{titulo}</h3>
      <p className="text-sm text-texto-suave">{texto}</p>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { GradeProdutos } from "@/components/loja/CardProduto";
import { CabecalhoSecao, Selo, botaoContorno, botaoPrimario } from "@/components/loja/ui";
import { Icone, type NomeIcone } from "@/components/Icone";
import { categoriasComProdutos, lerConfig, listarProdutos } from "@/lib/catalogo";

export const revalidate = 60;

const PASSOS = [
  ["Escolha seus produtos", "Navegue pela coleção e monte seu pedido do jeitinho que quiser."],
  ["Envie suas fotos", "Ao finalizar o pedido, você sobe as fotos direto aqui no site. Sem bagunça no WhatsApp."],
  ["Pague com Pix", "O pagamento é confirmado na hora e o seu pedido já entra na nossa fila de produção."],
  ["Receba suas lembranças", "Produzimos tudo à mão e enviamos com carinho, ou você retira com a gente."],
];

export default async function Home() {
  const [produtos, categorias, config] = await Promise.all([
    listarProdutos(),
    categoriasComProdutos(),
    lerConfig(),
  ]);
  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));
  const destaques = [...produtos.filter((p) => p.destaque), ...produtos.filter((p) => !p.destaque)].slice(0, 8);
  const banner = config.banner_home;

  return (
    <>
      {/* HERO */}
      <section className="overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Selo>Lembranças personalizadas</Selo>
            <h1 className="text-4xl font-semibold sm:text-5xl">{banner.titulo}</h1>
            <p className="mt-4 max-w-lg text-lg text-texto-suave">{banner.subtitulo}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/produtos" className={botaoPrimario}>
                Escolher meus produtos
              </Link>
              <Link href="#como-funciona" className={botaoContorno}>
                Como funciona
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3.1] overflow-hidden rounded-grande shadow-forte">
            <Image
              src={banner.imagem}
              alt="Polaroids reveladas pela Artes Polaroids"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 540px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      {categorias.length > 1 && (
        <section className="mx-auto max-w-6xl px-4 pb-4">
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

      {/* DESTAQUES */}
      <section className="bg-creme-claro py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <CabecalhoSecao
            selo="Nossa coleção"
            titulo="Escolha sua lembrança"
            subtitulo="Cada peça é produzida com as suas fotos e muito cuidado."
          />
          {destaques.length > 0 ? (
            <GradeProdutos produtos={destaques} nomesCategorias={nomes} />
          ) : (
            <p className="text-center text-texto-suave">Nossa vitrine está sendo arrumada. Volte daqui a pouquinho.</p>
          )}
          <div className="mt-10 text-center">
            <Link href="/produtos" className={botaoContorno}>
              Ver todos os produtos
            </Link>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <CabecalhoSecao
            selo="Simples assim"
            titulo="Como funciona"
            subtitulo={`Do clique de "comprar" até a lembrança na sua mão, sem complicação.`}
          />
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map(([titulo, texto], i) => (
              <li key={titulo} className="rounded-card border border-borda bg-cartao p-6">
                <span className="font-display text-4xl font-bold text-terracota-claro [-webkit-text-stroke:1.5px_var(--color-terracota)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mb-2 mt-3 text-lg font-semibold">{titulo}</h3>
                <p className="text-sm text-texto-suave">{texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl rounded-grande bg-gradient-to-br from-[#7a5c48] to-marrom px-6 py-14 text-center text-creme-claro">
          <h2 className="text-3xl font-semibold text-creme-claro sm:text-4xl">Pronto para eternizar seus momentos?</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">
            Escolha sua lembrança favorita e receba com todo o cuidado que suas memórias merecem.
          </p>
          <Link
            href="/produtos"
            className="mt-8 inline-flex rounded-full bg-creme-claro px-7 py-3.5 font-semibold text-marrom transition hover:-translate-y-0.5"
          >
            Começar meu pedido
          </Link>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="bg-creme-claro py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4">
          <Beneficio icone="camera" titulo="Qualidade premium" texto="Papel fotográfico profissional Fujifilm: à prova d'água, não amarela e não desbota." />
          <Beneficio icone="caminhao" titulo="Enviamos para todo o Brasil" texto="Envio com código de rastreio, ou retirada com a gente." />
          <Beneficio icone="coracao" titulo="Feito com carinho" texto="Cada peça é produzida artesanalmente, com atenção aos detalhes." />
          <Beneficio icone="escudo" titulo="Pagamento seguro" texto="Pix com confirmação automática, processado pelo Mercado Pago." />
        </div>
      </section>
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GradeProdutos } from "@/components/loja/CardProduto";
import { CompraProduto } from "@/components/loja/CompraProduto";
import { Galeria } from "@/components/loja/Galeria";
import { CabecalhoSecao } from "@/components/loja/ui";
import { Icone } from "@/components/Icone";
import { buscarProduto, categoriasComProdutos, lerConfig, listarProdutos } from "@/lib/catalogo";
import { formatarBRL, precoMinimo, temPrecoVariavel } from "@/lib/preco";

export const revalidate = 60;

export async function generateStaticParams() {
  const produtos = await listarProdutos();
  return produtos.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const produto = await buscarProduto(slug);
  if (!produto) return {};
  const preco = `${temPrecoVariavel(produto) ? "A partir de " : ""}${formatarBRL(precoMinimo(produto))}`;
  const descricao = `${produto.descricao_curta} ${preco}`.trim();
  return {
    title: produto.nome,
    description: descricao,
    // Preview bonito quando o link é compartilhado no WhatsApp / Instagram
    openGraph: {
      title: `${produto.nome} · ${preco}`,
      description: produto.descricao_curta,
      images: [{ url: produto.imagens[0], alt: produto.nome }],
      type: "website",
      locale: "pt_BR",
    },
  };
}

export default async function PaginaProduto({ params }: PageProps<"/produto/[slug]">) {
  const { slug } = await params;
  const [produto, produtos, categorias, config] = await Promise.all([
    buscarProduto(slug),
    listarProdutos(),
    categoriasComProdutos(),
    lerConfig(),
  ]);
  if (!produto) notFound();

  const categoria = categorias.find((c) => c.id === produto.categoria_id);
  const prazo = produto.prazo_producao_dias ?? config.prazo_producao.dias_uteis;
  const mesmaCategoria = produtos.filter((p) => p.categoria_id === produto.categoria_id && p.id !== produto.id);
  const relacionados = (mesmaCategoria.length ? mesmaCategoria : produtos.filter((p) => p.id !== produto.id)).slice(0, 4);

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-6">
        <nav aria-label="Você está em" className="mb-6 text-sm text-texto-suave">
          <Link href="/" className="hover:text-texto">Início</Link>
          {" / "}
          {categoria ? (
            <Link href={`/categoria/${categoria.slug}`} className="hover:text-texto">{categoria.nome}</Link>
          ) : (
            <Link href="/produtos" className="hover:text-texto">Produtos</Link>
          )}
          {" / "}
          <span className="text-texto">{produto.nome}</span>
        </nav>

        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          <Galeria imagens={produto.imagens} nome={produto.nome} />

          <div>
            {categoria && (
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-terracota">{categoria.nome}</p>
            )}
            <h1 className="text-3xl font-semibold sm:text-4xl">{produto.nome}</h1>
            <p className="mb-5 mt-3 text-texto-suave">{produto.descricao_curta}</p>

            <CompraProduto produto={produto} />

            {/* Prazos (regra 6.1) e política de troca de personalizados (regra 4.4) visíveis ANTES da compra */}
            <ul className="mt-6 space-y-2.5 border-t border-borda pt-5 text-sm text-texto-suave">
              {prazo > 0 && (
                <li className="flex items-start gap-2">
                  <Icone nome="relogio" className="mt-0.5 h-4 w-4 shrink-0 text-terracota" />
                  <span>Produção em até <strong className="text-texto">{prazo} dias úteis</strong> + prazo de envio</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <Icone nome="caminhao" className="mt-0.5 h-4 w-4 shrink-0 text-terracota" />
                <span>Envio para todo o Brasil ou retirada combinada</span>
              </li>
              {produto.requer_fotos_cliente && (
                <li className="flex items-start gap-2">
                  <Icone nome="coracao" className="mt-0.5 h-4 w-4 shrink-0 text-terracota" />
                  <span>Produto personalizado: troca apenas em caso de defeito de produção</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {produto.descricao && (
          <div className="mt-12 rounded-grande border border-borda bg-cartao p-6 sm:p-8">
            <h2 className="mb-4 text-2xl font-semibold">Detalhes do produto</h2>
            <div className="space-y-3 text-texto-suave">
              {produto.descricao
                .split("\n")
                .filter((l) => l.trim())
                .map((paragrafo, i) => (
                  <p key={i}>{paragrafo}</p>
                ))}
            </div>
          </div>
        )}
      </section>

      {relacionados.length > 0 && (
        <section className="bg-creme-claro py-16">
          <div className="mx-auto max-w-6xl px-4">
            <CabecalhoSecao selo="Você também pode gostar" titulo="Outras lembranças" />
            <GradeProdutos produtos={relacionados} />
          </div>
        </section>
      )}
    </>
  );
}

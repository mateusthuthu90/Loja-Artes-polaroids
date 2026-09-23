import Link from "next/link";
import { CardProduto, GradeProdutos } from "@/components/loja/CardProduto";
import { TrilhoProdutos } from "@/components/loja/TrilhoProdutos";
import { CabecalhoSecao } from "@/components/loja/ui";
import type { SecaoResolvida } from "@/lib/types";

/**
 * Uma faixa de produtos da home, montada no painel (Home → Seções).
 * Seção sem produto nunca chega aqui: lib/home.ts já a descarta.
 */
export function SecaoProdutos({
  secao,
  nomesCategorias,
}: {
  secao: SecaoResolvida;
  nomesCategorias?: Map<string, string>;
}) {
  const verMais = secao.link_texto.trim() && secao.link_href.trim();

  return (
    <section className={`py-14 sm:py-20 ${secao.fundo === "claro" ? "bg-creme-claro" : ""}`}>
      <div className="mx-auto max-w-6xl px-4">
        <CabecalhoSecao
          selo={secao.selo}
          titulo={secao.titulo}
          subtitulo={secao.subtitulo || undefined}
        />

        {secao.layout === "grade" ? (
          <GradeProdutos produtos={secao.produtos} nomesCategorias={nomesCategorias} />
        ) : (
          <TrilhoProdutos rotulo={secao.titulo}>
            {secao.produtos.map((p) => (
              <CardProduto key={p.id} produto={p} categoria={nomesCategorias?.get(p.categoria_id)} />
            ))}
          </TrilhoProdutos>
        )}

        {verMais && (
          <div className="mt-10 text-center">
            <Link
              href={secao.link_href}
              className="inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] border-borda px-7 py-3.5 text-[0.95rem] font-semibold text-texto transition hover:border-terracota hover:bg-cartao"
            >
              {secao.link_texto}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

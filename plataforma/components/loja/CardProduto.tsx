import Image from "next/image";
import Link from "next/link";
import { descontosPorQuantidade, esgotado, formatarBRL, precoMinimo, temPrecoVariavel } from "@/lib/preco";
import type { Produto } from "@/lib/types";

export function CardProduto({ produto, categoria }: { produto: Produto; categoria?: string }) {
  const [foto1, foto2] = produto.imagens;
  const semEstoque = esgotado(produto);
  const padrao = Object.fromEntries(produto.opcoes.map((g) => [g.nome, g.valores[0]?.label ?? ""]));
  const maiorDesconto = Math.max(0, ...(descontosPorQuantidade(produto, padrao)?.opcoes.map((o) => o.percentual) ?? []));

  return (
    <Link
      href={`/produto/${produto.slug}`}
      className="group flex flex-col overflow-hidden rounded-card border border-borda bg-cartao transition hover:-translate-y-1 hover:shadow-media"
    >
      <div className="relative aspect-[1/0.92] overflow-hidden bg-terracota-claro">
        <Image
          src={foto1}
          alt={produto.nome}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          className="object-cover"
        />
        {foto2 && (
          // segunda foto aparece ao passar o mouse (crossfade)
          <Image
            src={foto2}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
        {semEstoque ? (
          <span className="absolute left-3 top-3 rounded-full bg-texto px-2.5 py-1 text-[0.68rem] font-bold text-creme-claro">
            Esgotado
          </span>
        ) : (
          produto.novo && (
            <span className="absolute left-3 top-3 rounded-full bg-dourado px-2.5 py-1 text-[0.68rem] font-bold text-[#3a2b0f]">
              Novidade
            </span>
          )
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {categoria && (
          <span className="mb-1 text-[0.68rem] font-bold uppercase tracking-wider text-texto-fraco">
            {categoria}
          </span>
        )}
        <h3 className="text-base font-semibold sm:text-lg">{produto.nome}</h3>
        <div className="mt-1 hidden text-sm text-texto-suave sm:block">
          <p className="line-clamp-2">{produto.descricao_curta}</p>
        </div>
        <p className="mt-auto pt-3 font-display text-lg font-bold text-marrom sm:text-xl">
          {temPrecoVariavel(produto) && (
            <span className="mr-1 font-sans text-xs font-medium text-texto-suave">A partir de</span>
          )}
          {formatarBRL(precoMinimo(produto))}
          {maiorDesconto > 0 && (
            <span className="ml-2 whitespace-nowrap rounded-full bg-sucesso-claro px-2 py-0.5 align-middle font-sans text-[0.68rem] font-bold text-sucesso">
              até -{maiorDesconto}%
            </span>
          )}
        </p>
        <span className="mt-3 rounded-full bg-marrom py-2 text-center text-sm font-semibold text-creme-claro transition group-hover:bg-texto">
          {semEstoque ? "Ver produto" : "Comprar"}
        </span>
      </div>
    </Link>
  );
}

export function GradeProdutos({
  produtos,
  nomesCategorias,
}: {
  produtos: Produto[];
  nomesCategorias?: Map<string, string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {produtos.map((p) => (
        <CardProduto key={p.id} produto={p} categoria={nomesCategorias?.get(p.categoria_id)} />
      ))}
    </div>
  );
}

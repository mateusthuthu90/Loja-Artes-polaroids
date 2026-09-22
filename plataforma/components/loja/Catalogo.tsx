import Link from "next/link";
import type { Categoria, Produto } from "@/lib/types";
import { GradeProdutos } from "./CardProduto";
import { Selo } from "./ui";

// Listagem usada em /produtos (todas) e /categoria/[slug] (filtrada).
export function Catalogo({
  titulo,
  produtos,
  categorias,
  ativa,
}: {
  titulo: string;
  produtos: Produto[];
  categorias: Categoria[];
  ativa?: string;
}) {
  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));
  const pill = (selecionada: boolean) =>
    `shrink-0 rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition ${
      selecionada
        ? "border-terracota bg-terracota-claro text-marrom"
        : "border-borda bg-cartao hover:border-terracota"
    }`;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-8 text-center">
        <Selo>Nossa coleção</Selo>
        <h1 className="text-3xl font-semibold sm:text-4xl">{titulo}</h1>
      </div>

      {/* no celular as categorias rolam para o lado, sem quebrar em várias linhas */}
      <nav className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:flex-wrap sm:justify-center">
        <Link href="/produtos" className={pill(!ativa)}>
          Todos
        </Link>
        {categorias.map((c) => (
          <Link key={c.id} href={`/categoria/${c.slug}`} className={pill(ativa === c.slug)}>
            {c.nome}
          </Link>
        ))}
      </nav>

      {produtos.length > 0 ? (
        <GradeProdutos produtos={produtos} nomesCategorias={ativa ? undefined : nomes} />
      ) : (
        <p className="py-16 text-center text-texto-suave">
          Nenhum produto por aqui ainda. Dá uma olhada nas outras categorias.
        </p>
      )}
    </section>
  );
}

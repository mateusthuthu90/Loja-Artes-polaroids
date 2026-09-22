import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Catalogo } from "@/components/loja/Catalogo";
import { categoriasComProdutos, listarProdutos } from "@/lib/catalogo";

export const revalidate = 60;

export async function generateStaticParams() {
  const categorias = await categoriasComProdutos();
  return categorias.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/categoria/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const categoria = (await categoriasComProdutos()).find((c) => c.slug === slug);
  if (!categoria) return {};
  return {
    title: categoria.nome,
    description: `${categoria.nome} personalizados com as suas fotos, feitos à mão pela Artes Polaroids.`,
  };
}

export default async function PaginaCategoria({ params }: PageProps<"/categoria/[slug]">) {
  const { slug } = await params;
  const [categorias, produtos] = await Promise.all([categoriasComProdutos(), listarProdutos()]);
  const categoria = categorias.find((c) => c.slug === slug);
  if (!categoria) notFound();

  return (
    <Catalogo
      titulo={categoria.nome}
      produtos={produtos.filter((p) => p.categoria_id === categoria.id)}
      categorias={categorias}
      ativa={categoria.slug}
    />
  );
}

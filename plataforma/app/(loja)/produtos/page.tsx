import type { Metadata } from "next";
import { Catalogo } from "@/components/loja/Catalogo";
import { categoriasComProdutos, listarProdutos } from "@/lib/catalogo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Todos os produtos",
  description: "Polaroids, quadros e presentes personalizados com as suas fotos.",
};

export default async function PaginaProdutos() {
  const [produtos, categorias] = await Promise.all([listarProdutos(), categoriasComProdutos()]);
  return <Catalogo titulo="Todos os produtos" produtos={produtos} categorias={categorias} />;
}

import type { Metadata } from "next";
import { VisaoCarrinho } from "@/components/loja/VisaoCarrinho";
import { lerConfig, listarProdutos } from "@/lib/catalogo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false },
};

export default async function PaginaCarrinho() {
  const [produtos, config] = await Promise.all([listarProdutos(), lerConfig()]);
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-semibold sm:text-4xl">Seu carrinho</h1>
      <VisaoCarrinho produtos={produtos} frete={config.frete} lojaAberta={config.loja.aberta} />
    </section>
  );
}

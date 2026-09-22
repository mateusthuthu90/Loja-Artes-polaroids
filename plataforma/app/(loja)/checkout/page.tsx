import type { Metadata } from "next";
import { Checkout } from "@/components/loja/checkout/Checkout";
import { lerConfig, listarProdutos } from "@/lib/catalogo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Finalizar pedido",
  robots: { index: false },
};

export default async function PaginaCheckout() {
  const [produtos, config] = await Promise.all([listarProdutos(), lerConfig()]);
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <h1 className="mb-6 text-3xl font-semibold sm:text-4xl">Finalizar pedido</h1>
      <Checkout produtos={produtos} config={config} />
    </section>
  );
}

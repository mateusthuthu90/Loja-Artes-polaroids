import { notFound } from "next/navigation";
import { FormProduto } from "@/components/admin/FormProduto";
import { exigirAdmin } from "@/lib/admin/sessao";
import { deBanco } from "@/lib/produto-form";
import type { Categoria, Produto } from "@/lib/types";

export const metadata = { title: "Editar produto" };

const REGEX_UUID = /^[0-9a-f-]{36}$/;

export default async function EditarProduto({ params, searchParams }: PageProps<"/admin/produtos/[id]">) {
  const { id } = await params;
  const { salvo } = await searchParams;
  if (!REGEX_UUID.test(id)) notFound();

  const { supabase } = await exigirAdmin();
  const [{ data: produto }, { data: categorias }] = await Promise.all([
    supabase.from("produtos").select("*").eq("id", id).maybeSingle(),
    supabase.from("categorias").select("*").order("ordem"),
  ]);
  if (!produto) notFound();
  const p = produto as Produto;

  return (
    <FormProduto
      inicial={deBanco(p)}
      categorias={(categorias ?? []) as Categoria[]}
      statusSalvo={p.status}
      precoSalvo={Number(p.preco)}
      mensagemInicial={salvo ? "Produto criado!" : null}
    />
  );
}

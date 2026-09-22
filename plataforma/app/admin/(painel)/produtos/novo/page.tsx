import { FormProduto } from "@/components/admin/FormProduto";
import { exigirAdmin } from "@/lib/admin/sessao";
import { PRODUTO_VAZIO } from "@/lib/produto-form";
import type { Categoria } from "@/lib/types";

export const metadata = { title: "Novo produto" };

export default async function NovoProduto() {
  const { supabase } = await exigirAdmin();
  const { data } = await supabase.from("categorias").select("*").order("ordem");
  return <FormProduto inicial={PRODUTO_VAZIO} categorias={(data ?? []) as Categoria[]} statusSalvo={null} precoSalvo={null} />;
}

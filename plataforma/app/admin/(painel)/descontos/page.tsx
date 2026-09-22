import { GerenciarDescontos } from "@/components/admin/GerenciarDescontos";
import { exigirAdmin } from "@/lib/admin/sessao";
import type { Categoria, Cupom, Produto, Promocao } from "@/lib/types";

export const metadata = { title: "Descontos" };

export default async function PaginaDescontos() {
  const { supabase } = await exigirAdmin();
  const [{ data: cupons }, { data: promocoes }, { data: categorias }, { data: produtos }] = await Promise.all([
    supabase.from("cupons").select("*").order("criado_em", { ascending: false }),
    supabase.from("promocoes").select("*").order("criado_em", { ascending: false }),
    supabase.from("categorias").select("*").order("ordem"),
    supabase.from("produtos").select("id, nome").neq("status", "inativo").order("nome"),
  ]);

  return (
    <GerenciarDescontos
      cupons={(cupons ?? []) as Cupom[]}
      promocoes={(promocoes ?? []) as Promocao[]}
      categorias={(categorias ?? []) as Categoria[]}
      produtos={(produtos ?? []) as Pick<Produto, "id" | "nome">[]}
    />
  );
}

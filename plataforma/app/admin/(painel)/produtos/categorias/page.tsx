import Link from "next/link";
import { exigirAdmin } from "@/lib/admin/sessao";
import type { Categoria } from "@/lib/types";
import { GerenciarCategorias } from "./GerenciarCategorias";

export const metadata = { title: "Categorias" };

export default async function PaginaCategorias() {
  const { supabase } = await exigirAdmin();
  const [{ data: categorias }, { data: produtos }] = await Promise.all([
    supabase.from("categorias").select("*").order("ordem"),
    supabase.from("produtos").select("categoria_id, status"),
  ]);
  const contagem: Record<string, number> = {};
  for (const p of produtos ?? []) if (p.status === "publicado") contagem[p.categoria_id] = (contagem[p.categoria_id] ?? 0) + 1;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/produtos" className="text-sm text-texto-suave hover:text-texto">← Produtos</Link>
      <h1 className="mb-1 mt-3 text-3xl font-semibold">Categorias</h1>
      <p className="mb-5 text-sm text-texto-suave">
        A ordem aqui é a ordem do menu da loja. Categoria sem produto publicado não aparece no menu.
      </p>
      <GerenciarCategorias categorias={(categorias ?? []) as Categoria[]} contagem={contagem} />
    </div>
  );
}

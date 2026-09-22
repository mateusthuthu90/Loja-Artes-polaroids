import Image from "next/image";
import Link from "next/link";
import { exigirAdmin } from "@/lib/admin/sessao";
import { formatarBRL, precoMinimo, temPrecoVariavel } from "@/lib/preco";
import type { Produto, StatusProduto } from "@/lib/types";
import { EmBreve } from "../EmBreve";

export const metadata = { title: "Produtos" };

const ROTULO: Record<StatusProduto, { texto: string; cor: string }> = {
  publicado: { texto: "Publicado", cor: "bg-sucesso-claro text-sucesso" },
  rascunho: { texto: "Rascunho", cor: "bg-dourado-claro text-marrom" },
  inativo: { texto: "Inativo", cor: "bg-creme text-texto-suave" },
};

export default async function PaginaProdutos() {
  const { supabase } = await exigirAdmin();
  const [{ data: produtos }, { data: categorias }] = await Promise.all([
    supabase.from("produtos").select("*").order("ordem"),
    supabase.from("categorias").select("id, nome"),
  ]);
  const nomes = new Map((categorias ?? []).map((c) => [c.id, c.nome]));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-3xl font-semibold">Produtos</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {((produtos ?? []) as Produto[]).map((p) => (
          <li key={p.id} className="flex gap-3 rounded-card border border-borda bg-cartao p-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-terracota-claro">
              {p.imagens[0] ? (
                <Image src={p.imagens[0]} alt={p.nome} fill sizes="80px" className="object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-[0.65rem] text-texto-suave">sem foto</span>
              )}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-tight">{p.nome}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${ROTULO[p.status].cor}`}>
                  {ROTULO[p.status].texto}
                </span>
              </div>
              <p className="text-xs text-texto-suave">{nomes.get(p.categoria_id)}</p>
              <p className="mt-1 font-semibold text-marrom">
                {temPrecoVariavel(p) && <span className="mr-1 text-xs font-normal text-texto-suave">a partir de</span>}
                {formatarBRL(precoMinimo(p))}
              </p>
              <p className="text-xs text-texto-fraco">
                {p.estoque === null ? "Sob demanda" : `Estoque: ${p.estoque}`}
                {p.requer_fotos_cliente && " · pede fotos do cliente"}
              </p>
              {p.status === "publicado" && (
                <Link href={`/produto/${p.slug}`} target="_blank" className="text-xs text-terracota hover:underline">
                  Ver na loja ↗
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      <EmBreve etapa="Prompt 10">
        Criar e editar produtos, enviar fotos de divulgação, variações com acréscimo de preço,
        publicar/despublicar com pré-visualização, duplicar produto e gerenciar categorias.
      </EmBreve>
    </div>
  );
}

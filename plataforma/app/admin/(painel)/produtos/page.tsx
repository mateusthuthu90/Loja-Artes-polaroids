import Image from "next/image";
import Link from "next/link";
import { exigirAdmin } from "@/lib/admin/sessao";
import { formatarBRL, precoMinimo, temPrecoVariavel } from "@/lib/preco";
import type { Produto, StatusProduto } from "@/lib/types";
import { AcoesProduto } from "./AcoesProduto";

export const metadata = { title: "Produtos" };

const ROTULO: Record<StatusProduto, { texto: string; cor: string }> = {
  publicado: { texto: "Publicado", cor: "bg-sucesso-claro text-sucesso" },
  rascunho: { texto: "Rascunho", cor: "bg-dourado-claro text-marrom" },
  inativo: { texto: "Inativo", cor: "bg-creme text-texto-suave" },
};

export default async function PaginaProdutos({ searchParams }: PageProps<"/admin/produtos">) {
  const { supabase } = await exigirAdmin();
  const sp = await searchParams;
  const busca = typeof sp.q === "string" ? sp.q.trim() : "";
  const categoria = typeof sp.cat === "string" ? sp.cat : "";
  const status = typeof sp.status === "string" && sp.status in ROTULO ? (sp.status as StatusProduto) : null;

  let consulta = supabase.from("produtos").select("*").order("ordem").order("nome");
  if (busca) consulta = consulta.ilike("nome", `%${busca.replace(/[%_,()]/g, " ")}%`);
  if (categoria) consulta = consulta.eq("categoria_id", categoria);
  if (status) consulta = consulta.eq("status", status);

  const [{ data: produtos }, { data: categorias }] = await Promise.all([
    consulta,
    supabase.from("categorias").select("id, nome").order("ordem"),
  ]);
  const nomes = new Map((categorias ?? []).map((c) => [c.id, c.nome]));
  const lista = (produtos ?? []) as Produto[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Produtos</h1>
        <div className="flex gap-2">
          <Link href="/admin/produtos/categorias" className="rounded-full border border-borda px-4 py-2.5 text-sm font-semibold hover:border-terracota">
            Categorias
          </Link>
          <Link href="/admin/produtos/novo" className="rounded-full bg-marrom px-5 py-2.5 text-sm font-semibold text-creme-claro hover:bg-texto">
            + Novo produto
          </Link>
        </div>
      </div>

      {/* Filtros (formulário GET: funciona sem JavaScript) */}
      <form className="mb-5 flex flex-wrap gap-2">
        <input name="q" defaultValue={busca} placeholder="Buscar por nome…" className="min-w-0 flex-1 rounded-xl border-[1.5px] border-borda bg-white px-3 py-2 text-sm outline-none focus:border-terracota" />
        <select name="cat" defaultValue={categoria} className="rounded-xl border-[1.5px] border-borda bg-white px-3 py-2 text-sm">
          <option value="">Todas as categorias</option>
          {(categorias ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select name="status" defaultValue={status ?? ""} className="rounded-xl border-[1.5px] border-borda bg-white px-3 py-2 text-sm">
          <option value="">Qualquer situação</option>
          <option value="publicado">Publicados</option>
          <option value="rascunho">Rascunhos</option>
          <option value="inativo">Inativos</option>
        </select>
        <button className="rounded-xl bg-terracota-claro px-4 py-2 text-sm font-semibold text-marrom">Filtrar</button>
      </form>

      {lista.length === 0 ? (
        <p className="rounded-grande border border-borda bg-cartao p-10 text-center text-texto-suave">Nenhum produto encontrado.</p>
      ) : (
        <ul className="space-y-2">
          {lista.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-card border border-borda bg-cartao p-3">
              <Link href={`/admin/produtos/${p.id}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-terracota-claro">
                {p.imagens[0] ? (
                  <Image src={p.imagens[0]} alt={p.nome} fill sizes="64px" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-[0.6rem] text-texto-suave">sem foto</span>
                )}
              </Link>
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/produtos/${p.id}`} className="font-semibold hover:text-marrom">{p.nome}</Link>
                  <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${ROTULO[p.status].cor}`}>{ROTULO[p.status].texto}</span>
                  {p.destaque && <span className="text-xs" title="Destaque na home">⭐</span>}
                </div>
                <p className="text-xs text-texto-suave">
                  {nomes.get(p.categoria_id)} · {temPrecoVariavel(p) && "a partir de "}{formatarBRL(precoMinimo(p))} ·{" "}
                  {p.estoque === null ? "sob demanda" : `estoque ${p.estoque}`}
                </p>
                {p.status === "rascunho" && (p.imagens.length === 0 || !p.descricao.trim()) && (
                  <p className="text-xs text-perigo">Falta {p.imagens.length === 0 ? "foto" : "descrição"} para publicar</p>
                )}
              </div>
              <AcoesProduto id={p.id} nome={p.nome} status={p.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

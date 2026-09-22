"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { exigirAdmin } from "@/lib/admin/sessao";
import { registrarAcao } from "@/lib/admin/log";
import { TAG_CATALOGO } from "@/lib/catalogo";
import { gerarSlug, paraBanco, validarProduto, type ErrosProduto, type ProdutoForm } from "@/lib/produto-form";
import type { StatusProduto } from "@/lib/types";

export type Resultado = { ok: true; id?: string } | { ok: false; erros: ErrosProduto };

/** Loja mostra a mudança na hora (sem esperar o cache de 60s). */
function atualizarLoja() {
  revalidateTag(TAG_CATALOGO, { expire: 0 });
  revalidatePath("/", "layout");
}

function erroDoBanco(error: { code?: string; message: string }): ErrosProduto {
  if (error.code === "23505") return { slug: "Já existe um produto com esse endereço (slug). Mude o nome ou o slug." };
  if (error.message.includes("produtos_publicado_completo"))
    return { geral: "Para publicar, o produto precisa de ao menos 1 foto e da descrição." };
  console.error("[produtos] erro do banco:", error);
  return { geral: "Não foi possível salvar. Tente de novo." };
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------
export async function salvarProduto(form: ProdutoForm): Promise<Resultado> {
  const { supabase, user } = await exigirAdmin();
  const erros = validarProduto(form);
  if (Object.keys(erros).length) return { ok: false, erros };

  const dados = paraBanco(form);

  if (form.id) {
    const { data: antes } = await supabase.from("produtos").select("preco, status").eq("id", form.id).maybeSingle();
    const { error } = await supabase.from("produtos").update(dados).eq("id", form.id);
    if (error) return { ok: false, erros: erroDoBanco(error) };
    const mudancas: Record<string, unknown> = {};
    if (antes && Number(antes.preco) !== dados.preco) mudancas.preco = { de: Number(antes.preco), para: dados.preco };
    if (antes && antes.status !== dados.status) mudancas.status = { de: antes.status, para: dados.status };
    await registrarAcao(user.id, "produto.editar", "produto", form.id, { nome: dados.nome, ...mudancas });
    atualizarLoja();
    return { ok: true, id: form.id };
  }

  const { data, error } = await supabase.from("produtos").insert(dados).select("id").single();
  if (error) return { ok: false, erros: erroDoBanco(error) };
  await registrarAcao(user.id, "produto.criar", "produto", data.id, { nome: dados.nome, status: dados.status });
  atualizarLoja();
  return { ok: true, id: data.id };
}

export async function alterarStatusProduto(id: string, status: StatusProduto): Promise<Resultado> {
  const { supabase, user } = await exigirAdmin();
  const { error } = await supabase.from("produtos").update({ status }).eq("id", id);
  if (error) return { ok: false, erros: erroDoBanco(error) };
  await registrarAcao(user.id, `produto.${status === "publicado" ? "publicar" : status === "rascunho" ? "despublicar" : "desativar"}`, "produto", id);
  atualizarLoja();
  return { ok: true };
}

export async function duplicarProduto(id: string): Promise<Resultado> {
  const { supabase, user } = await exigirAdmin();
  const { data: original } = await supabase.from("produtos").select("*").eq("id", id).single();
  if (!original) return { ok: false, erros: { geral: "Produto não encontrado" } };

  // slug livre: nome-copia, nome-copia-2, ...
  const base = gerarSlug(`${original.slug}-copia`);
  const { data: existentes } = await supabase.from("produtos").select("slug").like("slug", `${base}%`);
  const usados = new Set((existentes ?? []).map((p) => p.slug));
  let slug = base;
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;

  // copia tudo menos identificador e datas (o banco gera novos)
  const resto = { ...original };
  delete resto.id;
  delete resto.criado_em;
  delete resto.atualizado_em;
  const { data, error } = await supabase
    .from("produtos")
    .insert({ ...resto, nome:`${original.nome} (cópia)`.slice(0, 80), slug, status: "rascunho", destaque: false })
    .select("id")
    .single();
  if (error) return { ok: false, erros: erroDoBanco(error) };
  await registrarAcao(user.id, "produto.duplicar", "produto", data.id, { origem: id });
  atualizarLoja();
  return { ok: true, id: data.id };
}

/** Regra 8.3: produto com pedidos nunca é apagado — vira inativo. */
export async function excluirProduto(id: string): Promise<Resultado & { desativado?: boolean }> {
  const { supabase, user } = await exigirAdmin();
  const { count } = await supabase.from("pedido_itens").select("id", { count: "exact", head: true }).eq("produto_id", id);

  if ((count ?? 0) > 0) {
    const { error } = await supabase.from("produtos").update({ status: "inativo" }).eq("id", id);
    if (error) return { ok: false, erros: erroDoBanco(error) };
    await registrarAcao(user.id, "produto.desativar", "produto", id, { motivo: "excluir com pedidos vinculados" });
    atualizarLoja();
    return { ok: true, desativado: true };
  }

  const { data: produto } = await supabase.from("produtos").select("nome").eq("id", id).maybeSingle();
  const { error } = await supabase.from("produtos").delete().eq("id", id);
  if (error) return { ok: false, erros: erroDoBanco(error) };
  await registrarAcao(user.id, "produto.excluir", "produto", id, { nome: produto?.nome });
  atualizarLoja();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------
export async function salvarCategoria(id: string | null, nome: string): Promise<Resultado> {
  const { supabase, user } = await exigirAdmin();
  const limpo = nome.replace(/<[^>]*>/g, "").trim();
  if (!limpo || limpo.length > 60) return { ok: false, erros: { geral: "Nome da categoria inválido (1 a 60 caracteres)" } };

  if (id) {
    const { error } = await supabase.from("categorias").update({ nome: limpo }).eq("id", id);
    if (error) return { ok: false, erros: { geral: "Não foi possível renomear" } };
    await registrarAcao(user.id, "categoria.renomear", "categoria", id, { nome: limpo });
    atualizarLoja();
    return { ok: true, id };
  }

  const { data: ultima } = await supabase.from("categorias").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("categorias")
    .insert({ nome: limpo, slug: gerarSlug(limpo), ordem: (ultima?.ordem ?? 0) + 1 })
    .select("id")
    .single();
  if (error) {
    return { ok: false, erros: { geral: error.code === "23505" ? "Já existe uma categoria com esse nome" : "Não foi possível criar" } };
  }
  await registrarAcao(user.id, "categoria.criar", "categoria", data.id, { nome: limpo });
  atualizarLoja();
  return { ok: true, id: data.id };
}

export async function alternarCategoria(id: string, ativa: boolean): Promise<Resultado> {
  const { supabase, user } = await exigirAdmin();
  const { error } = await supabase.from("categorias").update({ ativa }).eq("id", id);
  if (error) return { ok: false, erros: { geral: "Não foi possível alterar" } };
  await registrarAcao(user.id, ativa ? "categoria.ativar" : "categoria.ocultar", "categoria", id);
  atualizarLoja();
  return { ok: true };
}

export async function moverCategoria(id: string, direcao: -1 | 1): Promise<Resultado> {
  const { supabase } = await exigirAdmin();
  const { data: todas } = await supabase.from("categorias").select("id, ordem").order("ordem");
  const lista = todas ?? [];
  const i = lista.findIndex((c) => c.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return { ok: true };
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await Promise.all(lista.map((c, ordem) => supabase.from("categorias").update({ ordem: ordem + 1 }).eq("id", c.id)));
  atualizarLoja();
  return { ok: true };
}

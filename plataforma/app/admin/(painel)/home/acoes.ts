"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { exigirAdmin } from "@/lib/admin/sessao";
import { registrarAcao } from "@/lib/admin/log";
import { TAG_CATALOGO } from "@/lib/catalogo";
import { TAG_HOME } from "@/lib/home";
import {
  bannerParaBanco,
  secaoParaBanco,
  textosParaBanco,
  validarBanner,
  validarSecao,
  validarTextos,
  type BannerForm,
  type ErrosBanner,
  type ErrosSecao,
  type SecaoForm,
} from "@/lib/home-form";
import type { TextosHome } from "@/lib/types";

export type ResultadoBanner = { ok: true; id?: string } | { ok: false; erros: ErrosBanner };
export type ResultadoSecao = { ok: true; id?: string } | { ok: false; erros: ErrosSecao };
export type ResultadoSimples = { ok: true } | { ok: false; erro: string };

/** A home mostra a mudança na hora, sem esperar o cache de 60s. */
function atualizarHome() {
  revalidateTag(TAG_HOME, { expire: 0 });
  revalidateTag(TAG_CATALOGO, { expire: 0 });
  revalidatePath("/", "layout");
}

function erroDoBanco(error: { code?: string; message: string }, onde: string): string {
  if (error.message.includes("home_secoes_categoria_exige_alvo")) return "Escolha a categoria desta seção.";
  if (error.message.includes("home_secoes_manual_exige_produtos")) return "Escolha ao menos um produto.";
  console.error(`[home] erro do banco (${onde}):`, error);
  return "Não foi possível salvar. Tente de novo.";
}

/** Próxima posição da lista, para o item novo entrar no fim. */
async function proximaOrdem(
  supabase: Awaited<ReturnType<typeof exigirAdmin>>["supabase"],
  tabela: "home_banners" | "home_secoes",
): Promise<number> {
  const { data } = await supabase.from(tabela).select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
  return (data?.ordem ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

export async function salvarBanner(form: BannerForm): Promise<ResultadoBanner> {
  const { supabase, user } = await exigirAdmin();
  const erros = validarBanner(form);
  if (Object.keys(erros).length) return { ok: false, erros };

  const dados = bannerParaBanco(form);

  if (form.id) {
    const { error } = await supabase.from("home_banners").update(dados).eq("id", form.id);
    if (error) return { ok: false, erros: { geral: erroDoBanco(error, "salvar banner") } };
    await registrarAcao(user.id, "home.banner.editar", "home_banner", form.id, { titulo: dados.titulo });
    atualizarHome();
    return { ok: true, id: form.id };
  }

  const ordem = await proximaOrdem(supabase, "home_banners");
  const { data, error } = await supabase.from("home_banners").insert({ ...dados, ordem }).select("id").single();
  if (error) return { ok: false, erros: { geral: erroDoBanco(error, "criar banner") } };
  await registrarAcao(user.id, "home.banner.criar", "home_banner", data.id, { titulo: dados.titulo });
  atualizarHome();
  return { ok: true, id: data.id };
}

export async function alternarBanner(id: string, ativo: boolean): Promise<ResultadoSimples> {
  const { supabase, user } = await exigirAdmin();

  // último banner no ar: desligar deixaria a home sem hero
  if (!ativo) {
    const { count } = await supabase.from("home_banners").select("id", { count: "exact", head: true }).eq("ativo", true);
    if ((count ?? 0) <= 1) {
      return { ok: false, erro: "Este é o único banner no ar. Crie ou ligue outro antes de desligar este." };
    }
  }

  const { error } = await supabase.from("home_banners").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: erroDoBanco(error, "alternar banner") };
  await registrarAcao(user.id, ativo ? "home.banner.ligar" : "home.banner.desligar", "home_banner", id);
  atualizarHome();
  return { ok: true };
}

export async function excluirBanner(id: string): Promise<ResultadoSimples> {
  const { supabase, user } = await exigirAdmin();
  const { count } = await supabase.from("home_banners").select("id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) return { ok: false, erro: "A home precisa de pelo menos um banner. Crie outro antes de apagar este." };

  const { data: banner } = await supabase.from("home_banners").select("titulo").eq("id", id).maybeSingle();
  const { error } = await supabase.from("home_banners").delete().eq("id", id);
  if (error) return { ok: false, erro: erroDoBanco(error, "excluir banner") };
  await registrarAcao(user.id, "home.banner.excluir", "home_banner", id, { titulo: banner?.titulo });
  atualizarHome();
  return { ok: true };
}

export async function moverBanner(id: string, direcao: -1 | 1): Promise<ResultadoSimples> {
  return reordenar("home_banners", id, direcao, "home.banner.reordenar");
}

// ---------------------------------------------------------------------------
// Seções
// ---------------------------------------------------------------------------

export async function salvarSecao(form: SecaoForm): Promise<ResultadoSecao> {
  const { supabase, user } = await exigirAdmin();
  const erros = validarSecao(form);
  if (Object.keys(erros).length) return { ok: false, erros };

  const dados = secaoParaBanco(form);

  if (form.id) {
    const { error } = await supabase.from("home_secoes").update(dados).eq("id", form.id);
    if (error) return { ok: false, erros: { geral: erroDoBanco(error, "salvar seção") } };
    await registrarAcao(user.id, "home.secao.editar", "home_secao", form.id, { titulo: dados.titulo, fonte: dados.fonte });
    atualizarHome();
    return { ok: true, id: form.id };
  }

  const ordem = await proximaOrdem(supabase, "home_secoes");
  const { data, error } = await supabase.from("home_secoes").insert({ ...dados, ordem }).select("id").single();
  if (error) return { ok: false, erros: { geral: erroDoBanco(error, "criar seção") } };
  await registrarAcao(user.id, "home.secao.criar", "home_secao", data.id, { titulo: dados.titulo, fonte: dados.fonte });
  atualizarHome();
  return { ok: true, id: data.id };
}

export async function alternarSecao(id: string, ativa: boolean): Promise<ResultadoSimples> {
  const { supabase, user } = await exigirAdmin();
  const { error } = await supabase.from("home_secoes").update({ ativa }).eq("id", id);
  if (error) return { ok: false, erro: erroDoBanco(error, "alternar seção") };
  await registrarAcao(user.id, ativa ? "home.secao.ligar" : "home.secao.desligar", "home_secao", id);
  atualizarHome();
  return { ok: true };
}

export async function excluirSecao(id: string): Promise<ResultadoSimples> {
  const { supabase, user } = await exigirAdmin();
  const { data: secao } = await supabase.from("home_secoes").select("titulo").eq("id", id).maybeSingle();
  const { error } = await supabase.from("home_secoes").delete().eq("id", id);
  if (error) return { ok: false, erro: erroDoBanco(error, "excluir seção") };
  await registrarAcao(user.id, "home.secao.excluir", "home_secao", id, { titulo: secao?.titulo });
  atualizarHome();
  return { ok: true };
}

export async function moverSecao(id: string, direcao: -1 | 1): Promise<ResultadoSimples> {
  return reordenar("home_secoes", id, direcao, "home.secao.reordenar");
}

/** Troca o item de lugar com o vizinho e renumera a lista inteira. */
async function reordenar(
  tabela: "home_banners" | "home_secoes",
  id: string,
  direcao: -1 | 1,
  acao: string,
): Promise<ResultadoSimples> {
  const { supabase, user } = await exigirAdmin();
  const { data: todos, error } = await supabase.from(tabela).select("id, ordem").order("ordem").order("criado_em");
  if (error) return { ok: false, erro: erroDoBanco(error, "reordenar") };

  const lista = todos ?? [];
  const i = lista.findIndex((x) => x.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return { ok: true }; // já está na ponta

  [lista[i], lista[j]] = [lista[j], lista[i]];
  const falhas = await Promise.all(
    lista.map((x, ordem) => supabase.from(tabela).update({ ordem: ordem + 1 }).eq("id", x.id)),
  );
  const falhou = falhas.find((r) => r.error);
  if (falhou?.error) return { ok: false, erro: erroDoBanco(falhou.error, "reordenar") };

  await registrarAcao(user.id, acao, tabela === "home_banners" ? "home_banner" : "home_secao", id);
  atualizarHome();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Textos das seções fixas
// ---------------------------------------------------------------------------

export async function salvarTextosHome(textos: TextosHome): Promise<ResultadoSimples> {
  const { supabase, user } = await exigirAdmin();
  const erro = validarTextos(textos);
  if (erro.geral) return { ok: false, erro: erro.geral };

  const valor = textosParaBanco(textos);
  const { error } = await supabase
    .from("configuracoes")
    .upsert(
      {
        chave: "home_textos",
        valor,
        publica: true,
        descricao: "Textos das seções fixas da home (como funciona, chamada final, benefícios)",
      },
      { onConflict: "chave" },
    );
  if (error) return { ok: false, erro: erroDoBanco(error, "salvar textos") };

  await registrarAcao(user.id, "home.textos.editar", "configuracao", "home_textos");
  atualizarHome();
  return { ok: true };
}

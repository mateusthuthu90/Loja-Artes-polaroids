// Leitura da home montada no painel: banners, seções e textos.
//
// Mesmas regras do catálogo (prevencao-erros.md §4):
//  • Falha no banco nunca vira tela de erro — devolve o conteúdo de reserva.
//  • Seção sem produto não é exibida (faixa vazia é pior que faixa ausente).
//  • Cache de 60s com a tag "home", invalidada pelo painel ao salvar.
import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "./supabase/env";
import type { BannerHome, Produto, SecaoHome, SecaoResolvida } from "./types";

export const TAG_HOME = "home";
const CACHE = { revalidate: 60, tags: [TAG_HOME] };

function clientePublico() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

/**
 * Banner de reserva: usado enquanto o banco não tem nenhum banner ativo (ou
 * está fora do ar). A home nunca abre sem hero.
 */
const BANNER_RESERVA: BannerHome = {
  id: "reserva",
  titulo: "fotos polaroid",
  subtitulo: "Transforme suas memórias em polaroids personalizadas, impressas com carinho.",
  cta_link: "/produtos",
  imagem: "/images/banners/polaroids.jpg",
  imagem_alt: "Mão segurando um porta-retrato de coraçõezinhos diante de polaroids abertas em leque",
  foco: "centro",
  ordem: 1,
  ativo: true,
};

/** Banner sem imagem quebraria o <Image> do hero. */
function bannerExibivel(b: BannerHome): boolean {
  return typeof b.imagem === "string" && b.imagem.trim().length > 0 && b.titulo.trim().length > 0;
}

/** Banco antigo (antes da migration do foco) responde sem a coluna. */
function normalizarBanner(b: BannerHome): BannerHome {
  return { ...b, foco: b.foco ?? "centro" };
}

export const listarBanners = unstable_cache(
  async (): Promise<BannerHome[]> => {
    if (!supabaseConfigurado()) return [BANNER_RESERVA];
    const { data, error } = await clientePublico()
      .from("home_banners")
      .select("*")
      .eq("ativo", true)
      .order("ordem")
      .order("criado_em");
    if (error) {
      console.error("[home] erro ao listar banners:", error.message);
      return [BANNER_RESERVA];
    }
    const banners = (data as BannerHome[]).filter(bannerExibivel).map(normalizarBanner);
    return banners.length > 0 ? banners : [BANNER_RESERVA];
  },
  ["home-banners"],
  CACHE,
);

// ---------------------------------------------------------------------------
// Seções
// ---------------------------------------------------------------------------

export const listarSecoes = unstable_cache(
  async (): Promise<SecaoHome[]> => {
    if (!supabaseConfigurado()) return [];
    const { data, error } = await clientePublico()
      .from("home_secoes")
      .select("*")
      .eq("ativa", true)
      .order("ordem")
      .order("criado_em");
    if (error) {
      console.error("[home] erro ao listar seções:", error.message);
      return [];
    }
    return (data as SecaoHome[]).map((s) => ({ ...s, produto_ids: s.produto_ids ?? [] }));
  },
  ["home-secoes"],
  CACHE,
);

/**
 * Ranking de vendas dos últimos 180 dias, do mais vendido para o menos.
 * Loja nova ainda não tem vendas: devolve lista vazia e a seção some da home.
 */
const rankingMaisVendidos = unstable_cache(
  async (): Promise<string[]> => {
    if (!supabaseConfigurado()) return [];
    const { data, error } = await clientePublico().rpc("produtos_mais_vendidos", { limite: 24 });
    if (error) {
      console.error("[home] erro ao ler mais vendidos:", error.message);
      return [];
    }
    return (data as { produto_id: string }[]).map((l) => l.produto_id);
  },
  ["home-mais-vendidos"],
  // ranking muda devagar: 10 min é bastante
  { revalidate: 600, tags: [TAG_HOME] },
);

/** Ordena os produtos conforme a lista de ids (ids desconhecidos são ignorados). */
function naOrdemDosIds(produtos: Produto[], ids: string[]): Produto[] {
  const porId = new Map(produtos.map((p) => [p.id, p]));
  return ids.map((id) => porId.get(id)).filter((p): p is Produto => p !== undefined);
}

function produtosDaSecao(secao: SecaoHome, produtos: Produto[], ranking: string[]): Produto[] {
  switch (secao.fonte) {
    case "destaques":
      return produtos.filter((p) => p.destaque);
    case "novidades":
      return produtos.filter((p) => p.novo);
    case "promocao":
      return produtos.filter((p) => p.promocao);
    case "categoria":
      return produtos.filter((p) => p.categoria_id === secao.categoria_id);
    case "manual":
      return naOrdemDosIds(produtos, secao.produto_ids);
    case "mais_vendidos":
      return naOrdemDosIds(produtos, ranking);
  }
}

/**
 * Resolve cada seção nos produtos que ela vai mostrar.
 * Recebe o catálogo pronto para não ir ao banco uma vez por seção.
 */
export async function montarSecoes(produtos: Produto[]): Promise<SecaoResolvida[]> {
  const secoes = await listarSecoes();
  const precisaRanking = secoes.some((s) => s.fonte === "mais_vendidos");
  const ranking = precisaRanking ? await rankingMaisVendidos() : [];

  return secoes
    .map((s) => ({ ...s, produtos: produtosDaSecao(s, produtos, ranking).slice(0, s.limite) }))
    // faixa vazia não vai para a loja (categoria sem produto, promoção que acabou…)
    .filter((s) => s.produtos.length > 0);
}

// Leitura do catálogo e das configurações públicas para as páginas da loja.
//
// Regras de prevenção de erros (prevencao-erros.md §4):
//  • Site resiliente: produto com dado faltando é ESCONDIDO, nunca exibido quebrado.
//  • Falha no banco nunca vira tela de erro: devolve lista vazia / padrões e registra no log.
//  • Cache com invalidação: 60s de cache + tag "catalogo" (o painel invalida ao salvar).
import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { melhorPromocao } from "./preco";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "./supabase/env";
import type { Categoria, Produto, Promocao, TextosHome } from "./types";

export const TAG_CATALOGO = "catalogo";
const CACHE = { revalidate: 60, tags: [TAG_CATALOGO] };

// Cliente anônimo, sem cookies: o catálogo é igual para todo mundo e pode ser cacheado.
function clientePublico() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function produtoExibivel(p: Produto): boolean {
  return (
    typeof p.nome === "string" &&
    p.nome.trim().length > 0 &&
    Number(p.preco) > 0 &&
    Array.isArray(p.imagens) &&
    p.imagens.length > 0 &&
    Array.isArray(p.opcoes) &&
    p.opcoes.every((g) => Array.isArray(g.valores) && g.valores.length > 0)
  );
}

function normalizar(p: Produto): Produto {
  return { ...p, preco: Number(p.preco) };
}

/** Promoções vigentes (o RLS já filtra período e ativa). */
export const listarPromocoes = unstable_cache(
  async (): Promise<Promocao[]> => {
    if (!supabaseConfigurado()) return [];
    const { data, error } = await clientePublico().from("promocoes").select("*");
    if (error) {
      console.error("[catalogo] erro ao listar promoções:", error.message);
      return [];
    }
    return (data as Promocao[]).map((p) => ({ ...p, valor: Number(p.valor), alvos: p.alvos ?? [] }));
  },
  ["promocoes-vigentes"],
  // janela menor: promoção começa/termina na hora marcada
  { revalidate: 30, tags: [TAG_CATALOGO] },
);

export const listarProdutos = unstable_cache(
  async (): Promise<Produto[]> => {
    if (!supabaseConfigurado()) return [];
    const [{ data, error }, promocoes] = await Promise.all([
      clientePublico().from("produtos").select("*").eq("status", "publicado").order("ordem").order("nome"),
      listarPromocoes(),
    ]);
    if (error) {
      console.error("[catalogo] erro ao listar produtos:", error.message);
      return [];
    }
    return (data as Produto[])
      .filter(produtoExibivel)
      .map(normalizar)
      // cada produto já sai do catálogo com a promoção que vale para ele
      .map((p) => ({ ...p, promocao: melhorPromocao(p, promocoes) }));
  },
  ["produtos-publicados"],
  CACHE,
);

export const listarCategorias = unstable_cache(
  async (): Promise<Categoria[]> => {
    if (!supabaseConfigurado()) return [];
    const { data, error } = await clientePublico()
      .from("categorias")
      .select("*")
      .eq("ativa", true)
      .order("ordem");
    if (error) {
      console.error("[catalogo] erro ao listar categorias:", error.message);
      return [];
    }
    return data as Categoria[];
  },
  ["categorias-ativas"],
  CACHE,
);

/** Categorias que têm pelo menos um produto à venda (categoria vazia não aparece no menu). */
export async function categoriasComProdutos(): Promise<Categoria[]> {
  const [categorias, produtos] = await Promise.all([listarCategorias(), listarProdutos()]);
  const usadas = new Set(produtos.map((p) => p.categoria_id));
  return categorias.filter((c) => usadas.has(c.id));
}

export async function buscarProduto(slug: string): Promise<Produto | null> {
  const produtos = await listarProdutos();
  return produtos.find((p) => p.slug === slug) ?? null;
}

// ---------------------------------------------------------------------------
// Configurações públicas (tabela configuracoes) — sempre com valores padrão
// ---------------------------------------------------------------------------
export interface ConfigLoja {
  loja: { aberta: boolean; mensagem_fechada: string };
  /** @deprecated O hero agora vem da tabela home_banners (painel → Home). */
  banner_home: { titulo: string; subtitulo: string; imagem: string };
  /** Textos das seções fixas da home, editáveis em painel → Home → Textos. */
  home_textos: TextosHome;
  frete: { tipo: "fixo"; valor: number; gratis_acima: number | null };
  retirada: { ativa: boolean; endereco: string };
  prazo_producao: { dias_uteis: number };
  contato: { whatsapp: string; instagram: string; email: string };
}

export const TEXTOS_HOME_PADRAO: TextosHome = {
  categorias: { ativo: true },
  como_funciona: {
    ativo: true,
    selo: "Simples assim",
    titulo: "Como funciona",
    subtitulo: `Do clique de "comprar" até a lembrança na sua mão, sem complicação.`,
    passos: [
      { titulo: "Escolha seus produtos", texto: "Navegue pela coleção e monte seu pedido do jeitinho que quiser." },
      { titulo: "Envie suas fotos", texto: "Ao finalizar o pedido, você sobe as fotos direto aqui no site. Sem bagunça no WhatsApp." },
      { titulo: "Pague com Pix", texto: "O pagamento é confirmado na hora e o seu pedido já entra na nossa fila de produção." },
      { titulo: "Receba suas lembranças", texto: "Produzimos tudo à mão e enviamos com carinho, ou você retira com a gente." },
    ],
  },
  chamada: {
    ativo: true,
    titulo: "Pronto para eternizar seus momentos?",
    texto: "Escolha sua lembrança favorita e receba com todo o cuidado que suas memórias merecem.",
    botao: "Começar meu pedido",
    link: "/produtos",
  },
  beneficios: {
    ativo: true,
    itens: [
      { icone: "camera", titulo: "Qualidade premium", texto: "Papel fotográfico profissional Fujifilm: à prova d'água, não amarela e não desbota." },
      { icone: "caminhao", titulo: "Enviamos para todo o Brasil", texto: "Envio com código de rastreio, ou retirada com a gente." },
      { icone: "coracao", titulo: "Feito com carinho", texto: "Cada peça é produzida artesanalmente, com atenção aos detalhes." },
      { icone: "escudo", titulo: "Pagamento seguro", texto: "Pix com confirmação automática, processado pelo Mercado Pago." },
    ],
  },
};

const CONFIG_PADRAO: ConfigLoja = {
  loja: { aberta: true, mensagem_fechada: "" },
  banner_home: {
    titulo: "Suas memórias merecem ganhar forma.",
    subtitulo:
      "Transforme suas fotos favoritas em lembranças para guardar, presentear e reviver.",
    imagem: "/images/hero/hero-main.jpg",
  },
  home_textos: TEXTOS_HOME_PADRAO,
  frete: { tipo: "fixo", valor: 14.9, gratis_acima: 100 },
  retirada: { ativa: true, endereco: "" },
  prazo_producao: { dias_uteis: 5 },
  contato: {
    whatsapp: "5533998035543",
    instagram: "artes.polaroids",
    email: "artes.polaroids1@gmail.com",
  },
};

/**
 * Junta o que veio do banco com os valores padrão, descendo pelos objetos
 * aninhados. Chave que o banco não trouxe mantém o padrão — assim um JSON
 * salvo pela metade (ou de uma versão antiga) nunca deixa a home sem texto.
 * Lista (passos, benefícios) é substituída inteira, não item a item.
 */
function mesclar(padrao: unknown, valor: unknown): unknown {
  if (Array.isArray(padrao) || Array.isArray(valor)) return valor;
  if (!padrao || typeof padrao !== "object" || !valor || typeof valor !== "object") return valor;
  const saida = { ...(padrao as Record<string, unknown>) };
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
    saida[k] = k in saida ? mesclar(saida[k], v) : v;
  }
  return saida;
}

export const lerConfig = unstable_cache(
  async (): Promise<ConfigLoja> => {
    if (!supabaseConfigurado()) return CONFIG_PADRAO;
    const { data, error } = await clientePublico().from("configuracoes").select("chave, valor");
    if (error) {
      console.error("[catalogo] erro ao ler configurações:", error.message);
      return CONFIG_PADRAO;
    }
    const config = structuredClone(CONFIG_PADRAO) as unknown as Record<string, unknown>;
    for (const { chave, valor } of data as { chave: string; valor: unknown }[]) {
      const padrao = config[chave];
      if (padrao && typeof padrao === "object" && valor && typeof valor === "object") {
        config[chave] = mesclar(padrao, valor);
      }
    }
    return config as unknown as ConfigLoja;
  },
  ["configuracoes-publicas"],
  CACHE,
);

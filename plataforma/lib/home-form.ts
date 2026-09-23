// Validação da home editável — mesma regra do cadastro de produto
// (prevencao-erros.md §1): roda na tela para dar retorno na hora e de novo no
// servidor antes de gravar. Os limites acompanham os CHECKs da migration
// 20260923000005_home_cms, para o banco nunca ser a primeira barreira.
import type {
  BannerHome,
  BeneficioHome,
  FocoBanner,
  FonteSecao,
  FundoSecao,
  LayoutSecao,
  PassoHome,
  SecaoHome,
  TextosHome,
} from "./types";

// O título sai deitado e ocupa a altura do banner: passando de ~28 caracteres
// a letra fica pequena demais para ser lida de longe. A frase de apoio quebra
// em ~28 caracteres por linha, então 180 dá umas quatro linhas confortáveis.
export const LIMITES_BANNER = {
  titulo: 28,
  subtitulo: 180,
  alt: 200,
} as const;

export const LIMITES_SECAO = {
  selo: 60,
  titulo: 80,
  subtitulo: 300,
  link_texto: 40,
  produtos: 24,
} as const;

/** A foto é recortada de formas diferentes no desktop e no celular; isto diz
    qual pedaço dela precisa sobreviver aos dois recortes. */
export const FOCOS: { valor: FocoBanner; nome: string; ajuda: string }[] = [
  { valor: "topo", nome: "Topo", ajuda: "O assunto está na parte de cima da foto." },
  { valor: "centro", nome: "Centro", ajuda: "O assunto está no meio da foto." },
  { valor: "base", nome: "Base", ajuda: "O assunto está na parte de baixo da foto." },
];

export const FONTES: { valor: FonteSecao; nome: string; ajuda: string }[] = [
  { valor: "destaques", nome: "Destaques", ajuda: "Produtos marcados como destaque no cadastro." },
  { valor: "novidades", nome: "Novidades", ajuda: 'Produtos marcados como "novo" no cadastro.' },
  { valor: "promocao", nome: "Promoção", ajuda: "Produtos com promoção no ar agora. A faixa some sozinha quando a promoção acaba." },
  { valor: "mais_vendidos", nome: "Mais vendidos", ajuda: "Calculado pelos pedidos pagos dos últimos 6 meses. Sem vendas ainda, a faixa não aparece." },
  { valor: "categoria", nome: "Uma categoria", ajuda: "Todos os produtos de uma categoria (ex.: Polaroids, Presentes)." },
  { valor: "manual", nome: "Escolher a dedo", ajuda: "Você escolhe os produtos, um a um, na ordem que quiser." },
];

// ---------------------------------------------------------------------------
// Formulários
// ---------------------------------------------------------------------------

export type BannerForm = Omit<BannerHome, "id" | "ordem"> & { id: string | null };

export type SecaoForm = Omit<SecaoHome, "id" | "ordem"> & { id: string | null };

export type ErrosBanner = Partial<Record<keyof BannerForm | "geral", string>>;
export type ErrosSecao = Partial<Record<keyof SecaoForm | "geral", string>>;
export type ErrosTextos = { geral?: string };

export function bannerVazio(): BannerForm {
  return {
    id: null,
    titulo: "",
    subtitulo: "",
    cta_link: "/produtos",
    imagem: "",
    imagem_alt: "",
    foco: "centro",
    ativo: true,
  };
}

export function secaoVazia(): SecaoForm {
  return {
    id: null,
    selo: "",
    titulo: "",
    subtitulo: "",
    fonte: "categoria",
    categoria_id: null,
    produto_ids: [],
    limite: 8,
    layout: "carrossel",
    fundo: "claro",
    link_texto: "",
    link_href: "",
    ativa: true,
  };
}

/** Remove tags HTML coladas de outro lugar (evita layout quebrado / XSS). */
export function limpar(texto: string): string {
  return texto.replace(/<[^>]*>/g, "").replace(/\r\n/g, "\n").trim();
}

/** Aceita caminho interno (/produtos), âncora (#como-funciona) ou link completo. */
function linkValido(href: string): boolean {
  return /^(\/|#|https?:\/\/)/.test(href);
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

export function validarBanner(f: BannerForm): ErrosBanner {
  const e: ErrosBanner = {};

  if (!limpar(f.titulo)) e.titulo = "Escreva o título do banner";
  else if (f.titulo.length > LIMITES_BANNER.titulo) e.titulo = `Até ${LIMITES_BANNER.titulo} caracteres`;

  if (!limpar(f.subtitulo)) e.subtitulo = "Escreva a frase de apoio";
  else if (f.subtitulo.length > LIMITES_BANNER.subtitulo) e.subtitulo = `Até ${LIMITES_BANNER.subtitulo} caracteres`;

  if (!linkValido(f.cta_link)) e.cta_link = "Use um endereço do site (ex.: /produtos) ou um link completo";

  if (!f.imagem.trim()) e.imagem = "Envie a foto do banner";
  if (!limpar(f.imagem_alt)) e.imagem_alt = "Descreva a foto para quem não enxerga";
  else if (f.imagem_alt.length > LIMITES_BANNER.alt) e.imagem_alt = `Até ${LIMITES_BANNER.alt} caracteres`;

  if (!FOCOS.some((o) => o.valor === f.foco)) e.foco = "Escolha onde está o assunto da foto";

  return e;
}

export function validarSecao(f: SecaoForm): ErrosSecao {
  const e: ErrosSecao = {};

  if (!limpar(f.titulo)) e.titulo = "Dê um nome à seção (ex.: Novidades)";
  else if (f.titulo.length > LIMITES_SECAO.titulo) e.titulo = `Até ${LIMITES_SECAO.titulo} caracteres`;

  if (f.selo.length > LIMITES_SECAO.selo) e.selo = `Até ${LIMITES_SECAO.selo} caracteres`;
  if (f.subtitulo.length > LIMITES_SECAO.subtitulo) e.subtitulo = `Até ${LIMITES_SECAO.subtitulo} caracteres`;

  if (f.fonte === "categoria" && !f.categoria_id) e.categoria_id = "Escolha a categoria desta seção";
  if (f.fonte === "manual" && f.produto_ids.length === 0) e.produto_ids = "Escolha ao menos um produto";
  if (f.produto_ids.length > LIMITES_SECAO.produtos) e.produto_ids = `No máximo ${LIMITES_SECAO.produtos} produtos`;

  if (!Number.isInteger(f.limite) || f.limite < 2 || f.limite > 24) e.limite = "Mostre de 2 a 24 produtos";

  if (f.link_texto.length > LIMITES_SECAO.link_texto) e.link_texto = `Até ${LIMITES_SECAO.link_texto} caracteres`;
  if (f.link_texto.trim() && !f.link_href.trim()) e.link_href = 'Diga para onde o botão "ver mais" leva';
  if (f.link_href.trim() && !linkValido(f.link_href)) e.link_href = "Use um endereço do site (ex.: /produtos) ou um link completo";

  return e;
}

export function validarTextos(t: TextosHome): ErrosTextos {
  if (t.como_funciona.ativo && !limpar(t.como_funciona.titulo)) {
    return { geral: 'A seção "Como funciona" está ligada e sem título.' };
  }
  if (t.como_funciona.ativo && t.como_funciona.passos.some((p) => !limpar(p.titulo))) {
    return { geral: "Todo passo de “Como funciona” precisa de um título." };
  }
  if (t.chamada.ativo && (!limpar(t.chamada.titulo) || !limpar(t.chamada.botao))) {
    return { geral: "A chamada final precisa de título e texto no botão." };
  }
  if (t.chamada.ativo && !linkValido(t.chamada.link)) {
    return { geral: "O link da chamada final precisa começar com /, # ou http." };
  }
  if (t.beneficios.ativo && t.beneficios.itens.some((b) => !limpar(b.titulo))) {
    return { geral: "Todo benefício precisa de um título." };
  }
  return {};
}

// ---------------------------------------------------------------------------
// Formulário → banco
// ---------------------------------------------------------------------------

/** As colunas do banner antigo ficam de fora: o banco tem default para todas. */
export function bannerParaBanco(f: BannerForm) {
  return {
    titulo: limpar(f.titulo).toLowerCase(),
    subtitulo: limpar(f.subtitulo),
    cta_link: f.cta_link.trim(),
    imagem: f.imagem.trim(),
    imagem_alt: limpar(f.imagem_alt),
    foco: f.foco,
    ativo: f.ativo,
  };
}

export function secaoParaBanco(f: SecaoForm) {
  const porCategoria = f.fonte === "categoria";
  const manual = f.fonte === "manual";
  return {
    selo: limpar(f.selo),
    titulo: limpar(f.titulo),
    subtitulo: limpar(f.subtitulo),
    fonte: f.fonte,
    // guardar alvo de uma fonte que não é mais usada só gera confusão depois
    categoria_id: porCategoria ? f.categoria_id : null,
    produto_ids: manual ? f.produto_ids.slice(0, LIMITES_SECAO.produtos) : [],
    limite: f.limite,
    layout: f.layout satisfies LayoutSecao,
    fundo: f.fundo satisfies FundoSecao,
    link_texto: limpar(f.link_texto),
    link_href: f.link_texto.trim() ? f.link_href.trim() : "",
    ativa: f.ativa,
  };
}

export function textosParaBanco(t: TextosHome): TextosHome {
  const passo = (p: PassoHome): PassoHome => ({ titulo: limpar(p.titulo), texto: limpar(p.texto) });
  const beneficio = (b: BeneficioHome): BeneficioHome => ({
    icone: b.icone.trim(),
    titulo: limpar(b.titulo),
    texto: limpar(b.texto),
  });

  return {
    categorias: { ativo: t.categorias.ativo },
    como_funciona: {
      ativo: t.como_funciona.ativo,
      selo: limpar(t.como_funciona.selo),
      titulo: limpar(t.como_funciona.titulo),
      subtitulo: limpar(t.como_funciona.subtitulo),
      passos: t.como_funciona.passos.map(passo),
    },
    chamada: {
      ativo: t.chamada.ativo,
      titulo: limpar(t.chamada.titulo),
      texto: limpar(t.chamada.texto),
      botao: limpar(t.chamada.botao),
      link: t.chamada.link.trim() || "/produtos",
    },
    beneficios: {
      ativo: t.beneficios.ativo,
      itens: t.beneficios.itens.map(beneficio),
    },
  };
}

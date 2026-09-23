// Tipos espelhando as tabelas do Supabase (supabase/migrations).

export type StatusProduto = "rascunho" | "publicado" | "inativo";

export type StatusPedido =
  | "aguardando_pagamento"
  | "pago"
  | "em_producao"
  | "enviado"
  | "pronto_retirada"
  | "concluido"
  | "cancelado";

export interface ValorOpcao {
  label: string;
  /** Diferença em relação ao preço base. Negativo = mais barato que o base. */
  acrescimo: number;
  /** Fotos que o cliente envia por unidade quando este valor é escolhido. */
  fotos?: number;
  /** Unidades que esta opção representa (kit de 50 = 50). Usado para mostrar preço por unidade e desconto. */
  unidades?: number;
}

export interface GrupoOpcao {
  nome: string;
  valores: ValorOpcao[];
}

export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
  ativa: boolean;
}

export interface Produto {
  id: string;
  categoria_id: string;
  nome: string;
  slug: string;
  descricao_curta: string;
  descricao: string;
  preco: number;
  imagens: string[];
  opcoes: GrupoOpcao[];
  estoque: number | null;
  estoque_minimo: number;
  requer_fotos_cliente: boolean;
  min_fotos: number;
  max_fotos: number;
  prazo_producao_dias: number | null;
  destaque: boolean;
  novo: boolean;
  ordem: number;
  status: StatusProduto;
  /** Promoção vigente que vale para este produto (preenchida ao ler o catálogo). */
  promocao?: Promocao | null;
}

/** Opções escolhidas pelo cliente: { "Quantidade": "20 unidades" } */
export type OpcoesEscolhidas = Record<string, string>;

// ---------------------------------------------------------------------------
// Descontos
// ---------------------------------------------------------------------------
export type TipoDesconto = "percentual" | "valor";
export type EscopoPromocao = "loja" | "categoria" | "produto";

export interface Promocao {
  id: string;
  nome: string;
  selo: string | null;
  tipo: TipoDesconto;
  valor: number;
  escopo: EscopoPromocao;
  alvos: string[];
  inicio: string | null;
  fim: string | null;
  ativa: boolean;
}

export type TipoCupom = TipoDesconto | "frete_gratis";

export interface Cupom {
  id: string;
  codigo: string;
  descricao: string | null;
  tipo: TipoCupom;
  valor: number;
  minimo_pedido: number;
  inicio: string | null;
  fim: string | null;
  limite_usos: number | null;
  usos: number;
  ativo: boolean;
}

/** Cupom já validado, do jeito que a loja usa (sem expor os dados internos). */
export interface CupomAplicado {
  codigo: string;
  tipo: TipoCupom;
  descricao: string | null;
  /** desconto em reais no subtotal (0 quando o cupom é de frete grátis) */
  desconto: number;
  freteGratis: boolean;
}

// ---------------------------------------------------------------------------
// Home editável pelo painel (migration 20260923000005_home_cms)
// ---------------------------------------------------------------------------

/** Slide do carrossel principal da home. */
export interface BannerHome {
  id: string;
  selo: string;
  titulo: string;
  /** Trecho final do título, destacado em itálico. Pode ficar vazio. */
  destaque: string;
  subtitulo: string;
  /** Legenda manuscrita na borda da polaroid. */
  legenda: string;
  cta_texto: string;
  cta_link: string;
  imagem: string;
  imagem_alt: string;
  /** Polaroid menor de apoio. null = slide com uma foto só. */
  apoio: string | null;
  apoio_alt: string;
  /** Cor do halo de fundo — muda a temperatura do slide sem sair da paleta. */
  halo: string;
  giro_principal: number;
  giro_apoio: number;
  ordem: number;
  ativo: boolean;
}

/** De onde a seção tira os produtos que mostra. */
export type FonteSecao =
  | "destaques"
  | "novidades"
  | "promocao"
  | "mais_vendidos"
  | "categoria"
  | "manual";

export type LayoutSecao = "grade" | "carrossel";
export type FundoSecao = "claro" | "branco";

/** Faixa de produtos da home, montada no painel. */
export interface SecaoHome {
  id: string;
  selo: string;
  titulo: string;
  subtitulo: string;
  fonte: FonteSecao;
  categoria_id: string | null;
  /** Usado só quando fonte = "manual": os produtos escolhidos, na ordem escolhida. */
  produto_ids: string[];
  limite: number;
  layout: LayoutSecao;
  fundo: FundoSecao;
  link_texto: string;
  link_href: string;
  ordem: number;
  ativa: boolean;
}

/** Seção já resolvida: com os produtos que vão aparecer. */
export interface SecaoResolvida extends SecaoHome {
  produtos: Produto[];
}

// --- Textos das seções fixas (configuracoes.home_textos) --------------------

export interface PassoHome {
  titulo: string;
  texto: string;
}

export interface BeneficioHome {
  icone: string;
  titulo: string;
  texto: string;
}

export interface TextosHome {
  categorias: { ativo: boolean };
  como_funciona: {
    ativo: boolean;
    selo: string;
    titulo: string;
    subtitulo: string;
    passos: PassoHome[];
  };
  chamada: {
    ativo: boolean;
    titulo: string;
    texto: string;
    botao: string;
    link: string;
  };
  beneficios: { ativo: boolean; itens: BeneficioHome[] };
}

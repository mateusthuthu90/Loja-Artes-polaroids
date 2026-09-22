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
}

/** Opções escolhidas pelo cliente: { "Quantidade": "20 unidades" } */
export type OpcoesEscolhidas = Record<string, string>;

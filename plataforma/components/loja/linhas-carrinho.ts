"use client";

import { useEffect, useMemo } from "react";
import { OpcaoInvalidaError, esgotado, fotosPorUnidade, precoUnitario, validarOpcoes } from "@/lib/preco";
import type { Produto } from "@/lib/types";
import { chaveItem, useCarrinho, type ItemCarrinho } from "./carrinho";

export interface LinhaCarrinho {
  item: ItemCarrinho;
  produto: Produto;
  unitario: number;
  total: number;
  /** fotos exigidas para a quantidade inteira do item (0 = não pede fotos) */
  fotosMin: number;
  fotosMax: number;
}

/**
 * Cruza o carrinho salvo com o catálogo ATUAL: preço sempre atualizado e
 * itens de produtos despublicados / esgotados / com opções que mudaram são descartados.
 */
export function useLinhasCarrinho(produtos: Produto[]) {
  const carrinho = useCarrinho();
  const { itens, carregado, manterSomente } = carrinho;

  const linhas = useMemo<LinhaCarrinho[]>(() => {
    const porId = new Map(produtos.map((p) => [p.id, p]));
    return itens.flatMap((item) => {
      const produto = porId.get(item.produtoId);
      if (!produto || esgotado(produto)) return [];
      try {
        validarOpcoes(produto, item.opcoes);
      } catch (e) {
        if (e instanceof OpcaoInvalidaError) return [];
        throw e;
      }
      if (chaveItem(produto.id, item.opcoes) !== item.chave) return [];
      const unitario = precoUnitario(produto, item.opcoes);
      const fotos = fotosPorUnidade(produto, item.opcoes);
      return [{
        item,
        produto,
        unitario,
        total: unitario * item.quantidade,
        fotosMin: fotos.min * item.quantidade,
        fotosMax: fotos.max * item.quantidade,
      }];
    });
  }, [itens, produtos]);

  useEffect(() => {
    // catálogo vazio = provável falha momentânea do banco: não apaga o carrinho do cliente
    if (carregado && produtos.length > 0) manterSomente(new Set(linhas.map((l) => l.item.chave)));
  }, [carregado, produtos.length, linhas, manterSomente]);

  const subtotal = linhas.reduce((s, l) => s + l.total, 0);
  return { ...carrinho, linhas, subtotal };
}

/** Produto com opção "Quantidade" (kits) não mostra seletor de quantidade extra. */
export const temGrupoQuantidade = (p: Produto) => p.opcoes.some((g) => g.nome === "Quantidade");

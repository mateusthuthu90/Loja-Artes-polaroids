"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import type { ConfigLoja } from "@/lib/catalogo";
import { OpcaoInvalidaError, esgotado, formatarBRL, fotosPorUnidade, precoUnitario, validarOpcoes } from "@/lib/preco";
import type { Produto } from "@/lib/types";
import { chaveItem, useCarrinho, type ItemCarrinho } from "./carrinho";
import { botaoContorno, botaoPrimario } from "./ui";

interface Linha {
  item: ItemCarrinho;
  produto: Produto;
  unitario: number;
  fotos: number;
}

export function VisaoCarrinho({
  produtos,
  frete,
  lojaAberta,
}: {
  produtos: Produto[];
  frete: ConfigLoja["frete"];
  lojaAberta: boolean;
}) {
  const { itens, carregado, alterarQuantidade, remover, manterSomente } = useCarrinho();

  // Cruza o carrinho salvo com o catálogo ATUAL: preço sempre atualizado e
  // itens de produtos despublicados / opções que mudaram são descartados.
  const linhas = useMemo<Linha[]>(() => {
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
      return [{
        item,
        produto,
        unitario: precoUnitario(produto, item.opcoes),
        fotos: fotosPorUnidade(produto, item.opcoes).min * item.quantidade,
      }];
    });
  }, [itens, produtos]);

  useEffect(() => {
    // catálogo vazio = provável falha momentânea do banco: não apaga o carrinho do cliente
    if (carregado && produtos.length > 0) manterSomente(new Set(linhas.map((l) => l.item.chave)));
  }, [carregado, produtos.length, linhas, manterSomente]);

  if (!carregado) {
    return <p className="py-20 text-center text-texto-suave">Carregando seu carrinho…</p>;
  }

  if (linhas.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="mb-2 text-5xl" aria-hidden>🛍️</p>
        <h2 className="text-2xl font-semibold">Seu carrinho está vazio</h2>
        <p className="mb-6 mt-2 text-texto-suave">Que tal escolher uma lembrança especial?</p>
        <Link href="/produtos" className={botaoPrimario}>Ver produtos</Link>
      </div>
    );
  }

  const subtotal = linhas.reduce((s, l) => s + l.unitario * l.item.quantidade, 0);
  const faltaFreteGratis = frete.gratis_acima ? frete.gratis_acima - subtotal : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <ul className="space-y-3">
        {linhas.map(({ item, produto, unitario, fotos }) => {
          const mostraQtd = !produto.opcoes.some((g) => g.nome === "Quantidade");
          return (
            <li key={item.chave} className="flex gap-3 rounded-card border border-borda bg-cartao p-3 sm:gap-4 sm:p-4">
              <Link href={`/produto/${produto.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-terracota-claro">
                <Image src={produto.imagens[0]} alt={produto.nome} fill sizes="96px" className="object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-2">
                  <Link href={`/produto/${produto.slug}`} className="font-display text-lg font-semibold leading-tight hover:text-marrom">
                    {produto.nome}
                  </Link>
                  <button type="button" onClick={() => remover(item.chave)} className="text-sm text-texto-fraco hover:text-perigo" aria-label={`Remover ${produto.nome}`}>
                    ✕
                  </button>
                </div>
                {Object.entries(item.opcoes).map(([k, v]) => (
                  <p key={k} className="text-sm text-texto-suave">{k}: {v}</p>
                ))}
                {fotos > 0 && <p className="text-xs text-terracota">📸 {fotos} {fotos === 1 ? "foto" : "fotos"} para enviar</p>}
                <div className="mt-auto flex items-end justify-between pt-2">
                  {mostraQtd ? (
                    <div className="flex items-center rounded-full border border-borda">
                      <button type="button" onClick={() => alterarQuantidade(item.chave, item.quantidade - 1)} className="h-8 w-8" aria-label="Diminuir">−</button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantidade}</span>
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(item.chave, item.quantidade + 1)}
                        disabled={produto.estoque !== null && item.quantidade >= produto.estoque}
                        className="h-8 w-8 disabled:opacity-30"
                        aria-label="Aumentar"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-texto-suave">{item.quantidade > 1 ? `${item.quantidade} kits` : ""}</span>
                  )}
                  <span className="font-display text-lg font-bold text-marrom">{formatarBRL(unitario * item.quantidade)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-grande border border-borda bg-cartao p-6 lg:sticky lg:top-24">
        <h2 className="mb-4 text-xl font-semibold">Resumo</h2>
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span className="font-semibold">{formatarBRL(subtotal)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-texto-suave">
          <span>Frete</span>
          <span>calculado no checkout</span>
        </div>
        {faltaFreteGratis !== null && (
          <p className="mt-4 rounded-xl bg-sucesso-claro px-3 py-2 text-sm text-sucesso">
            {faltaFreteGratis > 0
              ? `Faltam ${formatarBRL(faltaFreteGratis)} para o frete grátis 🚚`
              : "Seu pedido tem frete grátis! 🎉"}
          </p>
        )}
        <div className="mt-5 flex justify-between border-t border-borda pt-4">
          <span className="font-semibold">Total</span>
          <span className="font-display text-2xl font-bold text-marrom">{formatarBRL(subtotal)}</span>
        </div>

        {/* O checkout com upload de fotos + Pix é a próxima etapa (Prompts 5 e 6) */}
        <button type="button" disabled className={`${botaoPrimario} mt-5 w-full`}>
          Finalizar pedido
        </button>
        <p className="mt-2 text-center text-xs text-texto-fraco">
          {lojaAberta ? "Checkout com Pix chega na próxima etapa." : "A loja está fechada no momento."}
        </p>
        <Link href="/produtos" className={`${botaoContorno} mt-3 w-full`}>Continuar comprando</Link>
      </aside>
    </div>
  );
}

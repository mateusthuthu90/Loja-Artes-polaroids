"use client";

import Image from "next/image";
import Link from "next/link";
import { Icone } from "@/components/Icone";
import type { ConfigLoja } from "@/lib/catalogo";
import { formatarBRL } from "@/lib/preco";
import type { Produto } from "@/lib/types";
import { CampoCupom, useCupom } from "./cupom";
import { temGrupoQuantidade, useLinhasCarrinho } from "./linhas-carrinho";
import { botaoContorno, botaoPrimario } from "./ui";

export function VisaoCarrinho({
  produtos,
  frete,
  lojaAberta,
}: {
  produtos: Produto[];
  frete: ConfigLoja["frete"];
  lojaAberta: boolean;
}) {
  const { linhas, subtotal, carregado, alterarQuantidade, remover } = useLinhasCarrinho(produtos);
  const cupom = useCupom(subtotal);
  const total = Math.max(0, subtotal - (cupom.aplicado?.desconto ?? 0));

  if (!carregado) {
    return <p className="py-20 text-center text-texto-suave">Carregando seu carrinho…</p>;
  }

  if (linhas.length === 0) {
    return (
      <div className="py-20 text-center">
        <Icone nome="sacola" className="mx-auto mb-3 h-12 w-12 text-terracota" />
        <h2 className="text-2xl font-semibold">Seu carrinho está vazio</h2>
        <p className="mb-6 mt-2 text-texto-suave">Que tal escolher uma lembrança especial?</p>
        <Link href="/produtos" className={botaoPrimario}>Ver produtos</Link>
      </div>
    );
  }

  const faltaFreteGratis = frete.gratis_acima ? frete.gratis_acima - subtotal : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <ul className="space-y-3">
        {linhas.map(({ item, produto, total, fotosMin }) => (
          <li key={item.chave} className="flex gap-3 rounded-card border border-borda bg-cartao p-3 sm:gap-4 sm:p-4">
            <Link href={`/produto/${produto.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-terracota-claro">
              <Image src={produto.imagens[0]} alt={produto.nome} fill sizes="96px" className="object-cover" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-2">
                <Link href={`/produto/${produto.slug}`} className="font-display text-lg font-semibold leading-tight hover:text-marrom">
                  {produto.nome}
                </Link>
                <button type="button" onClick={() => remover(item.chave)} className="text-texto-fraco hover:text-perigo" aria-label={`Remover ${produto.nome}`}>
                  <Icone nome="fechar" className="h-4 w-4" />
                </button>
              </div>
              {Object.entries(item.opcoes).map(([k, v]) => (
                <p key={k} className="text-sm text-texto-suave">{k}: {v}</p>
              ))}
              {fotosMin > 0 && (
                <p className="flex items-center gap-1 text-xs text-terracota">
                  <Icone nome="camera" className="h-3.5 w-3.5" />
                  {fotosMin} {fotosMin === 1 ? "foto" : "fotos"} para enviar
                </p>
              )}
              <div className="mt-auto flex items-end justify-between pt-2">
                {!temGrupoQuantidade(produto) ? (
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
                <span className="font-display text-lg font-bold text-marrom">{formatarBRL(total)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-grande border border-borda bg-cartao p-6 lg:sticky lg:top-24">
        <h2 className="mb-4 text-xl font-semibold">Resumo</h2>
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span className="font-semibold">{formatarBRL(subtotal)}</span>
        </div>
        {cupom.aplicado && cupom.aplicado.desconto > 0 && (
          <div className="mt-2 flex justify-between text-sm text-sucesso">
            <span>Cupom {cupom.aplicado.codigo}</span>
            <span>− {formatarBRL(cupom.aplicado.desconto)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between text-sm text-texto-suave">
          <span>Frete</span>
          <span>{cupom.aplicado?.freteGratis ? "grátis com o cupom" : "calculado no checkout"}</span>
        </div>
        <CampoCupom {...cupom} />
        {faltaFreteGratis !== null && (
          <p className="mt-4 rounded-xl bg-sucesso-claro px-3 py-2 text-sm text-sucesso">
            {faltaFreteGratis > 0
              ? `Faltam ${formatarBRL(faltaFreteGratis)} para o frete grátis`
              : "Seu pedido tem frete grátis!"}
          </p>
        )}
        <div className="mt-5 flex justify-between border-t border-borda pt-4">
          <span className="font-semibold">Total</span>
          <span className="font-display text-2xl font-bold text-marrom">{formatarBRL(total)}</span>
        </div>

        {lojaAberta ? (
          <Link href="/checkout" className={`${botaoPrimario} mt-5 w-full`}>Finalizar pedido</Link>
        ) : (
          <>
            <button type="button" disabled className={`${botaoPrimario} mt-5 w-full`}>Finalizar pedido</button>
            <p className="mt-2 text-center text-xs text-texto-fraco">A loja está fechada no momento.</p>
          </>
        )}
        <Link href="/produtos" className={`${botaoContorno} mt-3 w-full`}>Continuar comprando</Link>
      </aside>
    </div>
  );
}

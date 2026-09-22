"use client";

import Link from "next/link";
import { useState } from "react";
import { Icone } from "@/components/Icone";
import {
  descontosPorQuantidade,
  esgotado,
  formatarBRL,
  fotosPorUnidade,
  percentualPromocao,
  precoCheio,
  precoUnitario,
} from "@/lib/preco";
import type { OpcoesEscolhidas, Produto } from "@/lib/types";
import { QUANTIDADE_MAXIMA, useCarrinho } from "./carrinho";
import { botaoContorno, botaoPrimario } from "./ui";

// Quando o próprio produto já tem uma opção "Quantidade" (kits de 10/20/50/100 polaroids),
// não mostramos o seletor de quantidade extra — seria confuso ("2 kits de 20").
const GRUPO_QUANTIDADE = "Quantidade";

export function CompraProduto({ produto }: { produto: Produto }) {
  const { adicionar } = useCarrinho();
  const [opcoes, setOpcoes] = useState<OpcoesEscolhidas>(() =>
    Object.fromEntries(produto.opcoes.map((g) => [g.nome, g.valores[0].label])),
  );
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);

  const semEstoque = esgotado(produto);
  const mostraQuantidade = !produto.opcoes.some((g) => g.nome === GRUPO_QUANTIDADE);
  const maximo = Math.min(QUANTIDADE_MAXIMA, produto.estoque ?? QUANTIDADE_MAXIMA);
  const unitario = precoUnitario(produto, opcoes);
  const fotos = fotosPorUnidade(produto, opcoes);
  const descontos = descontosPorQuantidade(produto, opcoes);
  const descontoEscolhido = descontos?.opcoes.find((o) => o.label === opcoes[descontos.grupo]);

  function comprar() {
    adicionar(produto.id, opcoes, quantidade);
    setAdicionado(true);
  }

  return (
    <div>
      {produto.promocao && (
        <p className="mb-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-perigo px-2 py-0.5 text-xs font-bold text-white">
            {produto.promocao.selo || "Promoção"} · -{percentualPromocao(produto, opcoes)}%
          </span>
          <span className="text-texto-fraco line-through">{formatarBRL(precoCheio(produto, opcoes) * quantidade)}</span>
        </p>
      )}
      <p className={`font-display text-3xl font-bold ${produto.promocao ? "text-perigo" : "text-marrom"} ${descontoEscolhido ? "mb-1" : "mb-5"}`}>
        {formatarBRL(unitario * quantidade)}
        {quantidade > 1 && (
          <span className="ml-2 font-sans text-sm font-medium text-texto-suave">
            ({quantidade} × {formatarBRL(unitario)})
          </span>
        )}
      </p>
      {descontoEscolhido && (
        <p className="mb-5 text-sm text-texto-suave">
          {formatarBRL(descontoEscolhido.porUnidade)} por unidade
          {descontoEscolhido.economia > 0 && (
            <span className="ml-2 rounded-full bg-sucesso-claro px-2 py-0.5 font-semibold text-sucesso">
              Economize {formatarBRL(descontoEscolhido.economia)} ({descontoEscolhido.percentual}%)
            </span>
          )}
        </p>
      )}

      {produto.opcoes.map((grupo) => (
        <fieldset key={grupo.nome} className="mb-5">
          <legend className="mb-2 text-sm font-bold">{grupo.nome}</legend>
          <div className="flex flex-wrap gap-2">
            {grupo.valores.map((v) => {
              const selecionado = opcoes[grupo.nome] === v.label;
              const d = descontos?.grupo === grupo.nome ? descontos.opcoes.find((o) => o.label === v.label) : undefined;
              return (
                <button
                  key={v.label}
                  type="button"
                  aria-pressed={selecionado}
                  onClick={() => setOpcoes((o) => ({ ...o, [grupo.nome]: v.label }))}
                  className={`relative border-[1.5px] font-semibold transition ${
                    d ? "rounded-2xl px-4 py-2 text-left" : "rounded-full px-4 py-2"
                  } text-sm ${
                    selecionado
                      ? "border-terracota bg-terracota-claro text-marrom"
                      : "border-borda bg-cartao hover:border-terracota"
                  }`}
                >
                  {v.label}
                  {d && (
                    <span className="block text-xs font-medium text-texto-suave">
                      {formatarBRL(d.preco)} · {formatarBRL(d.porUnidade)}/un
                    </span>
                  )}
                  {d && d.percentual > 0 && (
                    <span className="absolute -right-2 -top-2 rounded-full bg-sucesso px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                      -{d.percentual}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {mostraQuantidade && !semEstoque && (
        <div className="mb-5 flex items-center gap-4">
          <span className="text-sm font-bold">Quantidade</span>
          <div className="flex items-center rounded-full border-[1.5px] border-borda bg-cartao">
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              disabled={quantidade <= 1}
              className="h-10 w-10 text-lg disabled:opacity-30"
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <span className="w-8 text-center font-semibold" aria-live="polite">
              {quantidade}
            </span>
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.min(maximo, q + 1))}
              disabled={quantidade >= maximo}
              className="h-10 w-10 text-lg disabled:opacity-30"
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
        </div>
      )}

      {produto.requer_fotos_cliente && (
        <div className="mb-5 flex gap-3 rounded-card border border-dourado-claro bg-dourado-claro/50 p-4 text-sm">
          <Icone nome="camera" className="mt-0.5 h-5 w-5 shrink-0 text-marrom" />
          <p>
            Você vai enviar{" "}
            <strong>
              {fotos.min === fotos.max
                ? `${fotos.min * quantidade} ${fotos.min * quantidade === 1 ? "foto" : "fotos"}`
                : `de ${fotos.min * quantidade} a ${fotos.max * quantidade} fotos`}
            </strong>{" "}
            direto aqui no site, na hora de finalizar o pedido.
          </p>
        </div>
      )}

      {semEstoque ? (
        <button type="button" disabled className={`${botaoPrimario} w-full`}>
          Esgotado
        </button>
      ) : (
        <button type="button" onClick={comprar} className={`${botaoPrimario} w-full`}>
          Adicionar ao carrinho
        </button>
      )}

      {adicionado && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-texto/40 p-4 sm:items-center"
          onClick={() => setAdicionado(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-adicionado"
            className="w-full max-w-sm rounded-grande bg-cartao p-6 text-center shadow-forte"
            onClick={(e) => e.stopPropagation()}
          >
            <Icone nome="sacola" className="mx-auto mb-2 h-10 w-10 text-terracota" />
            <h3 id="titulo-adicionado" className="text-xl font-semibold">
              Adicionado ao carrinho!
            </h3>
            <p className="mb-5 mt-1 text-sm text-texto-suave">
              {produto.nome}
              {Object.values(opcoes).length > 0 && ` · ${Object.values(opcoes).join(" · ")}`}
              {mostraQuantidade && ` · ${quantidade}×`}
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/carrinho" className={botaoPrimario}>
                Ir para o carrinho
              </Link>
              <button type="button" onClick={() => setAdicionado(false)} className={botaoContorno}>
                Continuar comprando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

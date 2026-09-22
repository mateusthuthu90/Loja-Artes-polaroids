"use client";

// Carrinho da loja: Context API + localStorage (sobrevive a fechar a aba).
// Guarda só o que o cliente ESCOLHEU (produto, opções, quantidade). Preço exibido
// é sempre recalculado a partir do catálogo atual — e o checkout recalcula de novo
// no servidor. Nada que está aqui é confiável para cobrar.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OpcoesEscolhidas } from "@/lib/types";

const CHAVE_STORAGE = "ap_carrinho_v2";

export interface ItemCarrinho {
  /** produtoId + opções: mesmo produto com opções diferentes = itens separados */
  chave: string;
  produtoId: string;
  opcoes: OpcoesEscolhidas;
  quantidade: number;
}

interface CarrinhoContexto {
  itens: ItemCarrinho[];
  /** false até ler o localStorage (evita "piscar" contador 0 → N) */
  carregado: boolean;
  totalItens: number;
  adicionar: (produtoId: string, opcoes: OpcoesEscolhidas, quantidade: number) => void;
  alterarQuantidade: (chave: string, quantidade: number) => void;
  remover: (chave: string) => void;
  /** Remove itens cujo produto/opção não existe mais no catálogo. */
  manterSomente: (chavesValidas: Set<string>) => void;
  limpar: () => void;
}

const Contexto = createContext<CarrinhoContexto | null>(null);

export const QUANTIDADE_MAXIMA = 99;

export function chaveItem(produtoId: string, opcoes: OpcoesEscolhidas): string {
  const ordenadas = Object.keys(opcoes)
    .sort()
    .map((k) => [k, opcoes[k]]);
  return `${produtoId}::${JSON.stringify(ordenadas)}`;
}

function ler(): ItemCarrinho[] {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_STORAGE) ?? "[]");
    if (!Array.isArray(bruto)) return [];
    return bruto.filter(
      (i): i is ItemCarrinho =>
        i &&
        typeof i.produtoId === "string" &&
        typeof i.chave === "string" &&
        i.opcoes !== null &&
        typeof i.opcoes === "object" &&
        Number.isInteger(i.quantidade) &&
        i.quantidade > 0,
    );
  } catch {
    return [];
  }
}

function gravar(itens: ItemCarrinho[]) {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(itens));
  } catch {
    // modo anônimo / storage cheio: o carrinho continua funcionando nesta aba
  }
}

function limitar(qtd: number): number {
  return Math.max(1, Math.min(QUANTIDADE_MAXIMA, Math.floor(qtd)));
}

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
    setItens(ler());
    setCarregado(true);
    // outra aba mexeu no carrinho → sincroniza
    const aoMudar = (e: StorageEvent) => {
      if (e.key === CHAVE_STORAGE) setItens(ler());
    };
    window.addEventListener("storage", aoMudar);
    return () => window.removeEventListener("storage", aoMudar);
  }, []);

  const atualizar = useCallback((fn: (atual: ItemCarrinho[]) => ItemCarrinho[]) => {
    setItens((atual) => {
      const novo = fn(atual);
      gravar(novo);
      return novo;
    });
  }, []);

  const valor = useMemo<CarrinhoContexto>(
    () => ({
      itens,
      carregado,
      totalItens: itens.reduce((s, i) => s + i.quantidade, 0),
      adicionar: (produtoId, opcoes, quantidade) =>
        atualizar((atual) => {
          const chave = chaveItem(produtoId, opcoes);
          const existente = atual.find((i) => i.chave === chave);
          if (existente) {
            return atual.map((i) =>
              i.chave === chave ? { ...i, quantidade: limitar(i.quantidade + quantidade) } : i,
            );
          }
          return [...atual, { chave, produtoId, opcoes, quantidade: limitar(quantidade) }];
        }),
      alterarQuantidade: (chave, quantidade) =>
        atualizar((atual) =>
          quantidade <= 0
            ? atual.filter((i) => i.chave !== chave)
            : atual.map((i) => (i.chave === chave ? { ...i, quantidade: limitar(quantidade) } : i)),
        ),
      remover: (chave) => atualizar((atual) => atual.filter((i) => i.chave !== chave)),
      manterSomente: (validas) =>
        atualizar((atual) =>
          atual.every((i) => validas.has(i.chave)) ? atual : atual.filter((i) => validas.has(i.chave)),
        ),
      limpar: () => atualizar(() => []),
    }),
    [itens, carregado, atualizar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrinho(): CarrinhoContexto {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useCarrinho precisa estar dentro de <CarrinhoProvider>");
  return ctx;
}

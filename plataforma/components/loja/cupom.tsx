"use client";

// Campo de cupom do carrinho/checkout. O código fica salvo no navegador e é
// revalidado no servidor sempre que o carrinho muda (preço ou quantidade).
import { useCallback, useEffect, useState, useTransition } from "react";
import { validarCupom } from "@/app/(loja)/acoes";
import { formatarBRL } from "@/lib/preco";
import type { CupomAplicado } from "@/lib/types";

const CHAVE = "ap_cupom_v1";

function lerSalvo(): string {
  try {
    return localStorage.getItem(CHAVE) ?? "";
  } catch {
    return "";
  }
}

function gravar(codigo: string | null) {
  try {
    if (codigo) localStorage.setItem(CHAVE, codigo);
    else localStorage.removeItem(CHAVE);
  } catch {
    // modo anônimo: o cupom vale só nesta sessão
  }
}

export function useCupom(subtotal: number) {
  const [aplicado, setAplicado] = useState<CupomAplicado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [verificando, iniciar] = useTransition();

  const aplicar = useCallback(
    (codigo: string, silencioso = false) =>
      iniciar(async () => {
        const r = await validarCupom(codigo, subtotal);
        if (r.ok) {
          setAplicado(r.cupom);
          setErro(null);
          gravar(r.cupom.codigo);
        } else {
          setAplicado(null);
          gravar(null);
          setErro(silencioso ? null : r.erro);
        }
      }),
    [subtotal],
  );

  const remover = useCallback(() => {
    setAplicado(null);
    setErro(null);
    gravar(null);
  }, []);

  // revalida o cupom salvo quando o carrinho muda de valor
  useEffect(() => {
    const salvo = lerSalvo();
    if (salvo && subtotal > 0) aplicar(salvo, true);
  }, [subtotal, aplicar]);

  return { aplicado, erro, verificando, aplicar, remover };
}

export function CampoCupom({
  aplicado,
  erro,
  verificando,
  aplicar,
  remover,
}: ReturnType<typeof useCupom>) {
  const [codigo, setCodigo] = useState("");

  if (aplicado) {
    return (
      <div className="mt-4 rounded-xl bg-sucesso-claro px-3 py-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sucesso">Cupom {aplicado.codigo} aplicado</span>
          <button type="button" onClick={remover} className="text-xs text-texto-suave underline-offset-2 hover:underline">
            remover
          </button>
        </div>
        <p className="text-texto-suave">
          {aplicado.freteGratis ? "Frete grátis neste pedido" : `Desconto de ${formatarBRL(aplicado.desconto)}`}
          {aplicado.descricao ? ` · ${aplicado.descricao}` : ""}
        </p>
      </div>
    );
  }

  return (
    <form
      className="mt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (codigo.trim()) aplicar(codigo);
      }}
    >
      <label className="mb-1 block text-xs font-semibold text-texto-suave">Cupom de desconto</label>
      <div className="flex gap-2">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))}
          placeholder="Digite o código"
          className="min-w-0 flex-1 rounded-xl border-[1.5px] border-borda bg-white px-3 py-2 text-sm uppercase outline-none focus:border-terracota"
        />
        <button
          type="submit"
          disabled={verificando || !codigo.trim()}
          className="rounded-xl border-[1.5px] border-borda px-3 text-sm font-semibold hover:border-terracota disabled:opacity-40"
        >
          {verificando ? "…" : "Aplicar"}
        </button>
      </div>
      {erro && <p className="mt-1 text-sm text-perigo">{erro}</p>}
    </form>
  );
}

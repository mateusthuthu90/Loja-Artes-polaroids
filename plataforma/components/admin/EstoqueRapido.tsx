"use client";

// Controle de estoque direto na lista de produtos: −/+, digitar a quantidade e
// salvar. Sem pedidos envolvidos, o motivo do ajuste é "correção"; ajustes com
// motivo (reposição, perda) ficam na tela Estoque.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ajustarEstoque } from "@/app/admin/(painel)/produtos/acoes";

export function EstoqueRapido({
  produtoId,
  estoque,
  estoqueMinimo,
}: {
  produtoId: string;
  estoque: number | null;
  estoqueMinimo: number;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(String(estoque ?? 0));
  const [salvando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const atual = estoque ?? 0;
  const numero = /^\d+$/.test(valor.trim()) ? Number(valor.trim()) : NaN;
  const mudou = !Number.isNaN(numero) && numero !== atual;

  function salvar(novo: number | null) {
    setErro(null);
    iniciar(async () => {
      const r = await ajustarEstoque(produtoId, novo);
      if (!r.ok) {
        setErro(r.erros.geral ?? "Não foi possível salvar");
        return;
      }
      if (novo !== null) setValor(String(novo));
      router.refresh();
    });
  }

  if (estoque === null) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-texto-suave">Sob demanda</span>
        <button
          type="button"
          onClick={() => salvar(0)}
          disabled={salvando}
          className="rounded-lg border border-borda px-2 py-1 font-semibold hover:border-terracota disabled:opacity-40"
        >
          Controlar estoque
        </button>
      </div>
    );
  }

  const baixo = atual <= estoqueMinimo;
  const botao = "h-7 w-7 rounded-lg border border-borda text-sm hover:border-terracota disabled:opacity-30";

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className={`font-semibold ${atual === 0 ? "text-perigo" : baixo ? "text-dourado" : "text-texto-suave"}`}>
        Estoque{atual === 0 ? " esgotado" : baixo ? " baixo" : ""}:
      </span>
      <button type="button" className={botao} disabled={salvando || numero <= 0} onClick={() => salvar(Math.max(0, numero - 1))} aria-label="Diminuir estoque">−</button>
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        aria-label="Quantidade em estoque"
        className="w-14 rounded-lg border border-borda bg-white px-2 py-1 text-center outline-none focus:border-terracota"
      />
      <button type="button" className={botao} disabled={salvando} onClick={() => salvar(numero + 1)} aria-label="Aumentar estoque">+</button>
      {mudou && (
        <>
          <button type="button" onClick={() => salvar(numero)} disabled={salvando} className="rounded-lg bg-marrom px-2 py-1 font-semibold text-creme-claro disabled:opacity-40">
            {salvando ? "…" : "Salvar"}
          </button>
          <button type="button" onClick={() => setValor(String(atual))} className="px-1 text-texto-fraco hover:text-texto">
            cancelar
          </button>
        </>
      )}
      {!mudou && (
        <button
          type="button"
          onClick={() => confirm("Voltar este produto para sob demanda? O estoque deixa de ser controlado.") && salvar(null)}
          disabled={salvando}
          className="px-1 text-texto-fraco hover:text-texto"
        >
          sob demanda
        </button>
      )}
      {erro && <span className="text-perigo">{erro}</span>}
    </div>
  );
}

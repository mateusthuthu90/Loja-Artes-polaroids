"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ajustarEstoque, type MotivoEstoque } from "../produtos/acoes";

const MOTIVOS: { valor: MotivoEstoque; rotulo: string }[] = [
  { valor: "reposicao", rotulo: "Repus / produzi mais" },
  { valor: "perda", rotulo: "Perda ou dano" },
  { valor: "correcao", rotulo: "Correção de contagem" },
];

export function AjusteEstoque({ produtoId, estoque }: { produtoId: string; estoque: number }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<"somar" | "definir">("somar");
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState<MotivoEstoque>("reposicao");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const n = /^-?\d+$/.test(quantidade.trim()) ? Number(quantidade.trim()) : NaN;
  const resultado = Number.isNaN(n) ? estoque : modo === "somar" ? estoque + n : n;

  function aplicar() {
    setErro(null);
    if (Number.isNaN(n)) return setErro("Informe a quantidade");
    if (resultado < 0) return setErro("O estoque não pode ficar negativo");
    iniciar(async () => {
      const r = await ajustarEstoque(produtoId, resultado, motivo, observacao);
      if (!r.ok) return setErro(r.erros.geral ?? "Não foi possível salvar");
      setAberto(false);
      setQuantidade("");
      setObservacao("");
      router.refresh();
    });
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="rounded-lg border border-borda px-3 py-1.5 text-xs font-semibold hover:border-terracota">
        Ajustar
      </button>
    );
  }

  const campo = "rounded-lg border border-borda bg-white px-2 py-1.5 text-sm outline-none focus:border-terracota";

  return (
    <div className="w-full rounded-card border border-borda bg-creme-claro p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={modo} onChange={(e) => setModo(e.target.value as "somar" | "definir")} className={campo}>
          <option value="somar">Somar / subtrair</option>
          <option value="definir">Definir total</option>
        </select>
        <input
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value.replace(/[^\d-]/g, "").slice(0, 7))}
          placeholder={modo === "somar" ? "ex.: 12 ou -3" : "ex.: 40"}
          inputMode="numeric"
          aria-label="Quantidade"
          className={`${campo} w-28`}
        />
        <select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoEstoque)} className={campo}>
          {MOTIVOS.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
        </select>
        <input
          value={observacao}
          onChange={(e) => setObservacao(e.target.value.slice(0, 120))}
          placeholder="Observação (opcional)"
          className={`${campo} min-w-40 flex-1`}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-texto-suave">
          {estoque} → <strong className={resultado < 0 ? "text-perigo" : "text-texto"}>{Number.isNaN(n) ? "?" : resultado}</strong>
        </span>
        <button type="button" onClick={aplicar} disabled={salvando} className="rounded-full bg-marrom px-4 py-1.5 text-sm font-semibold text-creme-claro hover:bg-texto disabled:opacity-50">
          {salvando ? "Salvando…" : "Aplicar"}
        </button>
        <button type="button" onClick={() => { setAberto(false); setErro(null); }} className="text-sm text-texto-suave hover:text-texto">
          Cancelar
        </button>
        {erro && <span className="text-sm text-perigo">{erro}</span>}
      </div>
    </div>
  );
}

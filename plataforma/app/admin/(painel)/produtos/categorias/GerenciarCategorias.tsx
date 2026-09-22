"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Categoria } from "@/lib/types";
import { alternarCategoria, moverCategoria, salvarCategoria } from "../acoes";

export function GerenciarCategorias({ categorias, contagem }: { categorias: Categoria[]; contagem: Record<string, number> }) {
  const router = useRouter();
  const [ocupado, iniciar] = useTransition();
  const [nova, setNova] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const executar = (fn: () => Promise<{ ok: boolean; erros?: { geral?: string } }>, depois?: () => void) =>
    iniciar(async () => {
      setErro(null);
      const r = await fn();
      if (!r.ok) setErro(r.erros?.geral ?? "Não foi possível concluir");
      else {
        depois?.();
        router.refresh();
      }
    });

  const botao = "h-8 w-8 rounded-lg border border-borda text-sm hover:border-terracota disabled:opacity-30";

  return (
    <div className={ocupado ? "pointer-events-none opacity-60" : ""}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (nova.trim()) executar(() => salvarCategoria(null, nova), () => setNova(""));
        }}
        className="mb-4 flex gap-2"
      >
        <input value={nova} onChange={(e) => setNova(e.target.value)} maxLength={60} placeholder="Nova categoria (ex.: Álbuns)" className="min-w-0 flex-1 rounded-xl border-[1.5px] border-borda bg-white px-3 py-2.5 outline-none focus:border-terracota" />
        <button className="rounded-xl bg-marrom px-4 font-semibold text-creme-claro hover:bg-texto">Criar</button>
      </form>
      {erro && <p className="mb-3 text-sm text-perigo">{erro}</p>}

      <ul className="divide-y divide-borda rounded-grande border border-borda bg-cartao">
        {categorias.map((c, i) => (
          <li key={c.id} className="flex items-center gap-3 p-3">
            <div className="flex flex-col gap-1">
              <button type="button" className={botao} disabled={i === 0} onClick={() => executar(() => moverCategoria(c.id, -1))} aria-label="Subir">↑</button>
              <button type="button" className={botao} disabled={i === categorias.length - 1} onClick={() => executar(() => moverCategoria(c.id, 1))} aria-label="Descer">↓</button>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-semibold ${c.ativa ? "" : "text-texto-fraco line-through"}`}>{c.nome}</p>
              <p className="text-xs text-texto-suave">
                {contagem[c.id] ?? 0} produto(s) publicado(s) · /categoria/{c.slug}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const nome = prompt("Novo nome da categoria:", c.nome);
                if (nome && nome.trim() !== c.nome) executar(() => salvarCategoria(c.id, nome));
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-terracota-claro"
            >
              Renomear
            </button>
            <button
              type="button"
              onClick={() => {
                if (c.ativa && !confirm(`Ocultar "${c.nome}" da loja? Os produtos dela continuam cadastrados.`)) return;
                executar(() => alternarCategoria(c.id, !c.ativa));
              }}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${c.ativa ? "text-texto-suave hover:bg-creme" : "text-sucesso hover:bg-sucesso-claro"}`}
            >
              {c.ativa ? "Ocultar" : "Mostrar"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

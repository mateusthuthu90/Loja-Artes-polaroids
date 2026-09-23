"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { StatusProduto } from "@/lib/types";
import { alterarStatusProduto, duplicarProduto, excluirProduto } from "./acoes";

export function AcoesProduto({ id, nome, status }: { id: string; nome: string; status: StatusProduto }) {
  const router = useRouter();
  const [ocupado, iniciar] = useTransition();

  const executar = (fn: () => Promise<{ ok: boolean; erros?: { geral?: string }; id?: string; desativado?: boolean }>, depois?: (r: { id?: string; desativado?: boolean }) => void) =>
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) {
        alert(r.erros?.geral ?? "Não foi possível concluir. Abra o produto e confira os campos.");
        return;
      }
      depois?.(r);
      router.refresh();
    });

  const publicar = () => executar(() => alterarStatusProduto(id, "publicado"));
  const despublicar = () => {
    if (confirm(`Tirar "${nome}" da loja? Ele volta a ser rascunho e some para os clientes na hora.`)) {
      executar(() => alterarStatusProduto(id, "rascunho"));
    }
  };
  const duplicar = () => executar(() => duplicarProduto(id), (r) => r.id && router.push(`/admin/produtos/${r.id}`));
  const excluir = () => {
    if (!confirm(`Excluir "${nome}"?\n\nSe ele já tiver pedidos, será apenas desativado (o histórico não pode quebrar).`)) return;
    if (!confirm("Tem certeza? Esta ação não pode ser desfeita.")) return;
    executar(() => excluirProduto(id), (r) => r.desativado && alert("Este produto tem pedidos, então foi DESATIVADO em vez de excluído."));
  };

  const botao = "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-40";
  return (
    <div className={`flex flex-wrap gap-1 ${ocupado ? "pointer-events-none opacity-50" : ""}`}>
      <Link href={`/admin/produtos/${id}`} prefetch={false} className={`${botao} bg-marrom text-creme-claro hover:bg-texto`}>Editar</Link>
      {status === "publicado" ? (
        <button type="button" onClick={despublicar} className={`${botao} border border-borda hover:border-terracota`}>Despublicar</button>
      ) : (
        <button type="button" onClick={publicar} className={`${botao} border border-sucesso text-sucesso hover:bg-sucesso-claro`}>Publicar</button>
      )}
      <button type="button" onClick={duplicar} className={`${botao} border border-borda hover:border-terracota`}>Duplicar</button>
      <button type="button" onClick={excluir} className={`${botao} text-perigo hover:bg-perigo/10`}>Excluir</button>
    </div>
  );
}

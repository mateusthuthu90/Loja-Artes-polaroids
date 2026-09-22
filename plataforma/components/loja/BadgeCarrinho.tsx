"use client";

import Link from "next/link";
import { useCarrinho } from "./carrinho";

export function BadgeCarrinho() {
  const { totalItens, carregado } = useCarrinho();
  return (
    <Link
      href="/carrinho"
      className="flex items-center gap-2 rounded-full border border-borda bg-cartao px-4 py-2 text-sm font-semibold text-texto shadow-suave hover:border-terracota"
      aria-label={`Carrinho com ${totalItens} ${totalItens === 1 ? "item" : "itens"}`}
    >
      <IconeSacola />
      <span className="hidden sm:inline">Carrinho</span>
      <span className="min-w-5 rounded-full bg-marrom px-1.5 text-center text-xs leading-5 text-creme-claro">
        {carregado ? totalItens : 0}
      </span>
    </Link>
  );
}

function IconeSacola() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 7h12l-1 13H7L6 7z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

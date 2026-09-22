"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Categoria } from "@/lib/types";

// No celular não existe "hover": as categorias aparecem abertas dentro do menu.
export function MenuMobile({ categorias }: { categorias: Categoria[] }) {
  const [aberto, setAberto] = useState(false);
  const [rotaAoAbrir, setRotaAoAbrir] = useState<string | null>(null);
  const rota = usePathname();

  // navegou para outra página → fecha o menu
  if (aberto && rotaAoAbrir !== rota) {
    setAberto(false);
  }

  const alternar = () => {
    setRotaAoAbrir(rota);
    setAberto((a) => !a);
  };

  const link = "block rounded-lg px-3 py-3 text-base hover:bg-terracota-claro";

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-borda bg-cartao text-xl"
      >
        {aberto ? "✕" : "☰"}
      </button>

      {aberto && (
        <nav className="absolute inset-x-0 top-20 border-b border-borda bg-creme-claro px-4 pb-4 shadow-media">
          <Link href="/" className={link}>
            Início
          </Link>
          <Link href="/produtos" className={`${link} font-semibold`}>
            Todos os produtos
          </Link>
          <div className="ml-3 border-l border-borda pl-2">
            {categorias.map((c) => (
              <Link key={c.id} href={`/categoria/${c.slug}`} className={`${link} text-texto-suave`}>
                {c.nome}
              </Link>
            ))}
          </div>
          <Link href="/#como-funciona" className={link}>
            Como funciona
          </Link>
          <Link href="/carrinho" className={link}>
            Carrinho
          </Link>
        </nav>
      )}
    </div>
  );
}

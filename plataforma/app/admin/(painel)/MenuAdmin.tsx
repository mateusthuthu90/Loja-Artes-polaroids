"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Ícones de linha (sem emoji), no mesmo estilo dos ícones da loja.
const ICONES: Record<string, ReactNode> = {
  dashboard: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M2 20h20" />
    </>
  ),
  pedidos: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </>
  ),
  produtos: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7l1.5-3h5L16 7" />
      <circle cx="12" cy="13.5" r="3" />
    </>
  ),
  home: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M7 13h5" />
      <path d="M7 16.5h8" />
    </>
  ),
  estoque: (
    <>
      <path d="M3 8.5L12 4l9 4.5v7L12 20l-9-4.5z" />
      <path d="M3 8.5L12 13l9-4.5" />
      <path d="M12 13v7" />
    </>
  ),
  descontos: (
    <>
      <path d="M20.5 11.5L12.5 3.5H4v8.5l8 8z" />
      <circle cx="8" cy="8" r="1.4" />
      <path d="M10 15l5-5" />
    </>
  ),
  configuracoes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
};

const ITENS = [
  { href: "/admin", rotulo: "Dashboard", icone: "dashboard" },
  { href: "/admin/pedidos", rotulo: "Pedidos", icone: "pedidos" },
  { href: "/admin/home", rotulo: "Home", icone: "home" },
  { href: "/admin/produtos", rotulo: "Produtos", icone: "produtos" },
  { href: "/admin/estoque", rotulo: "Estoque", icone: "estoque" },
  { href: "/admin/descontos", rotulo: "Descontos", icone: "descontos" },
  { href: "/admin/configuracoes", rotulo: "Configurações", icone: "configuracoes" },
];

export function MenuAdmin() {
  const rota = usePathname();
  const ativo = (href: string) => (href === "/admin" ? rota === "/admin" : rota.startsWith(href));

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {ITENS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          // Sem prefetch: este menu fica visível em toda tela do painel, então o
          // Next tentaria pré-carregar as 7 páginas de uma vez. Cada uma delas é
          // dinâmica e faz as próprias consultas, o que vira uma rajada de
          // renderizações a cada carregamento — no plano Free do Workers
          // (10ms de CPU por requisição) isso derruba o painel.
          prefetch={false}
          aria-current={ativo(i.href) ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            ativo(i.href) ? "bg-marrom text-creme-claro" : "text-texto-suave hover:bg-terracota-claro hover:text-marrom"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px] shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {ICONES[i.icone]}
          </svg>
          {i.rotulo}
        </Link>
      ))}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/admin", rotulo: "Dashboard", icone: "📊" },
  { href: "/admin/pedidos", rotulo: "Pedidos", icone: "🧾" },
  { href: "/admin/produtos", rotulo: "Produtos", icone: "📷" },
  { href: "/admin/estoque", rotulo: "Estoque", icone: "📦" },
  { href: "/admin/configuracoes", rotulo: "Configurações", icone: "⚙️" },
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
          aria-current={ativo(i.href) ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            ativo(i.href) ? "bg-marrom text-creme-claro" : "text-texto-suave hover:bg-terracota-claro hover:text-marrom"
          }`}
        >
          <span aria-hidden>{i.icone}</span>
          {i.rotulo}
        </Link>
      ))}
    </nav>
  );
}

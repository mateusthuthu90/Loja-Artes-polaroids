import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { exigirAdmin } from "@/lib/admin/sessao";
import { sair } from "../acoes";
import { MenuAdmin } from "./MenuAdmin";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s | Painel Artes Polaroids" },
  robots: { index: false, follow: false },
};

// Painel sempre renderizado na hora (dados do dia + sessão do usuário)
export const dynamic = "force-dynamic";

export default async function LayoutPainel({ children }: LayoutProps<"/admin">) {
  const { nome } = await exigirAdmin();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-borda bg-creme-claro p-3 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col md:border-b-0 md:border-r md:p-5">
        <div className="mb-3 flex items-center justify-between md:mb-8 md:block">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/images/brand/logo.png" alt="Artes Polaroids" width={120} height={48} className="h-10 w-auto object-contain md:h-12" />
          </Link>
          <form action={sair} className="md:hidden">
            <button type="submit" className="rounded-full border border-borda px-3 py-1.5 text-xs font-semibold text-texto-suave">
              Sair
            </button>
          </form>
        </div>
        <MenuAdmin />
        <div className="mt-auto hidden border-t border-borda pt-4 text-sm md:block">
          <p className="text-texto-suave">Olá, <strong className="text-texto">{nome}</strong></p>
          <Link href="/" target="_blank" className="mt-1 block text-xs text-terracota hover:underline">
            Ver loja ↗
          </Link>
          <form action={sair} className="mt-3">
            <button type="submit" className="w-full rounded-full border border-borda px-3 py-2 text-sm font-semibold text-texto-suave hover:border-perigo hover:text-perigo">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}

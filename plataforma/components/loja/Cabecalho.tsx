import Image from "next/image";
import Link from "next/link";
import type { Categoria } from "@/lib/types";
import { BadgeCarrinho } from "./BadgeCarrinho";
import { MenuMobile } from "./MenuMobile";

export function Cabecalho({ categorias }: { categorias: Categoria[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-borda bg-creme/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Artes Polaroids — início" className="shrink-0">
          <Image
            src="/images/brand/logo.png"
            alt="Artes Polaroids"
            width={180}
            height={72}
            className="h-14 w-auto object-contain sm:h-16"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 text-[0.95rem] font-medium text-texto-suave md:flex">
          <Link href="/" className="hover:text-texto">
            Início
          </Link>
          <div className="group relative">
            <Link href="/produtos" className="hover:text-texto">
              Produtos ▾
            </Link>
            {categorias.length > 0 && (
              // pt-3 cria uma "ponte" invisível: o menu não some ao descer o mouse
              <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="min-w-52 rounded-card border border-borda bg-cartao p-2 shadow-media">
                  <Link
                    href="/produtos"
                    className="block rounded-lg px-3 py-2 hover:bg-terracota-claro hover:text-marrom"
                  >
                    Todos os produtos
                  </Link>
                  {categorias.map((c) => (
                    <Link
                      key={c.id}
                      href={`/categoria/${c.slug}`}
                      className="block rounded-lg px-3 py-2 hover:bg-terracota-claro hover:text-marrom"
                    >
                      {c.nome}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link href="/#como-funciona" className="hover:text-texto">
            Como funciona
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <BadgeCarrinho />
          <MenuMobile categorias={categorias} />
        </div>
      </div>
    </header>
  );
}

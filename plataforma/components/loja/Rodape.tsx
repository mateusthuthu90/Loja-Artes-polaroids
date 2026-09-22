import Image from "next/image";
import Link from "next/link";
import type { ConfigLoja } from "@/lib/catalogo";
import { formatarWhatsApp, linkWhatsApp } from "@/lib/whatsapp";

export function Rodape({ contato }: { contato: ConfigLoja["contato"] }) {
  return (
    <footer className="mt-auto border-t border-borda bg-creme-claro">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Image
            src="/images/brand/logo.png"
            alt="Artes Polaroids"
            width={180}
            height={72}
            className="mb-3 h-16 w-auto object-contain"
          />
          <p className="max-w-sm text-sm text-texto-suave">
            Transformamos suas fotos favoritas em lembranças que duram para sempre. Polaroids,
            quadros e presentes feitos à mão, com carinho.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <h4 className="mb-1 font-sans text-sm font-bold uppercase tracking-wider">Navegação</h4>
          <Link href="/produtos" className="text-texto-suave hover:text-texto">
            Produtos
          </Link>
          <Link href="/carrinho" className="text-texto-suave hover:text-texto">
            Carrinho
          </Link>
          <Link href="/#como-funciona" className="text-texto-suave hover:text-texto">
            Como funciona
          </Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <h4 className="mb-1 font-sans text-sm font-bold uppercase tracking-wider">Contato</h4>
          <a href={linkWhatsApp(contato.whatsapp)} target="_blank" rel="noopener" className="text-texto-suave hover:text-texto">
            WhatsApp: {formatarWhatsApp(contato.whatsapp)}
          </a>
          <a href={`https://instagram.com/${contato.instagram}`} target="_blank" rel="noopener" className="text-texto-suave hover:text-texto">
            @{contato.instagram}
          </a>
          <a href={`mailto:${contato.email}`} className="text-texto-suave hover:text-texto">
            {contato.email}
          </a>
        </div>
      </div>
      <p className="border-t border-borda py-5 text-center text-xs text-texto-fraco">
        © {new Date().getFullYear()} Artes Polaroids. Feito com ❤️ para guardar memórias.
      </p>
    </footer>
  );
}

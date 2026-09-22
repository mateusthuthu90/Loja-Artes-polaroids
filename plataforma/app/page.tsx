// Fase 0 — página de verificação da fundação.
// Confirma que o Next.js enxerga o Supabase e que o catálogo publicado é lido via RLS.
// Será substituída pela home real da loja no Prompt 3 (catálogo).
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/env";
import { formatarBRL, precoMinimo, temPrecoVariavel } from "@/lib/preco";
import type { Produto } from "@/lib/types";

export default async function Home() {
  const configurado = supabaseConfigurado();
  let produtos: Produto[] = [];
  let erro: string | null = null;

  if (configurado) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .order("ordem");
    if (error) erro = error.message;
    else produtos = (data ?? []) as Produto[];
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-8 flex items-center gap-4">
        <Image
          src="/images/brand/logo.png"
          alt="Artes Polaroids"
          width={64}
          height={64}
          className="rounded-full"
          priority
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-terracota">
            Plataforma · Fase 0
          </p>
          <h1 className="text-3xl font-semibold">Artes Polaroids</h1>
        </div>
      </header>

      <section className="mb-8 rounded-card border border-borda bg-cartao p-5 shadow-suave">
        <h2 className="mb-3 text-xl font-semibold">Status da fundação</h2>
        <ul className="space-y-1 text-sm">
          <li>✅ Next.js + Tailwind com a identidade visual da loja</li>
          <li>
            {configurado ? "✅" : "⏳"} Supabase{" "}
            {configurado
              ? "configurado"
              : "não configurado — preencha o .env.local (veja o .env.example)"}
          </li>
          {configurado && (
            <li>
              {erro ? `❌ Erro ao ler o catálogo: ${erro}` : `✅ ${produtos.length} produtos publicados lidos do banco`}
            </li>
          )}
        </ul>
      </section>

      {produtos.length > 0 && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {produtos.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-card border border-borda bg-cartao shadow-suave"
            >
              <div className="relative aspect-square bg-terracota-claro">
                {p.imagens[0] && (
                  <Image
                    src={p.imagens[0]}
                    alt={p.nome}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="p-3">
                <h3 className="text-base font-semibold">{p.nome}</h3>
                <p className="text-sm text-texto-suave">
                  {temPrecoVariavel(p) && "A partir de "}
                  {formatarBRL(precoMinimo(p))}
                </p>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

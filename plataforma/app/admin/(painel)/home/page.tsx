import Link from "next/link";
import { GerenciarBanners } from "@/components/admin/GerenciarBanners";
import { GerenciarSecoes } from "@/components/admin/GerenciarSecoes";
import { EditorTextosHome } from "@/components/admin/EditorTextosHome";
import { exigirAdmin } from "@/lib/admin/sessao";
import { TEXTOS_HOME_PADRAO } from "@/lib/catalogo";
import type { BannerHome, Categoria, Produto, SecaoHome, TextosHome } from "@/lib/types";

export const metadata = { title: "Home" };

const ABAS = [
  { chave: "banners", rotulo: "Banners" },
  { chave: "secoes", rotulo: "Seções" },
  { chave: "textos", rotulo: "Textos" },
] as const;

type Aba = (typeof ABAS)[number]["chave"];

export default async function PaginaHome({ searchParams }: PageProps<"/admin/home">) {
  const { supabase } = await exigirAdmin();
  const sp = await searchParams;
  const aba: Aba = ABAS.some((a) => a.chave === sp.aba) ? (sp.aba as Aba) : "banners";

  // uma consulta por aba seria mais enxuta, mas a tela é pequena e trocar de
  // aba sem recarregar dado vale mais que economizar duas consultas
  const [{ data: banners }, { data: secoes }, { data: categorias }, { data: produtos }, { data: config }] =
    await Promise.all([
      supabase.from("home_banners").select("*").order("ordem").order("criado_em"),
      supabase.from("home_secoes").select("*").order("ordem").order("criado_em"),
      supabase.from("categorias").select("*").order("ordem"),
      supabase.from("produtos").select("id, nome, imagens, status").order("nome"),
      supabase.from("configuracoes").select("valor").eq("chave", "home_textos").maybeSingle(),
    ]);

  const textos: TextosHome = { ...TEXTOS_HOME_PADRAO, ...((config?.valor as Partial<TextosHome>) ?? {}) };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Home</h1>
        <Link href="/" target="_blank" className="text-sm font-semibold text-terracota hover:underline">
          Ver a home ↗
        </Link>
      </div>
      <p className="mb-5 text-sm text-texto-suave">
        Tudo que aparece na página inicial é montado aqui. As mudanças entram no ar assim que você salva.
      </p>

      <nav className="mb-6 flex gap-1 border-b border-borda">
        {ABAS.map((a) => (
          <Link
            key={a.chave}
            href={`/admin/home?aba=${a.chave}`}
            aria-current={aba === a.chave ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              aba === a.chave
                ? "border-marrom text-marrom"
                : "border-transparent text-texto-suave hover:text-marrom"
            }`}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>

      {aba === "banners" && <GerenciarBanners banners={(banners ?? []) as BannerHome[]} />}
      {aba === "secoes" && (
        <GerenciarSecoes
          secoes={(secoes ?? []) as SecaoHome[]}
          categorias={(categorias ?? []) as Categoria[]}
          produtos={(produtos ?? []) as Pick<Produto, "id" | "nome" | "imagens" | "status">[]}
        />
      )}
      {aba === "textos" && <EditorTextosHome inicial={textos} />}
    </div>
  );
}

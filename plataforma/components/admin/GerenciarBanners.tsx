"use client";

// Banners da home: criar, escrever, enviar as fotos, reordenar e tirar do ar.
// O que se vê aqui é o que aparece no topo da loja — inclusive a inclinação
// das polaroids e a cor do fundo.
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icone } from "@/components/Icone";
import { EditorFoto } from "./EditorFoto";
import { CampoLinha, CampoTexto, Aviso, botaoFantasma, botaoPrincipal } from "./campos";
import {
  alternarBanner,
  excluirBanner,
  moverBanner,
  salvarBanner,
} from "@/app/admin/(painel)/home/acoes";
import {
  HALOS,
  LIMITES_BANNER,
  bannerVazio,
  validarBanner,
  type BannerForm,
  type ErrosBanner,
} from "@/lib/home-form";
import { createClient } from "@/lib/supabase/client";
import type { BannerHome } from "@/lib/types";

/** Banner do banco → formulário. */
function paraFormulario(b: BannerHome): BannerForm {
  return {
    id: b.id,
    selo: b.selo,
    titulo: b.titulo,
    destaque: b.destaque,
    subtitulo: b.subtitulo,
    legenda: b.legenda,
    cta_texto: b.cta_texto,
    cta_link: b.cta_link,
    imagem: b.imagem,
    imagem_alt: b.imagem_alt,
    apoio: b.apoio,
    apoio_alt: b.apoio_alt,
    halo: b.halo,
    giro_principal: Number(b.giro_principal),
    giro_apoio: Number(b.giro_apoio),
    ativo: b.ativo,
  };
}

export function GerenciarBanners({ banners }: { banners: BannerHome[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<BannerForm | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  function rodar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setAviso(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setAviso(r.erro ?? "Não foi possível concluir.");
      else router.refresh();
    });
  }

  if (editando) {
    return (
      <FormBanner
        inicial={editando}
        onCancelar={() => setEditando(null)}
        onSalvo={() => {
          setEditando(null);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-texto-suave">
          {banners.length} {banners.length === 1 ? "banner" : "banners"} — a ordem aqui é a ordem em que giram na loja.
        </p>
        <button type="button" onClick={() => setEditando(bannerVazio())} className={botaoPrincipal}>
          Novo banner
        </button>
      </div>

      {aviso && <Aviso tipo="erro">{aviso}</Aviso>}

      {banners.length === 0 ? (
        <p className="rounded-grande border border-borda bg-cartao p-8 text-center text-texto-suave">
          Nenhum banner ainda. Crie o primeiro para dar as boas-vindas a quem chega.
        </p>
      ) : (
        <ul className="space-y-3">
          {banners.map((b, i) => (
            <li
              key={b.id}
              className={`flex gap-4 rounded-grande border border-borda bg-cartao p-3 sm:p-4 ${b.ativo ? "" : "opacity-60"}`}
            >
              <div className="relative h-24 w-[4.8rem] shrink-0 overflow-hidden rounded-lg bg-creme">
                {b.imagem && <Image src={b.imagem} alt="" fill sizes="80px" className="object-cover" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {b.selo && (
                    <span className="rounded-full bg-terracota-claro px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-terracota">
                      {b.selo}
                    </span>
                  )}
                  {!b.ativo && (
                    <span className="rounded-full bg-creme px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-texto-suave">
                      Fora do ar
                    </span>
                  )}
                </div>
                <p className="mt-1 font-semibold">
                  {b.titulo} {b.destaque && <em className="text-terracota">{b.destaque}</em>}
                </p>
                <p className="line-clamp-2 text-sm text-texto-suave">{b.subtitulo}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <button type="button" onClick={() => setEditando(paraFormulario(b))} className={botaoFantasma}>
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => rodar(() => alternarBanner(b.id, !b.ativo))}
                    className={botaoFantasma}
                  >
                    {b.ativo ? "Tirar do ar" : "Colocar no ar"}
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      if (confirm(`Apagar o banner "${b.titulo}"? Não dá para desfazer.`)) {
                        rodar(() => excluirBanner(b.id));
                      }
                    }}
                    className={`${botaoFantasma} hover:border-perigo hover:text-perigo`}
                  >
                    Apagar
                  </button>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-1">
                <BotaoOrdem
                  rotulo="Subir"
                  desabilitado={i === 0 || ocupado}
                  onClick={() => rodar(() => moverBanner(b.id, -1))}
                  giro="-rotate-90"
                />
                <BotaoOrdem
                  rotulo="Descer"
                  desabilitado={i === banners.length - 1 || ocupado}
                  onClick={() => rodar(() => moverBanner(b.id, 1))}
                  giro="rotate-90"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BotaoOrdem({
  rotulo,
  desabilitado,
  onClick,
  giro,
}: {
  rotulo: string;
  desabilitado: boolean;
  onClick: () => void;
  giro: string;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={desabilitado}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-borda text-texto-suave transition hover:border-terracota hover:text-marrom disabled:opacity-30 disabled:hover:border-borda"
    >
      <Icone nome="seta" className={`h-3.5 w-3.5 ${giro}`} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

function FormBanner({
  inicial,
  onCancelar,
  onSalvo,
}: {
  inicial: BannerForm;
  onCancelar: () => void;
  onSalvo: () => void;
}) {
  const [f, setF] = useState<BannerForm>(inicial);
  const [tentou, setTentou] = useState(false);
  const [errosServidor, setErrosServidor] = useState<ErrosBanner>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ajustando, setAjustando] = useState<{ blob: Blob; nome: string; campo: "imagem" | "apoio" } | null>(null);
  const [salvando, iniciar] = useTransition();

  const erros: ErrosBanner = tentou ? { ...validarBanner(f), ...errosServidor } : errosServidor;

  const set = <K extends keyof BannerForm>(campo: K, valor: BannerForm[K]) => {
    setErrosServidor({});
    setF((a) => ({ ...a, [campo]: valor }));
  };

  /** Envia a foto já enquadrada para o bucket público "site". */
  async function enviar(blob: Blob, campo: "imagem" | "apoio") {
    setAjustando(null);
    setEnviando(true);
    setAviso(null);
    try {
      const storage = createClient().storage.from("site");
      const caminho = `banners/${crypto.randomUUID()}.jpg`;
      const { error } = await storage.upload(caminho, blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
      });
      if (error) throw new Error("Falha no envio: " + error.message);
      set(campo, storage.getPublicUrl(caminho).data.publicUrl);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Não foi possível enviar a foto.");
    } finally {
      setEnviando(false);
    }
  }

  function salvar() {
    setAviso(null);
    setTentou(true);
    setErrosServidor({});
    if (Object.keys(validarBanner(f)).length) {
      setAviso("Confira os campos marcados em vermelho.");
      return;
    }
    iniciar(async () => {
      const r = await salvarBanner(f);
      if (!r.ok) {
        setErrosServidor(r.erros);
        setAviso(r.erros.geral ?? "Confira os campos marcados em vermelho.");
        return;
      }
      onSalvo();
    });
  }

  return (
    <div className="rounded-grande border border-borda bg-cartao p-4 sm:p-6">
      <h2 className="mb-1 text-xl font-semibold">{f.id ? "Editar banner" : "Novo banner"}</h2>
      <p className="mb-5 text-sm text-texto-suave">
        A foto principal aparece na polaroid grande, em pé (formato 4 × 5). A segunda é opcional e fica atrás, menorzinha.
      </p>

      {aviso && <Aviso tipo="erro">{aviso}</Aviso>}

      <div className="grid gap-6 md:grid-cols-2">
        {/* ---------- fotos ---------- */}
        <div className="space-y-4">
          <FotoBanner
            rotulo="Foto principal"
            url={f.imagem}
            erro={erros.imagem}
            obrigatoria
            ocupado={enviando}
            onEscolher={(blob, nome) => setAjustando({ blob, nome, campo: "imagem" })}
            onRemover={() => set("imagem", "")}
          />
          <CampoLinha
            rotulo="Descrição da foto principal"
            ajuda="Para leitores de tela e para o Google. Ex.: “Caixa presente com varal de polaroids”."
            valor={f.imagem_alt}
            maximo={LIMITES_BANNER.alt}
            erro={erros.imagem_alt}
            onChange={(v) => set("imagem_alt", v)}
          />

          <FotoBanner
            rotulo="Segunda foto (opcional)"
            url={f.apoio ?? ""}
            erro={undefined}
            ocupado={enviando}
            onEscolher={(blob, nome) => setAjustando({ blob, nome, campo: "apoio" })}
            onRemover={() => {
              set("apoio", null);
              set("apoio_alt", "");
            }}
          />
          {f.apoio && (
            <CampoLinha
              rotulo="Descrição da segunda foto"
              valor={f.apoio_alt}
              maximo={LIMITES_BANNER.alt}
              erro={erros.apoio_alt}
              onChange={(v) => set("apoio_alt", v)}
            />
          )}
        </div>

        {/* ---------- textos ---------- */}
        <div className="space-y-4">
          <CampoLinha
            rotulo="Selo"
            ajuda="A tarjinha acima do título. Ex.: “Presente que emociona”."
            valor={f.selo}
            maximo={LIMITES_BANNER.selo}
            erro={erros.selo}
            onChange={(v) => set("selo", v)}
          />
          <CampoLinha
            rotulo="Título"
            valor={f.titulo}
            maximo={LIMITES_BANNER.titulo}
            erro={erros.titulo}
            onChange={(v) => set("titulo", v)}
          />
          <CampoLinha
            rotulo="Final do título em destaque"
            ajuda="Sai em itálico, logo depois do título. Deixe vazio se não quiser."
            valor={f.destaque}
            maximo={LIMITES_BANNER.destaque}
            erro={erros.destaque}
            onChange={(v) => set("destaque", v)}
          />
          <CampoTexto
            rotulo="Frase de apoio"
            valor={f.subtitulo}
            maximo={LIMITES_BANNER.subtitulo}
            erro={erros.subtitulo}
            onChange={(v) => set("subtitulo", v)}
          />
          <CampoLinha
            rotulo="Legenda na polaroid"
            ajuda="Escrita à mão na borda branca da foto. Ex.: “pra você”."
            valor={f.legenda}
            maximo={LIMITES_BANNER.legenda}
            erro={erros.legenda}
            onChange={(v) => set("legenda", v)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoLinha
              rotulo="Texto do botão"
              valor={f.cta_texto}
              maximo={LIMITES_BANNER.cta_texto}
              erro={erros.cta_texto}
              onChange={(v) => set("cta_texto", v)}
            />
            <CampoLinha
              rotulo="O botão leva para"
              ajuda="Ex.: /produtos ou /categoria/presentes"
              valor={f.cta_link}
              erro={erros.cta_link}
              onChange={(v) => set("cta_link", v)}
            />
          </div>
        </div>
      </div>

      {/* ---------- acabamento ---------- */}
      <fieldset className="mt-6 rounded-card border border-borda p-4">
        <legend className="px-2 text-sm font-semibold">Acabamento</legend>

        <div className="mb-4">
          <span className="mb-2 block text-sm font-semibold">Cor do fundo</span>
          <div className="flex flex-wrap gap-2">
            {HALOS.map((h) => (
              <button
                key={h.valor}
                type="button"
                onClick={() => set("halo", h.valor)}
                aria-pressed={f.halo === h.valor}
                className={`flex items-center gap-2 rounded-full border-[1.5px] px-3 py-1.5 text-sm font-semibold transition ${
                  f.halo === h.valor ? "border-marrom bg-creme-claro" : "border-borda hover:border-terracota"
                }`}
              >
                <span className="h-4 w-4 rounded-full border border-borda" style={{ background: h.valor }} />
                {h.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoGiro
            rotulo="Inclinação da foto principal"
            valor={f.giro_principal}
            erro={erros.giro_principal}
            onChange={(v) => set("giro_principal", v)}
          />
          <CampoGiro
            rotulo="Inclinação da segunda foto"
            valor={f.giro_apoio}
            erro={erros.giro_apoio}
            onChange={(v) => set("giro_apoio", v)}
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={f.ativo}
            onChange={(e) => set("ativo", e.target.checked)}
            className="h-4 w-4 accent-marrom"
          />
          Mostrar este banner na loja
        </label>
      </fieldset>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancelar} className={botaoFantasma}>
          Cancelar
        </button>
        <button type="button" onClick={salvar} disabled={salvando || enviando} className={botaoPrincipal}>
          {salvando ? "Salvando…" : "Salvar banner"}
        </button>
      </div>

      {ajustando && (
        <EditorFoto
          fonte={ajustando.blob}
          titulo={ajustando.nome}
          formato="banner"
          onConcluir={(blob) => enviar(blob, ajustando.campo)}
          onCancelar={() => setAjustando(null)}
        />
      )}
    </div>
  );
}

function FotoBanner({
  rotulo,
  url,
  erro,
  obrigatoria = false,
  ocupado,
  onEscolher,
  onRemover,
}: {
  rotulo: string;
  url: string;
  erro?: string;
  obrigatoria?: boolean;
  ocupado: boolean;
  onEscolher: (blob: Blob, nome: string) => void;
  onRemover: () => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold">
        {rotulo} {obrigatoria && <span className="text-perigo">*</span>}
      </span>

      <div className="flex items-start gap-3">
        <div className="relative h-40 w-32 shrink-0 overflow-hidden rounded-card border border-borda bg-creme">
          {url ? (
            <Image src={url} alt="" fill sizes="128px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center px-2 text-center text-xs text-texto-fraco">
              sem foto
            </span>
          )}
        </div>

        <div className="space-y-2">
          <label className={`${botaoFantasma} cursor-pointer`}>
            {ocupado ? "Enviando…" : url ? "Trocar foto" : "Enviar foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={ocupado}
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                e.target.value = ""; // permite escolher o mesmo arquivo de novo
                if (arquivo) onEscolher(arquivo, arquivo.name);
              }}
            />
          </label>
          {url && (
            <button type="button" onClick={onRemover} className={`${botaoFantasma} block hover:border-perigo hover:text-perigo`}>
              Remover
            </button>
          )}
        </div>
      </div>

      {erro && <p className="mt-1.5 text-sm text-perigo">{erro}</p>}
    </div>
  );
}

function CampoGiro({
  rotulo,
  valor,
  erro,
  onChange,
}: {
  rotulo: string;
  valor: number;
  erro?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-semibold">
        {rotulo} <span className="font-normal text-texto-suave">({valor}°)</span>
      </span>
      <input
        type="range"
        min={-15}
        max={15}
        step={0.5}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-marrom"
      />
      {erro && <p className="mt-1 text-sm text-perigo">{erro}</p>}
    </label>
  );
}

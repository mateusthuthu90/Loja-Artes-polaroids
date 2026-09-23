"use client";

// Banners da home: criar, escrever, enviar a foto, reordenar e tirar do ar.
// O que se vê aqui é o que aparece no topo da loja — cada banner é uma foto
// sangrada com o título deitado na esquerda e a frase de apoio embaixo, à
// direita.
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icone } from "@/components/Icone";
import { EditorFoto } from "./EditorFoto";
import { CampoLinha, CampoSelecao, CampoTexto, Check, Aviso, botaoFantasma, botaoPrincipal } from "./campos";
import {
  alternarBanner,
  excluirBanner,
  moverBanner,
  salvarBanner,
} from "@/app/admin/(painel)/home/acoes";
import {
  FOCOS,
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
    titulo: b.titulo,
    subtitulo: b.subtitulo,
    cta_link: b.cta_link,
    imagem: b.imagem,
    imagem_alt: b.imagem_alt,
    foco: b.foco ?? "centro",
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
              {/* miniatura na mesma proporção do banner no desktop */}
              <div className="relative aspect-[1390/520] w-32 shrink-0 self-start overflow-hidden rounded-lg bg-creme sm:w-44">
                {b.imagem && <Image src={b.imagem} alt="" fill sizes="176px" className="object-cover" />}
              </div>

              <div className="min-w-0 flex-1">
                {!b.ativo && (
                  <span className="rounded-full bg-creme px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-texto-suave">
                    Fora do ar
                  </span>
                )}
                <p className="mt-1 font-semibold lowercase">{b.titulo}</p>
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
  const [ajustando, setAjustando] = useState<{ blob: Blob; nome: string } | null>(null);
  const [salvando, iniciar] = useTransition();

  const erros: ErrosBanner = tentou ? { ...validarBanner(f), ...errosServidor } : errosServidor;

  const set = <K extends keyof BannerForm>(campo: K, valor: BannerForm[K]) => {
    setErrosServidor({});
    setF((a) => ({ ...a, [campo]: valor }));
  };

  /** Envia a foto já enquadrada para o bucket público "site". */
  async function enviar(blob: Blob) {
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
      set("imagem", storage.getPublicUrl(caminho).data.publicUrl);
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
        A foto ocupa o banner inteiro. O título sai deitado na faixa esquerda, em letras minúsculas, e a
        frase de apoio aparece em caixa alta no canto inferior direito.
      </p>

      {aviso && <Aviso tipo="erro">{aviso}</Aviso>}

      <div className="grid gap-6 md:grid-cols-2">
        {/* ---------- foto ---------- */}
        <div className="space-y-4">
          <FotoBanner
            url={f.imagem}
            erro={erros.imagem}
            ocupado={enviando}
            onEscolher={(blob, nome) => setAjustando({ blob, nome })}
            onRemover={() => set("imagem", "")}
          />
          <CampoLinha
            rotulo="Descrição da foto"
            ajuda="Para leitores de tela e para o Google. Ex.: “Mão segurando um porta-retrato diante de polaroids em leque”."
            valor={f.imagem_alt}
            maximo={LIMITES_BANNER.alt}
            erro={erros.imagem_alt}
            onChange={(v) => set("imagem_alt", v)}
          />
          <CampoSelecao
            rotulo="Onde está o assunto da foto"
            ajuda="No celular o banner é alto e no computador é largo: isto diz que pedaço da foto não pode ser cortado."
            valor={f.foco}
            opcoes={FOCOS}
            erro={erros.foco}
            onChange={(v) => set("foco", v)}
          />
        </div>

        {/* ---------- textos ---------- */}
        <div className="space-y-4">
          <CampoLinha
            rotulo="Título deitado"
            ajuda="Duas ou três palavras. Sai sempre em letras minúsculas. Ex.: “fotos polaroid”."
            valor={f.titulo}
            maximo={LIMITES_BANNER.titulo}
            erro={erros.titulo}
            onChange={(v) => set("titulo", v)}
          />
          <CampoTexto
            rotulo="Frase de apoio"
            ajuda="Aparece em caixa alta, no canto inferior direito. Uma ou duas frases curtas."
            valor={f.subtitulo}
            maximo={LIMITES_BANNER.subtitulo}
            erro={erros.subtitulo}
            linhas={3}
            onChange={(v) => set("subtitulo", v)}
          />
          <CampoLinha
            rotulo="O banner leva para"
            ajuda="A foto inteira é clicável. Ex.: /produtos, /categoria/quadros ou #como-funciona"
            valor={f.cta_link}
            erro={erros.cta_link}
            onChange={(v) => set("cta_link", v)}
          />
          <Check marcado={f.ativo} onChange={(v) => set("ativo", v)}>
            Mostrar este banner na loja
          </Check>
        </div>
      </div>

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
          onConcluir={enviar}
          onCancelar={() => setAjustando(null)}
        />
      )}
    </div>
  );
}

function FotoBanner({
  url,
  erro,
  ocupado,
  onEscolher,
  onRemover,
}: {
  url: string;
  erro?: string;
  ocupado: boolean;
  onEscolher: (blob: Blob, nome: string) => void;
  onRemover: () => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold">
        Foto do banner <span className="text-perigo">*</span>
      </span>

      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-card border border-borda bg-creme">
        {url ? (
          <Image src={url} alt="" fill sizes="(max-width: 768px) 92vw, 380px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center px-2 text-center text-xs text-texto-fraco">
            sem foto
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
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
          <button type="button" onClick={onRemover} className={`${botaoFantasma} hover:border-perigo hover:text-perigo`}>
            Remover
          </button>
        )}
      </div>

      {erro && <p className="mt-1.5 text-sm text-perigo">{erro}</p>}
    </div>
  );
}

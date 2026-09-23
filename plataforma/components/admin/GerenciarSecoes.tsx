"use client";

// Seções da home: as faixas de produtos que ficam abaixo do banner.
// Cada seção sabe sozinha quais produtos mostrar (a "fonte"), então uma faixa
// de promoção aparece e some junto com a promoção, sem ninguém mexer aqui.
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Icone } from "@/components/Icone";
import { Aviso, CampoLinha, CampoSelecao, CampoTexto, Check, botaoFantasma, botaoPrincipal } from "./campos";
import { alternarSecao, excluirSecao, moverSecao, salvarSecao } from "@/app/admin/(painel)/home/acoes";
import {
  FONTES,
  LIMITES_SECAO,
  secaoVazia,
  validarSecao,
  type ErrosSecao,
  type SecaoForm,
} from "@/lib/home-form";
import type { Categoria, FonteSecao, Produto, SecaoHome } from "@/lib/types";

type ProdutoResumo = Pick<Produto, "id" | "nome" | "imagens" | "status">;

function paraFormulario(s: SecaoHome): SecaoForm {
  return {
    id: s.id,
    selo: s.selo,
    titulo: s.titulo,
    subtitulo: s.subtitulo,
    fonte: s.fonte,
    categoria_id: s.categoria_id,
    produto_ids: s.produto_ids ?? [],
    limite: s.limite,
    layout: s.layout,
    fundo: s.fundo,
    link_texto: s.link_texto,
    link_href: s.link_href,
    ativa: s.ativa,
  };
}

function descreverFonte(s: SecaoHome, categorias: Categoria[]): string {
  if (s.fonte === "categoria") {
    return categorias.find((c) => c.id === s.categoria_id)?.nome ?? "categoria apagada";
  }
  if (s.fonte === "manual") return `${s.produto_ids.length} produto(s) escolhido(s)`;
  return FONTES.find((f) => f.valor === s.fonte)?.nome ?? s.fonte;
}

export function GerenciarSecoes({
  secoes,
  categorias,
  produtos,
}: {
  secoes: SecaoHome[];
  categorias: Categoria[];
  produtos: ProdutoResumo[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<SecaoForm | null>(null);
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
      <FormSecao
        inicial={editando}
        categorias={categorias}
        produtos={produtos}
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
          {secoes.length} {secoes.length === 1 ? "seção" : "seções"} — aparecem na home nesta ordem, logo abaixo do banner.
        </p>
        <button type="button" onClick={() => setEditando(secaoVazia())} className={botaoPrincipal}>
          Nova seção
        </button>
      </div>

      {aviso && <Aviso tipo="erro">{aviso}</Aviso>}

      {secoes.length === 0 ? (
        <p className="rounded-grande border border-borda bg-cartao p-8 text-center text-texto-suave">
          Nenhuma seção ainda. Crie uma para mostrar produtos na página inicial.
        </p>
      ) : (
        <ul className="space-y-3">
          {secoes.map((s, i) => (
            <li
              key={s.id}
              className={`flex items-start gap-4 rounded-grande border border-borda bg-cartao p-4 ${s.ativa ? "" : "opacity-60"}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-creme-claro px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-texto-suave">
                    {descreverFonte(s, categorias)}
                  </span>
                  <span className="text-[0.7rem] text-texto-fraco">
                    {s.layout === "grade" ? "grade" : "carrossel"} · até {s.limite}
                  </span>
                  {!s.ativa && (
                    <span className="rounded-full bg-creme px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-texto-suave">
                      Fora do ar
                    </span>
                  )}
                </div>
                <p className="mt-1.5 font-semibold">{s.titulo}</p>
                {s.subtitulo && <p className="line-clamp-2 text-sm text-texto-suave">{s.subtitulo}</p>}

                {s.fonte === "mais_vendidos" && (
                  <p className="mt-1.5 text-xs text-texto-fraco">
                    Sem vendas nos últimos 6 meses, esta faixa não aparece na loja.
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setEditando(paraFormulario(s))} className={botaoFantasma}>
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => rodar(() => alternarSecao(s.id, !s.ativa))}
                    className={botaoFantasma}
                  >
                    {s.ativa ? "Tirar do ar" : "Colocar no ar"}
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      if (confirm(`Apagar a seção "${s.titulo}"? Os produtos continuam na loja — só a faixa some da home.`)) {
                        rodar(() => excluirSecao(s.id));
                      }
                    }}
                    className={`${botaoFantasma} hover:border-perigo hover:text-perigo`}
                  >
                    Apagar
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <BotaoOrdem
                  rotulo="Subir"
                  desabilitado={i === 0 || ocupado}
                  onClick={() => rodar(() => moverSecao(s.id, -1))}
                  giro="-rotate-90"
                />
                <BotaoOrdem
                  rotulo="Descer"
                  desabilitado={i === secoes.length - 1 || ocupado}
                  onClick={() => rodar(() => moverSecao(s.id, 1))}
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

function FormSecao({
  inicial,
  categorias,
  produtos,
  onCancelar,
  onSalvo,
}: {
  inicial: SecaoForm;
  categorias: Categoria[];
  produtos: ProdutoResumo[];
  onCancelar: () => void;
  onSalvo: () => void;
}) {
  const [f, setF] = useState<SecaoForm>(inicial);
  const [tentou, setTentou] = useState(false);
  const [errosServidor, setErrosServidor] = useState<ErrosSecao>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const erros: ErrosSecao = tentou ? { ...validarSecao(f), ...errosServidor } : errosServidor;

  const set = <K extends keyof SecaoForm>(campo: K, valor: SecaoForm[K]) => {
    setErrosServidor({});
    setF((a) => ({ ...a, [campo]: valor }));
  };

  const ajudaFonte = FONTES.find((x) => x.valor === f.fonte)?.ajuda ?? "";

  function trocarFonte(fonte: FonteSecao) {
    setErrosServidor({});
    setF((a) => ({
      ...a,
      fonte,
      // ao escolher a primeira categoria, já deixa uma selecionada
      categoria_id: fonte === "categoria" ? (a.categoria_id ?? categorias[0]?.id ?? null) : a.categoria_id,
    }));
  }

  function salvar() {
    setAviso(null);
    setTentou(true);
    setErrosServidor({});
    if (Object.keys(validarSecao(f)).length) {
      setAviso("Confira os campos marcados em vermelho.");
      return;
    }
    iniciar(async () => {
      const r = await salvarSecao(f);
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
      <h2 className="mb-1 text-xl font-semibold">{f.id ? "Editar seção" : "Nova seção"}</h2>
      <p className="mb-5 text-sm text-texto-suave">
        Escolha o que a faixa mostra e como ela se chama na loja.
      </p>

      {aviso && <Aviso tipo="erro">{aviso}</Aviso>}

      <div className="grid gap-4 md:grid-cols-2">
        <CampoLinha
          rotulo="Selo"
          ajuda="A tarjinha acima do título. Ex.: “Acabou de chegar”."
          valor={f.selo}
          maximo={LIMITES_SECAO.selo}
          erro={erros.selo}
          onChange={(v) => set("selo", v)}
        />
        <CampoLinha
          rotulo="Título da seção"
          ajuda="Ex.: Polaroids, Promoções, Presentes, Novidades."
          valor={f.titulo}
          maximo={LIMITES_SECAO.titulo}
          erro={erros.titulo}
          onChange={(v) => set("titulo", v)}
        />
      </div>

      <div className="mt-4">
        <CampoTexto
          rotulo="Frase de apoio"
          valor={f.subtitulo}
          maximo={LIMITES_SECAO.subtitulo}
          erro={erros.subtitulo}
          linhas={2}
          onChange={(v) => set("subtitulo", v)}
        />
      </div>

      <fieldset className="mt-6 rounded-card border border-borda p-4">
        <legend className="px-2 text-sm font-semibold">Quais produtos aparecem</legend>

        <CampoSelecao
          rotulo="Origem dos produtos"
          ajuda={ajudaFonte}
          valor={f.fonte}
          opcoes={FONTES.map((x) => ({ valor: x.valor, nome: x.nome }))}
          onChange={trocarFonte}
        />

        {f.fonte === "categoria" && (
          <div className="mt-4">
            <CampoSelecao
              rotulo="Categoria"
              valor={f.categoria_id ?? ""}
              opcoes={[
                { valor: "", nome: "— escolha —" },
                ...categorias.map((c) => ({ valor: c.id, nome: c.ativa ? c.nome : `${c.nome} (oculta)` })),
              ]}
              erro={erros.categoria_id}
              onChange={(v) => set("categoria_id", v || null)}
            />
          </div>
        )}

        {f.fonte === "manual" && (
          <div className="mt-4">
            <EscolherProdutos
              produtos={produtos}
              escolhidos={f.produto_ids}
              erro={erros.produto_ids}
              onChange={(ids) => set("produto_ids", ids)}
            />
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <CampoSelecao
            rotulo="Quantos mostrar"
            valor={String(f.limite)}
            opcoes={[4, 6, 8, 10, 12, 16, 20, 24].map((n) => ({ valor: String(n), nome: `até ${n}` }))}
            erro={erros.limite}
            onChange={(v) => set("limite", Number(v))}
          />
          <CampoSelecao
            rotulo="Formato"
            ajuda="Carrossel rola de lado; grade empilha tudo."
            valor={f.layout}
            opcoes={[
              { valor: "carrossel" as const, nome: "Carrossel" },
              { valor: "grade" as const, nome: "Grade" },
            ]}
            onChange={(v) => set("layout", v)}
          />
          <CampoSelecao
            rotulo="Fundo"
            ajuda="Alterne entre as faixas para separar bem uma da outra."
            valor={f.fundo}
            opcoes={[
              { valor: "claro" as const, nome: "Creme" },
              { valor: "branco" as const, nome: "Sem fundo" },
            ]}
            onChange={(v) => set("fundo", v)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-4 rounded-card border border-borda p-4">
        <legend className="px-2 text-sm font-semibold">Botão no fim da faixa (opcional)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoLinha
            rotulo="Texto do botão"
            ajuda="Ex.: Ver todas as polaroids. Vazio = sem botão."
            valor={f.link_texto}
            maximo={LIMITES_SECAO.link_texto}
            erro={erros.link_texto}
            onChange={(v) => set("link_texto", v)}
          />
          <CampoLinha
            rotulo="O botão leva para"
            ajuda="Ex.: /categoria/polaroids"
            valor={f.link_href}
            erro={erros.link_href}
            onChange={(v) => set("link_href", v)}
          />
        </div>
      </fieldset>

      <div className="mt-4">
        <Check marcado={f.ativa} onChange={(v) => set("ativa", v)}>
          Mostrar esta seção na loja
        </Check>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancelar} className={botaoFantasma}>
          Cancelar
        </button>
        <button type="button" onClick={salvar} disabled={salvando} className={botaoPrincipal}>
          {salvando ? "Salvando…" : "Salvar seção"}
        </button>
      </div>
    </div>
  );
}

/** Lista com busca: clicar adiciona ao fim, clicar de novo tira. */
function EscolherProdutos({
  produtos,
  escolhidos,
  erro,
  onChange,
}: {
  produtos: ProdutoResumo[];
  escolhidos: string[];
  erro?: string;
  onChange: (ids: string[]) => void;
}) {
  const [busca, setBusca] = useState("");

  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? produtos.filter((p) => p.nome.toLowerCase().includes(termo)) : produtos;
  }, [produtos, busca]);

  function alternar(id: string) {
    onChange(escolhidos.includes(id) ? escolhidos.filter((x) => x !== id) : [...escolhidos, id]);
  }

  function mover(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= escolhidos.length) return;
    const lista = [...escolhidos];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    onChange(lista);
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold">
        Produtos da seção{" "}
        <span className="font-normal text-texto-fraco">
          ({escolhidos.length}/{LIMITES_SECAO.produtos})
        </span>
      </span>

      {escolhidos.length > 0 && (
        <ol className="mb-3 space-y-1.5">
          {escolhidos.map((id, i) => {
            const p = porId.get(id);
            return (
              <li key={id} className="flex items-center gap-2 rounded-lg border border-borda bg-creme-claro px-2 py-1.5 text-sm">
                <span className="w-5 text-center text-xs font-bold text-texto-fraco">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{p?.nome ?? "produto apagado"}</span>
                {p && p.status !== "publicado" && (
                  <span className="shrink-0 rounded-full bg-dourado-claro px-2 py-0.5 text-[0.62rem] font-bold uppercase text-marrom">
                    não publicado
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Subir"
                  disabled={i === 0}
                  onClick={() => mover(i, -1)}
                  className="px-1 text-texto-suave disabled:opacity-25"
                >
                  <Icone nome="seta" className="h-3 w-3 -rotate-90" />
                </button>
                <button
                  type="button"
                  aria-label="Descer"
                  disabled={i === escolhidos.length - 1}
                  onClick={() => mover(i, 1)}
                  className="px-1 text-texto-suave disabled:opacity-25"
                >
                  <Icone nome="seta" className="h-3 w-3 rotate-90" />
                </button>
                <button
                  type="button"
                  aria-label={`Tirar ${p?.nome ?? "produto"} da seção`}
                  onClick={() => alternar(id)}
                  className="px-1 text-texto-suave hover:text-perigo"
                >
                  <Icone nome="fechar" className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar produto pelo nome…"
        className="mb-2 w-full rounded-xl border-[1.5px] border-borda bg-white px-3 py-2 text-base outline-none focus:border-terracota"
      />

      <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-borda p-1.5">
        {filtrados.length === 0 && <li className="p-3 text-sm text-texto-suave">Nenhum produto encontrado.</li>}
        {filtrados.map((p) => {
          const dentro = escolhidos.includes(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => alternar(p.id)}
                aria-pressed={dentro}
                disabled={!dentro && escolhidos.length >= LIMITES_SECAO.produtos}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition disabled:opacity-40 ${
                  dentro ? "bg-terracota-claro font-semibold text-marrom" : "hover:bg-creme-claro"
                }`}
              >
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-creme">
                  {p.imagens?.[0] && <Image src={p.imagens[0]} alt="" fill sizes="36px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                {dentro && <Icone nome="confirmado" className="h-4 w-4 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>

      {erro && <p className="mt-1.5 text-sm text-perigo">{erro}</p>}
    </div>
  );
}

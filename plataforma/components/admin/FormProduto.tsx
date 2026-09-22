"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { salvarCategoria, salvarProduto } from "@/app/admin/(painel)/produtos/acoes";
import { CardProduto } from "@/components/loja/CardProduto";
import { processarFoto } from "@/lib/imagem";
import { LIMITES, gerarSlug, lerPreco, validarProduto, type ErrosProduto, type ProdutoForm } from "@/lib/produto-form";
import { createClient } from "@/lib/supabase/client";
import type { Categoria, GrupoOpcao, Produto, StatusProduto } from "@/lib/types";

const LADO_FOTO_PRODUTO = 1600;

export function FormProduto({
  inicial,
  categorias: categoriasIniciais,
  statusSalvo,
  precoSalvo,
  mensagemInicial = null,
}: {
  inicial: ProdutoForm;
  categorias: Categoria[];
  statusSalvo: StatusProduto | null;
  precoSalvo: number | null;
  mensagemInicial?: string | null;
}) {
  const router = useRouter();
  const [f, setF] = useState<ProdutoForm>(inicial);
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const [slugManual, setSlugManual] = useState(Boolean(inicial.id));
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [errosServidor, setErrosServidor] = useState<ErrosProduto>({});
  const [mensagem, setMensagem] = useState<string | null>(mensagemInicial);
  const [enviandoFotos, setEnviandoFotos] = useState(0);
  const [salvando, iniciar] = useTransition();

  const set = <K extends keyof ProdutoForm>(campo: K, valor: ProdutoForm[K]) => {
    setErrosServidor({});
    setF((a) => ({ ...a, [campo]: valor }));
  };
  // depois da 1ª tentativa de salvar, os erros acompanham a digitação (somem ao corrigir)
  const erros: ErrosProduto = tentouSalvar ? { ...validarProduto(f), ...errosServidor } : errosServidor;

  function salvar() {
    setMensagem(null);
    setTentouSalvar(true);
    setErrosServidor({});
    const e = validarProduto(f);
    if (Object.keys(e).length) {
      setMensagem("Corrija os campos marcados em vermelho.");
      return;
    }
    // Confirmação dupla em ações sensíveis (prevencao-erros §5)
    if (statusSalvo === "publicado" && f.status !== "publicado" && !confirm("Tirar este produto da loja? Ele deixa de aparecer para os clientes na hora.")) return;
    if (statusSalvo === "publicado" && precoSalvo !== null && lerPreco(f.preco) !== precoSalvo &&
      !confirm(`Alterar o preço de R$ ${precoSalvo.toFixed(2).replace(".", ",")} para R$ ${f.preco}? A mudança aparece na loja imediatamente (pedidos já feitos não mudam).`)) return;

    iniciar(async () => {
      const r = await salvarProduto(f);
      if (!r.ok) {
        setErrosServidor(r.erros);
        setMensagem(r.erros.geral ?? "Corrija os campos marcados em vermelho.");
        return;
      }
      if (!f.id && r.id) {
        router.replace(`/admin/produtos/${r.id}?salvo=1`);
      } else {
        setMensagem("✓ Produto salvo!");
        router.refresh();
      }
    });
  }

  async function enviarFotos(lista: FileList) {
    setMensagem(null);
    const vagas = LIMITES.imagens - f.imagens.length;
    const arquivos = Array.from(lista).slice(0, Math.max(0, vagas));
    if (lista.length > vagas) setMensagem(`Máximo de ${LIMITES.imagens} fotos por produto.`);
    const storage = createClient().storage.from("produtos");
    setEnviandoFotos((n) => n + arquivos.length);
    for (const arquivo of arquivos) {
      try {
        const foto = await processarFoto(arquivo, LADO_FOTO_PRODUTO);
        if (foto.largura === null) throw new Error("Formato não suportado. Use JPG, PNG ou WebP.");
        if (Math.min(foto.largura, foto.altura ?? 0) < 600) setMensagem("⚠ Uma das fotos é pequena (menos de 600px) e pode ficar borrada na loja.");
        const caminho = `${crypto.randomUUID()}.${foto.extensao}`;
        const { error } = await storage.upload(caminho, foto.arquivo, { contentType: foto.tipo, cacheControl: "31536000" });
        if (error) throw new Error("Falha no envio: " + error.message);
        const url = storage.getPublicUrl(caminho).data.publicUrl;
        setF((a) => ({ ...a, imagens: [...a.imagens, url] }));
      } catch (e) {
        setMensagem(e instanceof Error ? e.message : "Falha ao enviar foto");
      } finally {
        setEnviandoFotos((n) => n - 1);
      }
    }
  }

  function moverFoto(i: number, d: -1 | 1) {
    setF((a) => {
      const img = [...a.imagens];
      const j = i + d;
      if (j < 0 || j >= img.length) return a;
      [img[i], img[j]] = [img[j], img[i]];
      return { ...a, imagens: img };
    });
  }

  async function novaCategoria() {
    const nome = prompt("Nome da nova categoria:");
    if (!nome) return;
    const r = await salvarCategoria(null, nome);
    if (!r.ok) return alert(r.erros.geral);
    const nova: Categoria = { id: r.id!, nome: nome.trim(), slug: gerarSlug(nome), ordem: 999, ativa: true };
    setCategorias((c) => [...c, nova]);
    set("categoria_id", nova.id);
  }

  // Pré-visualização do card como aparece na loja
  const preco = lerPreco(f.preco);
  const previa: Produto | null =
    f.imagens.length > 0 && preco > 0
      ? {
          id: f.id ?? "previa", categoria_id: f.categoria_id, nome: f.nome || "Nome do produto", slug: f.slug || "previa",
          descricao_curta: f.descricao_curta, descricao: f.descricao, preco, imagens: f.imagens, opcoes: f.opcoes,
          estoque: f.sob_demanda ? null : Number(f.estoque) || 0, estoque_minimo: 0, requer_fotos_cliente: f.requer_fotos_cliente,
          min_fotos: 0, max_fotos: 0, prazo_producao_dias: null, destaque: f.destaque, novo: f.novo, ordem: 0, status: f.status,
        }
      : null;

  return (
    <div className="mx-auto max-w-5xl pb-28">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/admin/produtos" className="text-sm text-texto-suave hover:text-texto">← Produtos</Link>
      </div>
      <h1 className="mb-1 text-3xl font-semibold">{f.id ? f.nome || "Editar produto" : "Novo produto"}</h1>
      {statusSalvo === "publicado" && (
        <p className="mb-4 rounded-xl bg-dourado-claro px-3 py-2 text-sm text-marrom">
          Este produto está <strong>PUBLICADO</strong>: as alterações aparecem na loja assim que você salvar.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Secao titulo="Informações">
            <Campo rotulo="Nome do produto" erro={erros.nome} contador={`${f.nome.length}/${LIMITES.nome}`}>
              <input
                className={inp(erros.nome)}
                maxLength={LIMITES.nome}
                value={f.nome}
                onChange={(e) => { setErrosServidor({}); setF((a) => ({ ...a, nome: e.target.value, slug: slugManual ? a.slug : gerarSlug(e.target.value) })); }}
                placeholder="Ex.: Kit 10 Polaroids"
              />
            </Campo>
            <Campo rotulo="Endereço na loja" erro={erros.slug} dica={`Link do produto: /produto/${f.slug || "..."}`}>
              <input
                className={inp(erros.slug)}
                value={f.slug}
                onChange={(e) => {
                  setSlugManual(true);
                  // normalização leve durante a digitação (permite digitar o hífen)
                  const v = e.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                  set("slug", v.replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").slice(0, 80));
                }}
                onBlur={() => set("slug", gerarSlug(f.slug))}
              />
            </Campo>
            <Campo rotulo="Categoria" erro={erros.categoria_id}>
              <div className="flex gap-2">
                <select className={inp(erros.categoria_id)} value={f.categoria_id} onChange={(e) => set("categoria_id", e.target.value)}>
                  <option value="">Escolha…</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}{c.ativa ? "" : " (oculta)"}</option>
                  ))}
                </select>
                <button type="button" onClick={novaCategoria} className="shrink-0 rounded-xl border border-borda px-3 text-sm font-semibold hover:border-terracota">
                  + Nova
                </button>
              </div>
            </Campo>
            <Campo rotulo="Descrição curta (aparece no card)" erro={erros.descricao_curta} contador={`${f.descricao_curta.length}/${LIMITES.descricao_curta}`}>
              <input className={inp(erros.descricao_curta)} maxLength={LIMITES.descricao_curta} value={f.descricao_curta} onChange={(e) => set("descricao_curta", e.target.value)} placeholder="Ex.: Polaroid borda branca 7x8cm" />
            </Campo>
            <Campo rotulo="Descrição completa" erro={erros.descricao} dica="Deixe uma linha em branco para separar parágrafos.">
              <textarea className={`${inp(erros.descricao)} min-h-36`} maxLength={LIMITES.descricao} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} />
            </Campo>
          </Secao>

          <Secao titulo="Fotos de divulgação" subtitulo="A primeira foto é a capa. Use fotos com boa luz; elas são comprimidas automaticamente.">
            {erros.imagens && <p className="mb-2 text-sm text-perigo">{erros.imagens}</p>}
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {f.imagens.map((url, i) => (
                <li key={url} className="relative aspect-square overflow-hidden rounded-xl bg-terracota-claro">
                  <Image src={url} alt="" fill sizes="160px" className="object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-marrom px-1.5 text-[0.65rem] font-bold text-creme-claro">CAPA</span>}
                  <div className="absolute inset-x-1 bottom-1 flex justify-between">
                    <span className="flex gap-1">
                      {i > 0 && <BotaoFoto onClick={() => moverFoto(i, -1)} rotulo="Mover para a esquerda">←</BotaoFoto>}
                      {i < f.imagens.length - 1 && <BotaoFoto onClick={() => moverFoto(i, 1)} rotulo="Mover para a direita">→</BotaoFoto>}
                    </span>
                    <BotaoFoto onClick={() => set("imagens", f.imagens.filter((u) => u !== url))} rotulo="Remover foto">✕</BotaoFoto>
                  </div>
                </li>
              ))}
              {Array.from({ length: enviandoFotos }).map((_, i) => (
                <li key={`env-${i}`} className="flex aspect-square animate-pulse items-center justify-center rounded-xl bg-creme-claro text-xs text-texto-suave">enviando…</li>
              ))}
              {f.imagens.length + enviandoFotos < LIMITES.imagens && (
                <li>
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-borda text-center text-xs text-texto-suave hover:border-terracota">
                    <span className="text-2xl">＋</span>
                    Adicionar
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { if (e.target.files) enviarFotos(e.target.files); e.target.value = ""; }} />
                  </label>
                </li>
              )}
            </ul>
          </Secao>

          <Secao titulo="Preço e variações" subtitulo="O preço base vale para a primeira opção. Cada opção pode somar um acréscimo.">
            <Campo rotulo="Preço base (R$)" erro={erros.preco}>
              <input className={`${inp(erros.preco)} max-w-40`} inputMode="decimal" value={f.preco} onChange={(e) => set("preco", e.target.value)} placeholder="34,90" />
            </Campo>
            <EditorOpcoes grupos={f.opcoes} onChange={(g) => set("opcoes", g)} precoBase={preco} pedeFotos={f.requer_fotos_cliente} />
            {erros.opcoes && <p className="mt-2 text-sm text-perigo">{erros.opcoes}</p>}
          </Secao>

          <Secao titulo="Fotos do cliente">
            <Check marcado={f.requer_fotos_cliente} onChange={(v) => set("requer_fotos_cliente", v)}>
              Este produto é personalizado: o cliente envia fotos no checkout
            </Check>
            {f.requer_fotos_cliente && (
              <div className="mt-3 flex gap-3">
                <Campo rotulo="Mínimo de fotos" erro={erros.min_fotos}>
                  <input className={`${inp(erros.min_fotos)} max-w-32`} inputMode="numeric" value={f.min_fotos} onChange={(e) => set("min_fotos", e.target.value)} />
                </Campo>
                <Campo rotulo="Máximo de fotos" erro={erros.max_fotos}>
                  <input className={`${inp(erros.max_fotos)} max-w-32`} inputMode="numeric" value={f.max_fotos} onChange={(e) => set("max_fotos", e.target.value)} />
                </Campo>
              </div>
            )}
            {f.requer_fotos_cliente && (
              <p className="text-xs text-texto-suave">Valores por unidade. Se uma variação define &quot;fotos&quot; (ex.: kit de 20), ela vale no lugar destes.</p>
            )}
          </Secao>

          <Secao titulo="Estoque e produção">
            <Check marcado={f.sob_demanda} onChange={(v) => set("sob_demanda", v)}>
              Sob demanda (produzido a cada pedido, sem limite de estoque)
            </Check>
            {!f.sob_demanda && (
              <div className="mt-3 flex gap-3">
                <Campo rotulo="Em estoque" erro={erros.estoque}>
                  <input className={`${inp(erros.estoque)} max-w-32`} inputMode="numeric" value={f.estoque} onChange={(e) => set("estoque", e.target.value)} />
                </Campo>
                <Campo rotulo="Avisar quando chegar a" erro={erros.estoque_minimo}>
                  <input className={`${inp(erros.estoque_minimo)} max-w-32`} inputMode="numeric" value={f.estoque_minimo} onChange={(e) => set("estoque_minimo", e.target.value)} />
                </Campo>
              </div>
            )}
            <Campo rotulo="Prazo de produção (dias úteis)" erro={erros.prazo_producao_dias} dica="Deixe vazio para usar o prazo padrão da loja.">
              <input className={`${inp(erros.prazo_producao_dias)} max-w-32`} inputMode="numeric" value={f.prazo_producao_dias} onChange={(e) => set("prazo_producao_dias", e.target.value)} />
            </Campo>
          </Secao>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
          <Secao titulo="Situação">
            <div className="space-y-2">
              {([
                ["rascunho", "Rascunho", "Só aparece aqui no painel"],
                ["publicado", "Publicado", "Visível na loja"],
                ["inativo", "Inativo", "Fora da loja, guardado no histórico"],
              ] as const).map(([valor, rotulo, dica]) => (
                <label key={valor} className={`flex cursor-pointer gap-2 rounded-xl border-[1.5px] p-3 text-sm ${f.status === valor ? "border-terracota bg-terracota-claro" : "border-borda"}`}>
                  <input type="radio" name="status" checked={f.status === valor} onChange={() => set("status", valor)} className="mt-0.5 accent-marrom" />
                  <span><strong>{rotulo}</strong><br /><span className="text-xs text-texto-suave">{dica}</span></span>
                </label>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <Check marcado={f.destaque} onChange={(v) => set("destaque", v)}>Destaque na home</Check>
              <Check marcado={f.novo} onChange={(v) => set("novo", v)}>Selo &quot;Novidade&quot;</Check>
            </div>
          </Secao>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-texto-suave">Pré-visualização na loja</p>
            {previa ? (
              <div className="pointer-events-none max-w-[260px]">
                <CardProduto produto={previa} categoria={categorias.find((c) => c.id === f.categoria_id)?.nome} />
              </div>
            ) : (
              <p className="rounded-card border border-dashed border-borda p-4 text-sm text-texto-suave">Adicione uma foto e o preço para ver a prévia.</p>
            )}
            {f.id && statusSalvo === "publicado" && (
              <Link href={`/produto/${f.slug}`} target="_blank" className="mt-2 inline-block text-sm text-terracota hover:underline">Abrir na loja ↗</Link>
            )}
          </div>
        </div>
      </div>

      {/* Barra de salvar fixa */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-cartao/95 px-4 py-3 backdrop-blur md:left-60">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className={`text-sm ${mensagem?.startsWith("✓") ? "text-sucesso" : "text-perigo"}`} role="status">{mensagem}</p>
          <button type="button" onClick={salvar} disabled={salvando || enviandoFotos > 0} className="shrink-0 rounded-full bg-marrom px-7 py-3 font-semibold text-creme-claro hover:bg-texto disabled:opacity-50">
            {salvando ? "Salvando…" : enviandoFotos > 0 ? "Enviando fotos…" : "Salvar produto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor de variações
// ---------------------------------------------------------------------------
function EditorOpcoes({ grupos, onChange, precoBase, pedeFotos }: { grupos: GrupoOpcao[]; onChange: (g: GrupoOpcao[]) => void; precoBase: number; pedeFotos: boolean }) {
  const atualizarGrupo = (i: number, g: GrupoOpcao) => onChange(grupos.map((x, j) => (j === i ? g : x)));

  return (
    <div className="space-y-3">
      {grupos.map((g, i) => (
        <div key={i} className="rounded-card border border-borda bg-creme-claro p-3">
          <div className="mb-2 flex gap-2">
            <input className={`${inp()} font-semibold`} value={g.nome} onChange={(e) => atualizarGrupo(i, { ...g, nome: e.target.value })} placeholder="Nome da variação (ex.: Tamanho)" />
            <button type="button" onClick={() => confirm(`Remover a variação "${g.nome || "sem nome"}"?`) && onChange(grupos.filter((_, j) => j !== i))} className="shrink-0 rounded-xl px-3 text-sm text-perigo hover:bg-perigo/10">Remover</button>
          </div>
          <div className="mb-1 grid grid-cols-[1fr_90px_70px_28px] gap-2 px-1 text-[0.7rem] font-bold uppercase text-texto-suave">
            <span>Opção</span><span>+ R$</span><span>{pedeFotos ? "Fotos" : ""}</span><span />
          </div>
          {g.valores.map((v, k) => (
            <div key={`${grupos.length}-${i}-${g.valores.length}-${k}`} className="mb-1.5 grid grid-cols-[1fr_90px_70px_28px] items-center gap-2">
              <input className={inp()} value={v.label} onChange={(e) => atualizarGrupo(i, { ...g, valores: g.valores.map((x, m) => (m === k ? { ...x, label: e.target.value } : x)) })} placeholder="Ex.: 20x30" />
              <input
                className={inp()}
                inputMode="decimal"
                defaultValue={v.acrescimo ? v.acrescimo.toFixed(2).replace(".", ",") : "0"}
                onChange={(e) => {
                  const n = lerPreco(e.target.value || "0");
                  atualizarGrupo(i, { ...g, valores: g.valores.map((x, m) => (m === k ? { ...x, acrescimo: Number.isNaN(n) ? -1 : n } : x)) });
                }}
              />
              {pedeFotos ? (
                <input
                  className={inp()}
                  inputMode="numeric"
                  defaultValue={v.fotos ?? ""}
                  placeholder="—"
                  title="Fotos que o cliente envia com esta opção (vazio = usa o padrão)"
                  onChange={(e) => {
                    const t = e.target.value.trim();
                    atualizarGrupo(i, { ...g, valores: g.valores.map((x, m) => (m === k ? { ...x, fotos: t ? (/^\d+$/.test(t) ? Number(t) : -1) : undefined } : x)) });
                  }}
                />
              ) : <span />}
              <button type="button" onClick={() => atualizarGrupo(i, { ...g, valores: g.valores.filter((_, m) => m !== k) })} className="text-texto-fraco hover:text-perigo" aria-label="Remover opção">✕</button>
            </div>
          ))}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => atualizarGrupo(i, { ...g, valores: [...g.valores, { label: "", acrescimo: 0 }] })} className="text-sm font-semibold text-terracota hover:underline">+ Adicionar opção</button>
            {precoBase > 0 && g.valores.length > 0 && (
              <span className="text-xs text-texto-suave">
                Na loja: {g.valores.filter((v) => v.label).map((v) => `${v.label} = R$ ${(precoBase + Math.max(0, v.acrescimo)).toFixed(2).replace(".", ",")}`).join(" · ")}
              </span>
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...grupos, { nome: "", valores: [{ label: "", acrescimo: 0 }] }])} className="rounded-xl border border-dashed border-borda px-4 py-2 text-sm font-semibold hover:border-terracota">
        + Adicionar variação (tamanho, acabamento, quantidade…)
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
const inp = (erro?: string) =>
  `w-full rounded-xl border-[1.5px] bg-white px-3 py-2.5 text-base outline-none transition focus:border-terracota ${erro ? "border-perigo" : "border-borda"}`;

function Secao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <section className="rounded-grande border border-borda bg-cartao p-5">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {subtitulo && <p className="mt-0.5 text-sm text-texto-suave">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Campo({ rotulo, erro, dica, contador, children }: { rotulo: string; erro?: string; dica?: string; contador?: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 flex justify-between text-sm font-semibold">
        {rotulo}
        {contador && <span className="font-normal text-texto-fraco">{contador}</span>}
      </span>
      {children}
      {erro ? <span className="mt-1 block text-sm text-perigo">{erro}</span> : dica && <span className="mt-1 block text-xs text-texto-suave">{dica}</span>}
    </label>
  );
}

function Check({ marcado, onChange, children }: { marcado: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input type="checkbox" checked={marcado} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-marrom" />
      <span>{children}</span>
    </label>
  );
}

function BotaoFoto({ onClick, rotulo, children }: { onClick: () => void; rotulo: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={rotulo} className="flex h-6 w-6 items-center justify-center rounded-full bg-texto/70 text-xs text-white hover:bg-texto">
      {children}
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  alternarCupom,
  alternarPromocao,
  excluirCupom,
  excluirPromocao,
  salvarCupom,
  salvarPromocao,
  type FormCupom,
  type FormPromocao,
} from "@/app/admin/(painel)/descontos/acoes";
import { Icone } from "@/components/Icone";
import { formatarBRL } from "@/lib/preco";
import type { Categoria, Cupom, Produto, Promocao } from "@/lib/types";

/** ISO → "2026-10-05T18:00" (formato do campo de data e hora) */
function paraCampo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const emBrasilia = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return emBrasilia.toISOString().slice(0, 16);
}

function formatarPeriodo(inicio: string | null, fim: string | null): string {
  const f = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  if (inicio && fim) return `${f(inicio)} até ${f(fim)}`;
  if (fim) return `até ${f(fim)}`;
  if (inicio) return `a partir de ${f(inicio)}`;
  return "sem prazo";
}

function vigente(ativo: boolean, inicio: string | null, fim: string | null): boolean {
  const agora = Date.now();
  return ativo && (!inicio || new Date(inicio).getTime() <= agora) && (!fim || new Date(fim).getTime() >= agora);
}

const CUPOM_VAZIO: FormCupom = {
  id: null, codigo: "", descricao: "", tipo: "percentual", valor: "", minimo_pedido: "",
  inicio: "", fim: "", limite_usos: "", ativo: true,
};

const PROMO_VAZIA: FormPromocao = {
  id: null, nome: "", selo: "", tipo: "percentual", valor: "", escopo: "loja", alvos: [],
  inicio: "", fim: "", ativa: true,
};

export function GerenciarDescontos({
  cupons,
  promocoes,
  categorias,
  produtos,
}: {
  cupons: Cupom[];
  promocoes: Promocao[];
  categorias: Categoria[];
  produtos: Pick<Produto, "id" | "nome">[];
}) {
  const [aba, setAba] = useState<"cupons" | "promocoes">("cupons");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-3xl font-semibold">Descontos</h1>
      <p className="mb-5 text-sm text-texto-suave">
        <strong>Cupons</strong> são códigos que o cliente digita no carrinho. <strong>Promoções</strong> baixam o preço
        direto na vitrine, sem código.
      </p>

      <div className="mb-6 flex gap-2">
        {([["cupons", "Cupons"], ["promocoes", "Promoções"]] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setAba(valor)}
            className={`rounded-full border-[1.5px] px-5 py-2 text-sm font-semibold transition ${
              aba === valor ? "border-terracota bg-terracota-claro text-marrom" : "border-borda hover:border-terracota"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "cupons" ? <Cupons cupons={cupons} /> : <Promocoes promocoes={promocoes} categorias={categorias} produtos={produtos} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cupons
// ---------------------------------------------------------------------------
function Cupons({ cupons }: { cupons: Cupom[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormCupom | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const executar = (fn: () => Promise<{ ok: boolean; erro?: string }>, depois?: () => void) =>
    iniciar(async () => {
      setErro(null);
      const r = await fn();
      if (!r.ok) return setErro(r.erro ?? "Não foi possível concluir");
      depois?.();
      router.refresh();
    });

  return (
    <div className={ocupado ? "pointer-events-none opacity-60" : ""}>
      {!form && (
        <button type="button" onClick={() => { setForm(CUPOM_VAZIO); setErro(null); }} className={botaoPrincipal}>
          + Novo cupom
        </button>
      )}
      {erro && <p className="mt-3 rounded-xl bg-perigo/10 px-3 py-2 text-sm text-perigo">{erro}</p>}

      {form && (
        <section className="mt-4 rounded-grande border border-borda bg-cartao p-5">
          <h2 className="mb-4 text-lg font-semibold">{form.id ? "Editar cupom" : "Novo cupom"}</h2>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Campo rotulo="Código" dica="É o que o cliente digita. Ex.: MEMORIA10">
              <input
                className={inp}
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) })}
                placeholder="MEMORIA10"
              />
            </Campo>
            <Campo rotulo="Tipo de desconto">
              <select className={inp} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as FormCupom["tipo"] })}>
                <option value="percentual">Porcentagem (%)</option>
                <option value="valor">Valor fixo (R$)</option>
                <option value="frete_gratis">Frete grátis</option>
              </select>
            </Campo>
            {form.tipo !== "frete_gratis" && (
              <Campo rotulo={form.tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}>
                <input className={inp} inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder={form.tipo === "percentual" ? "10" : "15,00"} />
              </Campo>
            )}
            <Campo rotulo="Pedido mínimo (R$)" dica="Deixe vazio para valer em qualquer pedido">
              <input className={inp} inputMode="decimal" value={form.minimo_pedido} onChange={(e) => setForm({ ...form, minimo_pedido: e.target.value })} placeholder="0,00" />
            </Campo>
            <Campo rotulo="Começa em" dica="Vazio = já vale">
              <input className={inp} type="datetime-local" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
            </Campo>
            <Campo rotulo="Termina em" dica="Vazio = sem prazo">
              <input className={inp} type="datetime-local" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} />
            </Campo>
            <Campo rotulo="Limite de usos" dica="Vazio = ilimitado">
              <input className={inp} inputMode="numeric" value={form.limite_usos} onChange={(e) => setForm({ ...form, limite_usos: e.target.value.replace(/\D/g, "") })} placeholder="ex.: 50" />
            </Campo>
            <Campo rotulo="Descrição (opcional)" dica="Aparece para o cliente quando ele aplica o cupom">
              <input className={inp} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value.slice(0, 160) })} placeholder="10% de boas-vindas" />
            </Campo>
          </div>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} className="h-4 w-4 accent-marrom" />
            Cupom ligado
          </label>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => executar(() => salvarCupom(form), () => setForm(null))} className={botaoPrincipal}>
              Salvar cupom
            </button>
            <button type="button" onClick={() => { setForm(null); setErro(null); }} className={botaoSecundario}>Cancelar</button>
          </div>
        </section>
      )}

      <ul className="mt-5 space-y-2">
        {cupons.length === 0 && !form && (
          <li className="rounded-grande border border-dashed border-borda p-8 text-center text-sm text-texto-suave">
            Nenhum cupom ainda. Crie o primeiro e divulgue no Instagram.
          </li>
        )}
        {cupons.map((c) => {
          const valendo = vigente(c.ativo, c.inicio, c.fim) && (c.limite_usos === null || c.usos < c.limite_usos);
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-card border border-borda bg-cartao p-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-bold tracking-wide">{c.codigo}</span>
                  <Etiqueta ok={valendo}>{valendo ? "Valendo" : c.ativo ? "Fora do prazo" : "Desligado"}</Etiqueta>
                </p>
                <p className="text-sm text-texto-suave">
                  {c.tipo === "frete_gratis" ? "Frete grátis" : c.tipo === "percentual" ? `${Number(c.valor)}% de desconto` : `${formatarBRL(Number(c.valor))} de desconto`}
                  {Number(c.minimo_pedido) > 0 && ` · pedidos a partir de ${formatarBRL(Number(c.minimo_pedido))}`}
                  {" · "}{formatarPeriodo(c.inicio, c.fim)}
                </p>
                <p className="text-xs text-texto-fraco">
                  Usado {c.usos}x{c.limite_usos !== null && ` de ${c.limite_usos}`}
                  {c.descricao && ` · ${c.descricao}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <button type="button" onClick={() => { setForm({ id: c.id, codigo: c.codigo, descricao: c.descricao ?? "", tipo: c.tipo, valor: String(Number(c.valor)).replace(".", ","), minimo_pedido: Number(c.minimo_pedido) ? String(Number(c.minimo_pedido)).replace(".", ",") : "", inicio: paraCampo(c.inicio), fim: paraCampo(c.fim), limite_usos: c.limite_usos === null ? "" : String(c.limite_usos), ativo: c.ativo }); setErro(null); }} className={botaoLinha}>
                  Editar
                </button>
                <button type="button" onClick={() => executar(() => alternarCupom(c.id, !c.ativo))} className={botaoLinha}>
                  {c.ativo ? "Desligar" : "Ligar"}
                </button>
                <button type="button" onClick={() => confirm(`Excluir o cupom ${c.codigo}?`) && executar(() => excluirCupom(c.id))} className={`${botaoLinha} text-perigo`}>
                  Excluir
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Promoções
// ---------------------------------------------------------------------------
function Promocoes({
  promocoes,
  categorias,
  produtos,
}: {
  promocoes: Promocao[];
  categorias: Categoria[];
  produtos: Pick<Produto, "id" | "nome">[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormPromocao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const executar = (fn: () => Promise<{ ok: boolean; erro?: string }>, depois?: () => void) =>
    iniciar(async () => {
      setErro(null);
      const r = await fn();
      if (!r.ok) return setErro(r.erro ?? "Não foi possível concluir");
      depois?.();
      router.refresh();
    });

  const nomesCategorias = new Map(categorias.map((c) => [c.id, c.nome]));
  const nomesProdutos = new Map(produtos.map((p) => [p.id, p.nome]));
  const alvosLegiveis = (p: Promocao) =>
    p.escopo === "loja"
      ? "toda a loja"
      : p.alvos.map((a) => (p.escopo === "categoria" ? nomesCategorias.get(a) : nomesProdutos.get(a)) ?? "?").join(", ");

  return (
    <div className={ocupado ? "pointer-events-none opacity-60" : ""}>
      {!form && (
        <button type="button" onClick={() => { setForm(PROMO_VAZIA); setErro(null); }} className={botaoPrincipal}>
          + Nova promoção
        </button>
      )}
      {erro && <p className="mt-3 rounded-xl bg-perigo/10 px-3 py-2 text-sm text-perigo">{erro}</p>}

      {form && (
        <section className="mt-4 rounded-grande border border-borda bg-cartao p-5">
          <h2 className="mb-4 text-lg font-semibold">{form.id ? "Editar promoção" : "Nova promoção"}</h2>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Campo rotulo="Nome (só você vê)">
              <input className={inp} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value.slice(0, 80) })} placeholder="Semana das Mães" />
            </Campo>
            <Campo rotulo="Selo na loja (opcional)" dica="Aparece na foto do produto. Vazio = mostra a porcentagem">
              <input className={inp} value={form.selo} onChange={(e) => setForm({ ...form, selo: e.target.value.slice(0, 24) })} placeholder="Dia das Mães" />
            </Campo>
            <Campo rotulo="Tipo de desconto">
              <select className={inp} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as FormPromocao["tipo"] })}>
                <option value="percentual">Porcentagem (%)</option>
                <option value="valor">Valor fixo (R$)</option>
              </select>
            </Campo>
            <Campo rotulo={form.tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}>
              <input className={inp} inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder={form.tipo === "percentual" ? "20" : "10,00"} />
            </Campo>
            <Campo rotulo="Vale para">
              <select className={inp} value={form.escopo} onChange={(e) => setForm({ ...form, escopo: e.target.value as FormPromocao["escopo"], alvos: [] })}>
                <option value="loja">Toda a loja</option>
                <option value="categoria">Categorias escolhidas</option>
                <option value="produto">Produtos escolhidos</option>
              </select>
            </Campo>
            <Campo rotulo="Começa em" dica="Vazio = já vale">
              <input className={inp} type="datetime-local" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
            </Campo>
            <Campo rotulo="Termina em" dica="Vazio = sem prazo">
              <input className={inp} type="datetime-local" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} />
            </Campo>
          </div>

          {form.escopo !== "loja" && (
            <fieldset className="mb-4">
              <legend className="mb-2 text-sm font-semibold">
                {form.escopo === "categoria" ? "Categorias na promoção" : "Produtos na promoção"}
              </legend>
              <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-card border border-borda p-3">
                {(form.escopo === "categoria" ? categorias.map((c) => ({ id: c.id, nome: c.nome })) : produtos).map((item) => {
                  const marcado = form.alvos.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setForm({ ...form, alvos: marcado ? form.alvos.filter((a) => a !== item.id) : [...form.alvos, item.id] })}
                      className={`rounded-full border-[1.5px] px-3 py-1.5 text-sm ${marcado ? "border-terracota bg-terracota-claro font-semibold text-marrom" : "border-borda"}`}
                    >
                      {marcado && <Icone nome="confirmado" className="mr-1 inline h-3.5 w-3.5" />}
                      {item.nome}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.ativa} onChange={(e) => setForm({ ...form, ativa: e.target.checked })} className="h-4 w-4 accent-marrom" />
            Promoção ligada
          </label>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => executar(() => salvarPromocao(form), () => setForm(null))} className={botaoPrincipal}>
              Salvar promoção
            </button>
            <button type="button" onClick={() => { setForm(null); setErro(null); }} className={botaoSecundario}>Cancelar</button>
          </div>
        </section>
      )}

      <ul className="mt-5 space-y-2">
        {promocoes.length === 0 && !form && (
          <li className="rounded-grande border border-dashed border-borda p-8 text-center text-sm text-texto-suave">
            Nenhuma promoção ainda. Crie uma para a loja inteira ou só para alguns produtos.
          </li>
        )}
        {promocoes.map((p) => {
          const valendo = vigente(p.ativa, p.inicio, p.fim);
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-card border border-borda bg-cartao p-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{p.nome}</span>
                  {p.selo && <span className="rounded-full bg-perigo px-2 py-0.5 text-xs font-bold text-white">{p.selo}</span>}
                  <Etiqueta ok={valendo}>{valendo ? "Na loja agora" : p.ativa ? "Fora do prazo" : "Pausada"}</Etiqueta>
                </p>
                <p className="text-sm text-texto-suave">
                  {p.tipo === "percentual" ? `${Number(p.valor)}% off` : `${formatarBRL(Number(p.valor))} off`} em {alvosLegiveis(p)}
                </p>
                <p className="text-xs text-texto-fraco">{formatarPeriodo(p.inicio, p.fim)}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <button type="button" onClick={() => { setForm({ id: p.id, nome: p.nome, selo: p.selo ?? "", tipo: p.tipo, valor: String(Number(p.valor)).replace(".", ","), escopo: p.escopo, alvos: p.alvos, inicio: paraCampo(p.inicio), fim: paraCampo(p.fim), ativa: p.ativa }); setErro(null); }} className={botaoLinha}>
                  Editar
                </button>
                <button type="button" onClick={() => executar(() => alternarPromocao(p.id, !p.ativa))} className={botaoLinha}>
                  {p.ativa ? "Pausar" : "Ligar"}
                </button>
                <button type="button" onClick={() => confirm(`Excluir a promoção "${p.nome}"?`) && executar(() => excluirPromocao(p.id))} className={`${botaoLinha} text-perigo`}>
                  Excluir
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
const inp = "w-full rounded-xl border-[1.5px] border-borda bg-white px-3 py-2.5 text-base outline-none transition focus:border-terracota";
const botaoPrincipal = "rounded-full bg-marrom px-5 py-2.5 text-sm font-semibold text-creme-claro hover:bg-texto";
const botaoSecundario = "rounded-full border border-borda px-5 py-2.5 text-sm font-semibold hover:border-terracota";
const botaoLinha = "rounded-lg border border-borda px-2.5 py-1.5 text-xs font-semibold hover:border-terracota";

function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-semibold">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-texto-suave">{dica}</span>}
    </label>
  );
}

function Etiqueta({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${ok ? "bg-sucesso-claro text-sucesso" : "bg-creme text-texto-suave"}`}>
      {children}
    </span>
  );
}

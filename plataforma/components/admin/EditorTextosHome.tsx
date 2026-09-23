"use client";

// Textos das seções fixas da home: "como funciona", a chamada final e os
// benefícios. Cada bloco pode ser desligado sem ser apagado — desligar é
// reversível, apagar não.
import { useState, useTransition } from "react";
import { Icone, NOMES_ICONES, iconeValido } from "@/components/Icone";
import { Aviso, CampoLinha, CampoSelecao, CampoTexto, Check, botaoFantasma, botaoPrincipal } from "./campos";
import { salvarTextosHome } from "@/app/admin/(painel)/home/acoes";
import type { BeneficioHome, PassoHome, TextosHome } from "@/lib/types";

const MAX_PASSOS = 6;
const MAX_BENEFICIOS = 6;

export function EditorTextosHome({ inicial }: { inicial: TextosHome }) {
  const [t, setT] = useState<TextosHome>(inicial);
  const [aviso, setAviso] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [salvando, iniciar] = useTransition();

  /** Troca um pedaço do estado sem perder o resto. */
  function alterar<K extends keyof TextosHome>(chave: K, valor: Partial<TextosHome[K]>) {
    setAviso(null);
    setT((a) => ({ ...a, [chave]: { ...a[chave], ...valor } }));
  }

  function salvar() {
    setAviso(null);
    iniciar(async () => {
      const r = await salvarTextosHome(t);
      setAviso(r.ok ? { tipo: "ok", texto: "Textos salvos. A home já está com eles." } : { tipo: "erro", texto: r.erro });
    });
  }

  const cf = t.como_funciona;
  const ch = t.chamada;
  const bf = t.beneficios;

  return (
    <div className="space-y-4">
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      {/* ---------- atalhos de categoria ---------- */}
      <Bloco titulo="Atalhos de categoria" descricao="A fileira de botões redondos logo abaixo do banner.">
        <Check marcado={t.categorias.ativo} onChange={(v) => alterar("categorias", { ativo: v })}>
          Mostrar os atalhos de categoria
        </Check>
      </Bloco>

      {/* ---------- como funciona ---------- */}
      <Bloco titulo="Como funciona" descricao="Os passos numerados que explicam a compra.">
        <Check marcado={cf.ativo} onChange={(v) => alterar("como_funciona", { ativo: v })}>
          Mostrar esta seção
        </Check>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <CampoLinha rotulo="Selo" valor={cf.selo} maximo={60} onChange={(v) => alterar("como_funciona", { selo: v })} />
          <CampoLinha rotulo="Título" valor={cf.titulo} maximo={80} onChange={(v) => alterar("como_funciona", { titulo: v })} />
        </div>
        <div className="mt-4">
          <CampoTexto
            rotulo="Frase de apoio"
            valor={cf.subtitulo}
            maximo={300}
            linhas={2}
            onChange={(v) => alterar("como_funciona", { subtitulo: v })}
          />
        </div>

        <ListaEditavel
          rotulo="Passos"
          itens={cf.passos}
          maximo={MAX_PASSOS}
          novo={() => ({ titulo: "", texto: "" })}
          onChange={(passos) => alterar("como_funciona", { passos })}
          render={(p, trocar) => (
            <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              <CampoLinha rotulo="Título do passo" valor={p.titulo} maximo={60} onChange={(v) => trocar({ ...p, titulo: v })} />
              <CampoTexto rotulo="Explicação" valor={p.texto} maximo={200} linhas={2} onChange={(v) => trocar({ ...p, texto: v })} />
            </div>
          )}
        />
      </Bloco>

      {/* ---------- chamada final ---------- */}
      <Bloco titulo="Chamada final" descricao="O bloco marrom perto do fim da página.">
        <Check marcado={ch.ativo} onChange={(v) => alterar("chamada", { ativo: v })}>
          Mostrar esta seção
        </Check>

        <div className="mt-4 space-y-4">
          <CampoLinha rotulo="Título" valor={ch.titulo} maximo={100} onChange={(v) => alterar("chamada", { titulo: v })} />
          <CampoTexto rotulo="Texto" valor={ch.texto} maximo={300} linhas={2} onChange={(v) => alterar("chamada", { texto: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoLinha rotulo="Texto do botão" valor={ch.botao} maximo={40} onChange={(v) => alterar("chamada", { botao: v })} />
            <CampoLinha
              rotulo="O botão leva para"
              ajuda="Ex.: /produtos"
              valor={ch.link}
              onChange={(v) => alterar("chamada", { link: v })}
            />
          </div>
        </div>
      </Bloco>

      {/* ---------- benefícios ---------- */}
      <Bloco titulo="Benefícios" descricao="Os quatro itens com ícone no rodapé da home.">
        <Check marcado={bf.ativo} onChange={(v) => alterar("beneficios", { ativo: v })}>
          Mostrar esta seção
        </Check>

        <ListaEditavel
          rotulo="Itens"
          itens={bf.itens}
          maximo={MAX_BENEFICIOS}
          novo={() => ({ icone: "estrela", titulo: "", texto: "" })}
          onChange={(itens) => alterar("beneficios", { itens })}
          render={(b, trocar) => (
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex items-center gap-2 sm:w-44">
                <span className="mt-6 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracota-claro text-terracota">
                  <Icone nome={iconeValido(b.icone)} className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <CampoSelecao
                    rotulo="Ícone"
                    valor={iconeValido(b.icone)}
                    opcoes={NOMES_ICONES.map((n) => ({ valor: n, nome: n }))}
                    onChange={(v) => trocar({ ...b, icone: v })}
                  />
                </div>
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                <CampoLinha rotulo="Título" valor={b.titulo} maximo={60} onChange={(v) => trocar({ ...b, titulo: v })} />
                <CampoTexto rotulo="Texto" valor={b.texto} maximo={200} linhas={2} onChange={(v) => trocar({ ...b, texto: v })} />
              </div>
            </div>
          )}
        />
      </Bloco>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-borda bg-creme/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="button" onClick={salvar} disabled={salvando} className={botaoPrincipal}>
          {salvando ? "Salvando…" : "Salvar textos"}
        </button>
      </div>
    </div>
  );
}

function Bloco({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-grande border border-borda bg-cartao p-4 sm:p-6">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p className="mb-4 text-sm text-texto-suave">{descricao}</p>
      {children}
    </section>
  );
}

/** Lista de itens iguais (passos, benefícios): adicionar, reordenar, remover. */
function ListaEditavel<T extends PassoHome | BeneficioHome>({
  rotulo,
  itens,
  maximo,
  novo,
  onChange,
  render,
}: {
  rotulo: string;
  itens: T[];
  maximo: number;
  novo: () => T;
  onChange: (itens: T[]) => void;
  render: (item: T, trocar: (novoItem: T) => void) => React.ReactNode;
}) {
  function trocarEm(i: number, item: T) {
    onChange(itens.map((x, k) => (k === i ? item : x)));
  }

  function mover(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= itens.length) return;
    const lista = [...itens];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    onChange(lista);
  }

  return (
    <div className="mt-5">
      <span className="mb-2 block text-sm font-semibold">
        {rotulo} <span className="font-normal text-texto-fraco">({itens.length}/{maximo})</span>
      </span>

      <ul className="space-y-3">
        {itens.map((item, i) => (
          <li key={i} className="flex items-start gap-2 rounded-card border border-borda p-3">
            {render(item, (novoItem) => trocarEm(i, novoItem))}
            <div className="mt-6 flex flex-col gap-1">
              <button
                type="button"
                aria-label="Subir"
                disabled={i === 0}
                onClick={() => mover(i, -1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-borda text-texto-suave hover:border-terracota disabled:opacity-25"
              >
                <Icone nome="seta" className="h-3 w-3 -rotate-90" />
              </button>
              <button
                type="button"
                aria-label="Descer"
                disabled={i === itens.length - 1}
                onClick={() => mover(i, 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-borda text-texto-suave hover:border-terracota disabled:opacity-25"
              >
                <Icone nome="seta" className="h-3 w-3 rotate-90" />
              </button>
              <button
                type="button"
                aria-label="Remover"
                onClick={() => onChange(itens.filter((_, k) => k !== i))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-borda text-texto-suave hover:border-perigo hover:text-perigo"
              >
                <Icone nome="fechar" className="h-3 w-3" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {itens.length < maximo && (
        <button type="button" onClick={() => onChange([...itens, novo()])} className={`${botaoFantasma} mt-3`}>
          Adicionar
        </button>
      )}
    </div>
  );
}

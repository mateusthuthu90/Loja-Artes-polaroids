"use client";

// Campos de formulário do painel — mesmo visual do cadastro de produto,
// reunidos aqui porque as telas da Home usam todos eles.
import type { ReactNode } from "react";

export const botaoPrincipal =
  "inline-flex items-center justify-center gap-2 rounded-full bg-marrom px-6 py-2.5 text-sm font-semibold text-creme-claro transition hover:bg-texto disabled:cursor-not-allowed disabled:opacity-50";

export const botaoFantasma =
  "inline-flex items-center justify-center gap-2 rounded-full border border-borda px-4 py-2 text-sm font-semibold text-texto transition hover:border-terracota hover:bg-terracota-claro disabled:cursor-not-allowed disabled:opacity-40";

const entrada = (erro?: string) =>
  `w-full rounded-xl border-[1.5px] bg-white px-3 py-2.5 text-base outline-none transition focus:border-terracota ${
    erro ? "border-perigo" : "border-borda"
  }`;

export function Aviso({ tipo = "erro", children }: { tipo?: "erro" | "ok" | "dica"; children: ReactNode }) {
  const cor = {
    erro: "bg-perigo/10 text-perigo",
    ok: "bg-sucesso-claro text-sucesso",
    dica: "bg-creme-claro text-texto-suave",
  }[tipo];
  return <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${cor}`}>{children}</p>;
}

function Moldura({
  rotulo,
  ajuda,
  erro,
  contador,
  children,
}: {
  rotulo: string;
  ajuda?: string;
  erro?: string;
  contador?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 flex justify-between gap-2 font-semibold">
        {rotulo}
        {contador && <span className="font-normal text-texto-fraco">{contador}</span>}
      </span>
      {children}
      {erro ? (
        <span className="mt-1 block text-sm text-perigo">{erro}</span>
      ) : (
        ajuda && <span className="mt-1 block text-xs text-texto-suave">{ajuda}</span>
      )}
    </label>
  );
}

/** Mostra o contador só quando o texto está chegando perto do limite. */
function contadorDe(valor: string, maximo?: number): string | undefined {
  if (!maximo || valor.length < maximo * 0.75) return undefined;
  return `${valor.length}/${maximo}`;
}

export function CampoLinha({
  rotulo,
  ajuda,
  valor,
  maximo,
  erro,
  onChange,
}: {
  rotulo: string;
  ajuda?: string;
  valor: string;
  maximo?: number;
  erro?: string;
  onChange: (v: string) => void;
}) {
  return (
    <Moldura rotulo={rotulo} ajuda={ajuda} erro={erro} contador={contadorDe(valor, maximo)}>
      <input
        type="text"
        value={valor}
        maxLength={maximo}
        onChange={(e) => onChange(e.target.value)}
        className={entrada(erro)}
      />
    </Moldura>
  );
}

export function CampoTexto({
  rotulo,
  ajuda,
  valor,
  maximo,
  erro,
  linhas = 3,
  onChange,
}: {
  rotulo: string;
  ajuda?: string;
  valor: string;
  maximo?: number;
  erro?: string;
  linhas?: number;
  onChange: (v: string) => void;
}) {
  return (
    <Moldura rotulo={rotulo} ajuda={ajuda} erro={erro} contador={contadorDe(valor, maximo)}>
      <textarea
        value={valor}
        rows={linhas}
        maxLength={maximo}
        onChange={(e) => onChange(e.target.value)}
        className={`${entrada(erro)} resize-y`}
      />
    </Moldura>
  );
}

export function CampoSelecao<T extends string>({
  rotulo,
  ajuda,
  valor,
  opcoes,
  erro,
  onChange,
}: {
  rotulo: string;
  ajuda?: string;
  valor: T;
  opcoes: { valor: T; nome: string }[];
  erro?: string;
  onChange: (v: T) => void;
}) {
  return (
    <Moldura rotulo={rotulo} ajuda={ajuda} erro={erro}>
      <select value={valor} onChange={(e) => onChange(e.target.value as T)} className={entrada(erro)}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.nome}
          </option>
        ))}
      </select>
    </Moldura>
  );
}

export function Check({
  marcado,
  onChange,
  children,
}: {
  marcado: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm font-semibold">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-marrom"
      />
      <span>{children}</span>
    </label>
  );
}

import type { ReactNode } from "react";

// Pequenos blocos visuais repetidos nas páginas da loja.

export function Selo({ children }: { children: ReactNode }) {
  return (
    <span className="mb-4 inline-block rounded-full bg-terracota-claro px-4 py-1.5 text-[0.78rem] font-bold uppercase tracking-[0.12em] text-terracota">
      {children}
    </span>
  );
}

export function CabecalhoSecao({
  selo,
  titulo,
  subtitulo,
}: {
  selo?: string;
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      {selo && <Selo>{selo}</Selo>}
      <h2 className="text-3xl font-semibold sm:text-4xl">{titulo}</h2>
      {subtitulo && <p className="mt-3 text-texto-suave">{subtitulo}</p>}
    </div>
  );
}

export const botaoPrimario =
  "inline-flex items-center justify-center gap-2 rounded-full bg-marrom px-7 py-3.5 text-[0.95rem] font-semibold text-creme-claro shadow-suave transition hover:-translate-y-0.5 hover:bg-texto hover:shadow-media disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

export const botaoContorno =
  "inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] border-borda px-7 py-3.5 text-[0.95rem] font-semibold text-texto transition hover:border-terracota hover:bg-cartao";

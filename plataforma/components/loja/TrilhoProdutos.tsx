"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icone } from "@/components/Icone";

/**
 * Faixa de produtos que rola na horizontal.
 * Os cards vêm prontos do servidor (children) — aqui só mora a rolagem.
 * As setas aparecem apenas quando há o que rolar e somem nas pontas.
 */
export function TrilhoProdutos({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [pode, setPode] = useState({ antes: false, depois: false });

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const medir = () => {
      const sobra = el.scrollWidth - el.clientWidth;
      setPode({
        // 4px de folga: zoom do navegador deixa a conta quebrada
        antes: el.scrollLeft > 4,
        depois: sobra > 4 && el.scrollLeft < sobra - 4,
      });
    };
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => {
      el.removeEventListener("scroll", medir);
      obs.disconnect();
    };
  }, [children]);

  function rolar(direcao: -1 | 1) {
    const el = trilho.current;
    if (!el) return;
    // rola quase uma tela cheia, deixando um card de referência visível
    el.scrollBy({ left: direcao * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={trilho}
        className="trilho-h"
        role="group"
        aria-label={`Produtos: ${rotulo}`}
        tabIndex={0}
      >
        {children}
      </div>

      <Seta lado="antes" visivel={pode.antes} onClick={() => rolar(-1)} rotulo="Ver anteriores" />
      <Seta lado="depois" visivel={pode.depois} onClick={() => rolar(1)} rotulo="Ver mais" />
    </div>
  );
}

function Seta({
  lado,
  visivel,
  onClick,
  rotulo,
}: {
  lado: "antes" | "depois";
  visivel: boolean;
  onClick: () => void;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      // escondida do teclado quando não há para onde ir; a rolagem por toque
      // e por teclado no próprio trilho continua funcionando
      tabIndex={visivel ? 0 : -1}
      aria-hidden={!visivel}
      className={`absolute top-[38%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-borda bg-cartao text-marrom shadow-suave transition hover:border-terracota hover:bg-terracota-claro sm:flex ${
        lado === "antes" ? "-left-4" : "-right-4"
      } ${visivel ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <Icone nome="seta" className={`h-4 w-4 ${lado === "antes" ? "rotate-180" : ""}`} />
    </button>
  );
}

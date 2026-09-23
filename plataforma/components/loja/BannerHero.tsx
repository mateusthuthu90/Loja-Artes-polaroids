"use client";

// Banner da home: foto sangrada, título deitado na esquerda e frase de apoio no
// canto inferior direito. Os slides vêm do painel (Home → Banners); o layout e o
// movimento estão em app/banner.css.
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BannerHome, FocoBanner } from "@/lib/types";

const DURACAO = 6000;
/** Abaixo disso o dedo estava clicando, não arrastando. */
const ARRASTO_MINIMO = 45;

const POSICAO: Record<FocoBanner, string> = {
  topo: "center top",
  centro: "center center",
  base: "center bottom",
};

export function BannerHero({ slides }: { slides: BannerHome[] }) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [reduzido, setReduzido] = useState(false);
  const toque = useRef<number | null>(null);
  const arrastou = useRef(false);

  const total = slides.length;
  const ir = useCallback(
    (n: number) => setIndice((atual) => (total > 0 ? ((n % total) + total) % total : atual)),
    [total],
  );

  // Quem pediu menos movimento no sistema recebe o banner parado.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => setReduzido(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  // Autoplay — congela em hover, foco por teclado e aba em segundo plano.
  useEffect(() => {
    if (pausado || reduzido || total < 2) return;
    const t = setTimeout(() => ir(indice + 1), DURACAO);
    return () => clearTimeout(t);
  }, [indice, pausado, reduzido, ir, total]);

  useEffect(() => {
    const aoTrocarAba = () => setPausado(document.hidden);
    document.addEventListener("visibilitychange", aoTrocarAba);
    return () => document.removeEventListener("visibilitychange", aoTrocarAba);
  }, []);

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      ir(indice + 1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      ir(indice - 1);
    }
  }

  function aoPegar(e: React.PointerEvent) {
    toque.current = e.clientX;
    arrastou.current = false;
  }

  function aoSoltar(e: React.PointerEvent) {
    if (toque.current === null) return;
    const d = e.clientX - toque.current;
    toque.current = null;
    if (Math.abs(d) <= ARRASTO_MINIMO) return;
    // marca o arrasto para o clique não disparar o link do slide junto
    arrastou.current = true;
    ir(indice + (d < 0 ? 1 : -1));
  }

  if (total === 0) return null;
  const atual = slides[indice];

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques da loja"
      className="bhn"
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      onKeyDown={aoTeclar}
      onPointerDown={aoPegar}
      onPointerUp={aoSoltar}
      onPointerCancel={() => {
        toque.current = null;
      }}
    >
      {/* h1 único e estável: os títulos dos slides são chamadas, não cabeçalhos */}
      <h1 className="sr-only">Artes Polaroids — lembranças personalizadas com as suas fotos</h1>
      <p className="sr-only" aria-live="polite">
        Banner {indice + 1} de {total}: {atual.titulo}. {atual.subtitulo}
      </p>

      {slides.map((s, i) => {
        const ativo = i === indice;
        return (
          <div key={s.id} className="bhn-slide" data-ativo={ativo} aria-hidden={!ativo} inert={!ativo}>
            <Image
              src={s.imagem}
              alt={s.imagem_alt}
              fill
              // O slide 1 é o LCP da home (`priority` saiu no Next 16). Os outros
              // também carregam de imediato, mas em prioridade baixa: como todos
              // estão na mesma caixa, um slide que só busca a foto ao aparecer
              // entraria com o texto por cima da foto do slide anterior.
              loading="eager"
              fetchPriority={i === 0 ? "high" : "low"}
              sizes="100vw"
              className="bhn-foto"
              style={{ objectPosition: POSICAO[s.foco] }}
            />

            <span className="bhn-veu" aria-hidden />

            <Link
              href={s.cta_link || "/produtos"}
              className="bhn-area"
              onClick={(e) => {
                // o clique que fecha um arrasto não deve abrir o link; a marca
                // é consumida aqui para não travar o próximo clique de verdade
                if (arrastou.current) {
                  e.preventDefault();
                  arrastou.current = false;
                }
              }}
            >
              <span className="sr-only">{s.titulo} — ver produtos</span>
            </Link>

            <p className="bhn-titulo" style={{ ["--n" as string]: s.titulo.trim().length }}>
              {s.titulo}
            </p>

            {s.subtitulo && (
              <p className="bhn-apoio">
                <span className="bhn-brilho" aria-hidden>
                  ✦
                </span>
                {s.subtitulo}
              </p>
            )}
          </div>
        );
      })}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => ir(indice - 1)}
            className="bhn-seta bhn-seta--ant"
            aria-label="Banner anterior"
          >
            <Chevron className="rotate-180" />
          </button>

          <div className="bhn-dots">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => ir(i)}
                className="bhn-dot"
                aria-label={`Ir para o banner ${i + 1}: ${s.titulo}`}
                aria-current={i === indice}
              >
                <span />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => ir(indice + 1)}
            className="bhn-seta bhn-seta--prox"
            aria-label="Próximo banner"
          >
            <Chevron />
          </button>
        </>
      )}
    </section>
  );
}

/** Seta fina, no traço do resto do banner. */
function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`h-6 w-6 ${className}`}
    >
      <path d="M9 4.5 16.5 12 9 19.5" />
    </svg>
  );
}

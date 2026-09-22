"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { botaoContorno, botaoPrimario } from "@/components/loja/ui";
import { Icone } from "@/components/Icone";
import type { SlideBanner } from "@/lib/banners";

const DURACAO = 7000;

export function BannerHero({ slides }: { slides: SlideBanner[] }) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [reduzido, setReduzido] = useState(false);
  const raiz = useRef<HTMLElement>(null);
  const toque = useRef<number | null>(null);

  const total = slides.length;
  const ir = useCallback((n: number) => setIndice(((n % total) + total) % total), [total]);

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

  // Parallax: cada camada lê --px/--py com um fator próprio, o que cria profundidade.
  function mover(e: React.PointerEvent<HTMLElement>) {
    if (reduzido || e.pointerType !== "mouse") return;
    const el = raiz.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  }

  function soltarParallax() {
    const el = raiz.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  }

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

  const atual = slides[indice];

  return (
    <section
      ref={raiz}
      aria-roledescription="carrossel"
      aria-label="Destaques da loja"
      className="bh relative overflow-hidden"
      style={{ ["--halo" as string]: atual.halo }}
      onPointerMove={mover}
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => {
        soltarParallax();
        setPausado(false);
      }}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      onKeyDown={aoTeclar}
    >
      <div className="bh-halo" aria-hidden />

      {/* h1 único e estável: os títulos dos slides são frases promocionais, não cabeçalhos */}
      <h1 className="sr-only">Artes Polaroids — lembranças personalizadas com as suas fotos</h1>
      <p className="sr-only" aria-live="polite">
        Banner {indice + 1} de {total}: {atual.titulo} {atual.destaque}
      </p>

      <div className="mx-auto grid max-w-6xl items-center gap-4 px-4 pb-8 pt-10 sm:pt-12 md:grid-cols-[1.02fr_0.98fr] md:gap-8 md:pb-10">
        {/* ---------- textos empilhados ---------- */}
        <div className="grid">
          {slides.map((s, i) => {
            const ativo = i === indice;
            return (
              <div
                key={s.id}
                className={`bh-texto text-center md:text-left ${ativo ? "bh-on" : ""}`}
                aria-hidden={!ativo}
                inert={!ativo}
              >
                <span className="bh-item mb-4 inline-block rounded-full bg-terracota-claro px-4 py-1.5 text-[0.78rem] font-bold uppercase tracking-[0.12em] text-terracota-profundo">
                  {s.selo}
                </span>
                <p className="bh-item font-display text-[2.05rem] font-semibold leading-[1.13] sm:text-5xl">
                  {s.titulo} {s.destaque ? <em className="bh-destaque">{s.destaque}</em> : null}
                </p>
                <p className="bh-item mx-auto mt-4 max-w-lg text-lg text-texto-suave md:mx-0">
                  {s.subtitulo}
                </p>
                <div className="bh-item mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
                  <Link href="/produtos" className={botaoPrimario}>
                    {s.cta}
                  </Link>
                  <Link href="#como-funciona" className={botaoContorno}>
                    Como funciona
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* ---------- palco das polaroids ---------- */}
        <div
          className="bh-palco grid"
          onPointerDown={(e) => {
            toque.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (toque.current === null) return;
            const d = e.clientX - toque.current;
            toque.current = null;
            if (Math.abs(d) > 45) ir(indice + (d < 0 ? 1 : -1));
          }}
        >
          {/* pilha de papel: puro CSS, custo zero de imagem */}
          <div className="bh-pilha" aria-hidden>
            <span />
            <span />
          </div>

          {slides.map((s, i) => {
            const ativo = i === indice;
            return (
              <div key={s.id} className={`bh-cena ${ativo ? "bh-on" : ""}`} aria-hidden={!ativo}>
                <div className="bh-flutua" style={{ ["--f" as string]: "-16px" }}>
                  <figure className="bh-polaroid" style={{ ["--giro" as string]: s.giro[0] }}>
                    <span className="bh-fita" aria-hidden />
                    <div className="bh-foto">
                      <Image
                        src={s.imagem.src}
                        alt={s.imagem.alt}
                        fill
                        // o slide 1 é o LCP da home; `priority` saiu no Next 16
                        loading={i === 0 ? "eager" : "lazy"}
                        fetchPriority={i === 0 ? "high" : "auto"}
                        sizes="(max-width: 768px) 68vw, 360px"
                        className="bh-kb object-cover"
                      />
                    </div>
                    <figcaption className="bh-legenda">{s.legenda}</figcaption>
                  </figure>
                </div>

                <div className="bh-flutua bh-flutua--apoio" style={{ ["--f" as string]: "30px" }}>
                  <figure
                    className="bh-polaroid bh-polaroid--apoio"
                    style={{ ["--giro" as string]: s.giro[1] }}
                  >
                    <div className="bh-foto">
                      <Image
                        src={s.apoio.src}
                        alt={s.apoio.alt}
                        fill
                        sizes="(max-width: 768px) 34vw, 180px"
                        className="bh-kb object-cover"
                      />
                    </div>
                  </figure>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- controles ---------- */}
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 pb-10 sm:pb-12 md:justify-start">
        <button type="button" onClick={() => ir(indice - 1)} className="bh-seta" aria-label="Banner anterior">
          <Icone nome="seta" className="h-4 w-4 rotate-180" />
        </button>
        <div className="flex items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => ir(i)}
              className="bh-dot"
              aria-label={`Ir para o banner ${i + 1}: ${s.titulo}`}
              aria-current={i === indice}
            >
              <span className="bh-trilho">
                {i === indice && (
                  <span
                    key={indice}
                    className="bh-preenche"
                    style={{
                      animationDuration: `${DURACAO}ms`,
                      animationPlayState: pausado || reduzido ? "paused" : "running",
                    }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => ir(indice + 1)} className="bh-seta" aria-label="Próximo banner">
          <Icone nome="seta" className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

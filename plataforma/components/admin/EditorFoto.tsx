"use client";

// Editor de enquadramento das fotos de produto: zoom, arrastar, girar e
// "caber inteira" (diminui a foto e completa com fundo). O quadro tem a mesma
// proporção da galeria da loja, então o que você vê aqui é o que aparece lá.
import { useCallback, useEffect, useRef, useState } from "react";
import { Icone } from "@/components/Icone";

const SAIDA_L = 1600;
const SAIDA_A = 1520; // proporção 1 : 0,95 (galeria e cards da loja)
const ZOOM_MAX = 4;
const FUNDOS = { branco: "#ffffff", creme: "#faf5ea" } as const;

interface Props {
  fonte: Blob;
  titulo: string;
  onConcluir: (resultado: Blob) => void;
  onCancelar: () => void;
}

export function EditorFoto({ fonte, titulo, onConcluir, onCancelar }: Props) {
  const quadro = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [largura, setLargura] = useState(0); // largura do quadro em px
  const [zoom, setZoom] = useState(1); // 1 = preenche o quadro
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [giro, setGiro] = useState(0);
  const [fundo, setFundo] = useState<keyof typeof FUNDOS>("branco");
  const [salvando, setSalvando] = useState(false);

  // carrega a imagem respeitando a rotação do celular (EXIF)
  useEffect(() => {
    let cancelado = false;
    const link = URL.createObjectURL(fonte);
    createImageBitmap(fonte, { imageOrientation: "from-image" })
      .then((b) => {
        if (cancelado) return b.close();
        setBitmap(b);
        setUrl(link);
      })
      .catch(() => !cancelado && setErro("Não foi possível abrir esta imagem. Use JPG, PNG ou WebP."));
    return () => {
      cancelado = true;
      URL.revokeObjectURL(link);
    };
  }, [fonte]);

  useEffect(() => {
    const el = quadro.current;
    if (!el) return;
    const medir = () => setLargura(el.clientWidth);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [bitmap]);

  const altura = largura * (SAIDA_A / SAIDA_L);
  const iw = bitmap?.width ?? 1;
  const ih = bitmap?.height ?? 1;
  const deitada = giro % 180 !== 0;
  const rw = deitada ? ih : iw;
  const rh = deitada ? iw : ih;
  const cobrir = largura ? Math.max(largura / rw, altura / rh) : 1;
  const caber = largura ? Math.min(largura / rw, altura / rh) : 1;
  const zoomMin = caber / cobrir; // < 1: permite ver a foto inteira
  const escala = cobrir * zoom;

  const limitar = useCallback(
    (x: number, y: number, z = zoom) => {
      const s = cobrir * z;
      const mx = Math.abs(rw * s - largura) / 2;
      const my = Math.abs(rh * s - altura) / 2;
      return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
    },
    [cobrir, zoom, rw, rh, largura, altura],
  );

  function mudarZoom(z: number) {
    const novo = Math.max(zoomMin, Math.min(ZOOM_MAX, z));
    setZoom(novo);
    setPos((p) => limitar(p.x, p.y, novo));
  }

  function girar() {
    setGiro((g) => (g + 90) % 360);
    setZoom(1);
    setPos({ x: 0, y: 0 });
  }

  async function aplicar() {
    if (!bitmap || !largura) return;
    setSalvando(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = SAIDA_L;
      canvas.height = SAIDA_A;
      const ctx = canvas.getContext("2d")!;
      const k = SAIDA_L / largura;
      ctx.fillStyle = FUNDOS[fundo];
      ctx.fillRect(0, 0, SAIDA_L, SAIDA_A);
      ctx.imageSmoothingQuality = "high";
      ctx.translate(SAIDA_L / 2 + pos.x * k, SAIDA_A / 2 + pos.y * k);
      ctx.rotate((giro * Math.PI) / 180);
      ctx.scale(escala * k, escala * k);
      ctx.drawImage(bitmap, -iw / 2, -ih / 2);
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.88));
      if (!blob) throw new Error();
      onConcluir(blob);
    } catch {
      setErro("Não foi possível gerar a imagem. Tente de novo.");
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-3" role="dialog" aria-modal="true" aria-label="Ajustar foto">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-grande bg-cartao p-4 shadow-forte sm:p-5">
        <h2 className="text-lg font-semibold">Ajustar foto</h2>
        <p className="mb-3 truncate text-xs text-texto-suave">{titulo}</p>

        {erro ? (
          <p className="rounded-xl bg-perigo/10 p-4 text-sm text-perigo">{erro}</p>
        ) : (
          <>
            <div
              ref={quadro}
              className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-card active:cursor-grabbing"
              style={{ aspectRatio: `${SAIDA_L} / ${SAIDA_A}`, background: FUNDOS[fundo] }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                arrasto.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY };
              }}
              onPointerMove={(e) => {
                const a = arrasto.current;
                if (a) setPos(limitar(a.x + e.clientX - a.px, a.y + e.clientY - a.py));
              }}
              onPointerUp={() => (arrasto.current = null)}
              onPointerCancel={() => (arrasto.current = null)}
              onWheel={(e) => mudarZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
            >
              {url && largura > 0 && (
                // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:), não passa pelo otimizador
                <img
                  src={url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                  style={{
                    width: iw,
                    height: ih,
                    transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotate(${giro}deg) scale(${escala})`,
                  }}
                />
              )}
              {!bitmap && <p className="absolute inset-0 flex items-center justify-center text-sm text-texto-suave">Carregando…</p>}
              {/* grade de terços para ajudar a enquadrar */}
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, i) => <span key={i} className="border border-white/25" />)}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm" aria-hidden>－</span>
              <input
                type="range"
                min={zoomMin}
                max={ZOOM_MAX}
                step={0.01}
                value={zoom}
                onChange={(e) => mudarZoom(Number(e.target.value))}
                className="flex-1 accent-marrom"
                aria-label="Zoom"
              />
              <span className="text-sm" aria-hidden>＋</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <button type="button" onClick={() => { setZoom(1); setPos({ x: 0, y: 0 }); }} className={botao}>Preencher</button>
              <button type="button" onClick={() => { setZoom(zoomMin); setPos({ x: 0, y: 0 }); }} className={botao}>Caber inteira</button>
              <button type="button" onClick={girar} className={`${botao} inline-flex items-center gap-1.5`}>
                <Icone nome="girar" className="h-4 w-4" />
                Girar
              </button>
              <span className="ml-auto flex items-center gap-1 text-xs text-texto-suave">
                Fundo:
                {(Object.keys(FUNDOS) as (keyof typeof FUNDOS)[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFundo(f)}
                    aria-label={`Fundo ${f}`}
                    aria-pressed={fundo === f}
                    className={`h-6 w-6 rounded-full border-2 ${fundo === f ? "border-marrom" : "border-borda"}`}
                    style={{ background: FUNDOS[f] }}
                  />
                ))}
              </span>
            </div>
            <p className="mt-2 text-xs text-texto-fraco">Arraste a foto para enquadrar. Use a barra (ou a roda do mouse) para aproximar ou afastar.</p>
          </>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancelar} className="rounded-full border border-borda px-5 py-2.5 text-sm font-semibold hover:border-terracota">
            Cancelar
          </button>
          {!erro && (
            <button type="button" onClick={aplicar} disabled={!bitmap || salvando} className="rounded-full bg-marrom px-6 py-2.5 text-sm font-semibold text-creme-claro hover:bg-texto disabled:opacity-50">
              {salvando ? "Salvando…" : "Usar esta foto"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const botao = "rounded-full border border-borda px-3 py-1.5 font-semibold hover:border-terracota hover:bg-terracota-claro";

"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { processarFoto, type FotoProcessada } from "@/lib/imagem";
import { createClient } from "@/lib/supabase/client";
import { FOTO_LADO_MINIMO_RECOMENDADO, FOTO_TAMANHO_MAXIMO } from "@/lib/validacao";
import type { LinhaCarrinho } from "../linhas-carrinho";
import type { FotoEnviada } from "./estado";

const LOTE = 20; // máximo de fotos por pedido de assinatura
const PARALELO = 3; // uploads simultâneos (4G não aguenta muito mais)

interface Pendente {
  id: string;
  nome: string;
  erro?: string;
}

export function UploadFotosItem({
  linha,
  sessao,
  fotos,
  onAdicionar,
  onRemover,
}: {
  linha: LinhaCarrinho;
  sessao: string;
  fotos: FotoEnviada[];
  onAdicionar: (foto: FotoEnviada) => void;
  onRemover: (caminho: string) => void;
}) {
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const { fotosMin, fotosMax, produto, item } = linha;
  const emAndamento = pendentes.filter((p) => !p.erro).length;
  const vagas = fotosMax - fotos.length - emAndamento;
  const completo = fotos.length >= fotosMin && fotos.length <= fotosMax;
  const sobrando = fotos.length - fotosMax;

  async function enviar(lista: FileList | File[]) {
    setAviso(null);
    const arquivos = Array.from(lista).filter(ehImagem);
    if (arquivos.length < lista.length) setAviso("Alguns arquivos não são fotos e foram ignorados.");
    if (arquivos.length > vagas) {
      setAviso(
        vagas <= 0
          ? `Este item já tem as ${fotosMax} fotos necessárias.`
          : `Você selecionou ${arquivos.length} fotos, mas só faltam ${vagas}. Enviamos as primeiras ${vagas}.`,
      );
    }
    const aceitos = arquivos.slice(0, Math.max(0, vagas));
    if (aceitos.length === 0) return;

    const fila = aceitos.map((arquivo) => ({ arquivo, id: crypto.randomUUID() }));
    setPendentes((p) => [...p, ...fila.map(({ id, arquivo }) => ({ id, nome: arquivo.name }))]);

    const falhar = (id: string, erro: string) =>
      setPendentes((p) => p.map((x) => (x.id === id ? { ...x, erro } : x)));
    const concluir = (id: string) => setPendentes((p) => p.filter((x) => x.id !== id));

    for (let i = 0; i < fila.length; i += LOTE) {
      const lote = fila.slice(i, i + LOTE);

      // 1) comprime no navegador
      const processadas: { id: string; nome: string; foto: FotoProcessada }[] = [];
      await emParalelo(lote, PARALELO, async ({ arquivo, id }) => {
        try {
          const foto = await processarFoto(normalizarTipo(arquivo));
          if (foto.arquivo.size > FOTO_TAMANHO_MAXIMO) return falhar(id, "Foto maior que 15 MB");
          processadas.push({ id, nome: arquivo.name, foto });
        } catch {
          falhar(id, "Não conseguimos ler esta foto");
        }
      });
      if (processadas.length === 0) continue;

      // 2) pede ao servidor URLs de envio (uma por foto)
      let assinaturas: { caminho: string; token: string }[];
      try {
        const resp = await fetch("/api/uploads/assinar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessao,
            arquivos: processadas.map((p) => ({ tipo: p.foto.tipo, tamanho: p.foto.arquivo.size })),
          }),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.erro ?? "Falha ao preparar envio");
        assinaturas = json.assinaturas;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha ao preparar envio";
        processadas.forEach((p) => falhar(p.id, msg));
        continue;
      }

      // 3) envia direto para o Storage privado
      const storage = createClient().storage.from("fotos-clientes");
      await emParalelo(processadas.map((p, j) => ({ ...p, ...assinaturas[j] })), PARALELO, async (p) => {
        const { error } = await storage.uploadToSignedUrl(p.caminho, p.token, p.foto.arquivo, {
          contentType: p.foto.tipo,
        });
        if (error) return falhar(p.id, "Falha no envio. Verifique sua internet.");
        onAdicionar({
          caminho: p.caminho,
          nome: p.nome,
          miniatura: p.foto.miniatura,
          largura: p.foto.largura,
          altura: p.foto.altura,
        });
        concluir(p.id);
      });
    }
  }

  return (
    <section className="rounded-grande border border-borda bg-cartao p-4 sm:p-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{produto.nome}</h3>
          <p className="text-sm text-texto-suave">
            {[...Object.values(item.opcoes), item.quantidade > 1 ? `${item.quantidade}×` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
            completo ? "bg-sucesso-claro text-sucesso" : "bg-dourado-claro text-marrom"
          }`}
          aria-live="polite"
        >
          {completo && "✓ "}
          {fotos.length} de {fotosMin === fotosMax ? fotosMax : `${fotosMin}–${fotosMax}`} fotos
        </span>
      </header>

      {sobrando > 0 && (
        <p className="mb-3 rounded-xl bg-perigo/10 px-3 py-2 text-sm text-perigo">
          Este item tem {sobrando} {sobrando === 1 ? "foto" : "fotos"} a mais. Remova {sobrando === 1 ? "uma" : sobrando}.
        </p>
      )}

      {vagas > 0 && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            enviar(e.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-4 py-8 text-center transition ${
            arrastando ? "border-terracota bg-terracota-claro" : "border-borda hover:border-terracota hover:bg-creme-claro"
          }`}
        >
          <span className="mb-2 text-3xl" aria-hidden>📷</span>
          <span className="font-semibold">Toque para escolher suas fotos</span>
          <span className="mt-1 text-xs text-texto-suave">
            ou arraste para cá · faltam {vagas} · JPG, PNG, HEIC ou WebP
          </span>
          <input
            ref={input}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) enviar(e.target.files);
              e.target.value = ""; // permite escolher a mesma foto de novo
            }}
          />
        </label>
      )}

      {aviso && <p className="mt-3 text-sm text-marrom">{aviso}</p>}

      {(fotos.length > 0 || pendentes.length > 0) && (
        <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {fotos.map((f) => {
            const baixaResolucao =
              f.largura !== null && f.altura !== null && Math.min(f.largura, f.altura) < FOTO_LADO_MINIMO_RECOMENDADO;
            return (
              <li key={f.caminho} className="group relative aspect-square overflow-hidden rounded-xl bg-terracota-claro">
                {f.miniatura ? (
                  <Image src={f.miniatura} alt={f.nome} fill unoptimized className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center p-1 text-center text-[0.6rem] text-texto-suave">
                    {f.nome}
                  </span>
                )}
                {baixaResolucao && (
                  <span
                    className="absolute bottom-1 left-1 rounded bg-dourado px-1 text-[0.6rem] font-bold text-[#3a2b0f]"
                    title="Foto com baixa resolução: pode ficar pixelada na impressão"
                  >
                    ⚠ baixa
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemover(f.caminho)}
                  aria-label={`Remover foto ${f.nome}`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-texto/70 text-xs text-white"
                >
                  ✕
                </button>
              </li>
            );
          })}
          {pendentes.map((p) => (
            <li
              key={p.id}
              className={`relative flex aspect-square items-center justify-center rounded-xl p-1 text-center text-[0.6rem] ${
                p.erro ? "bg-perigo/10 text-perigo" : "animate-pulse bg-creme-claro text-texto-suave"
              }`}
            >
              {p.erro ? (
                <>
                  <span>{p.erro}</span>
                  <button
                    type="button"
                    onClick={() => setPendentes((l) => l.filter((x) => x.id !== p.id))}
                    aria-label="Dispensar erro"
                    className="absolute right-1 top-1 text-xs"
                  >
                    ✕
                  </button>
                </>
              ) : (
                "enviando…"
              )}
            </li>
          ))}
        </ul>
      )}

      {fotos.some((f) => f.largura !== null && f.altura !== null && Math.min(f.largura, f.altura) < FOTO_LADO_MINIMO_RECOMENDADO) && (
        <p className="mt-3 text-xs text-texto-suave">
          ⚠ Fotos marcadas como <strong>baixa</strong> têm pouca resolução e podem sair pixeladas. Se tiver a original, prefira ela.
        </p>
      )}
    </section>
  );
}

function ehImagem(f: File): boolean {
  return f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);
}

/** Alguns navegadores (Windows) entregam HEIC com type vazio. */
function normalizarTipo(f: File): File {
  if (f.type) return f;
  return new File([f], f.name, { type: "image/heic" });
}

async function emParalelo<T>(itens: T[], limite: number, fn: (item: T) => Promise<unknown>) {
  let i = 0;
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (i < itens.length) await fn(itens[i++]);
  });
  await Promise.all(trabalhadores);
}

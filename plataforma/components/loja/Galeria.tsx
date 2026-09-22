"use client";

import Image from "next/image";
import { useState } from "react";

export function Galeria({ imagens, nome }: { imagens: string[]; nome: string }) {
  const [ativa, setAtiva] = useState(0);

  return (
    <div>
      <div className="relative mb-3 aspect-[1/0.95] overflow-hidden rounded-grande bg-terracota-claro">
        <Image
          src={imagens[ativa]}
          alt={nome}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 560px"
          className="object-cover"
        />
      </div>
      {imagens.length > 1 && (
        <div className="flex gap-2">
          {imagens.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setAtiva(i)}
              aria-label={`Ver foto ${i + 1} de ${nome}`}
              aria-current={i === ativa}
              className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 transition ${
                i === ativa ? "border-terracota" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

// Tela do Pix: QR Code, copia-e-cola e contagem até expirar.
//
// A página se atualiza sozinha de tempos em tempos para pegar a confirmação do
// pagamento. Quem confirma é o webhook do Mercado Pago (Prompt 7) — enquanto
// ele não existir, o status fica em "aguardando_pagamento" mesmo após o pagamento.
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icone, type NomeIcone } from "@/components/Icone";
import { formatarBRL } from "@/lib/preco";
import { botaoPrimario } from "../ui";

const RECARREGAR_A_CADA = 8_000;

export function PixPagamento({
  codigo,
  total,
  status,
  qrcodeBase64,
  copiaCola,
  expiraEm,
  whatsapp,
  prazoDias,
}: {
  codigo: string;
  total: number;
  status: string;
  qrcodeBase64: string | null;
  copiaCola: string | null;
  expiraEm: string | null;
  whatsapp: string;
  prazoDias: number;
}) {
  const router = useRouter();
  const pago = status !== "aguardando_pagamento" && status !== "cancelado";
  const cancelado = status === "cancelado";

  // enquanto não pagar, busca o status de novo sem o cliente precisar recarregar
  useEffect(() => {
    if (pago || cancelado) return;
    const t = setInterval(() => router.refresh(), RECARREGAR_A_CADA);
    return () => clearInterval(t);
  }, [pago, cancelado, router]);

  if (cancelado) {
    return (
      <Cartao>
        <Titulo icone="alerta" texto="Este pedido foi cancelado" />
        <p className="text-texto-suave">
          O pedido <strong>{codigo}</strong> não está mais valendo. Se foi engano, fale com a gente.
        </p>
        <BotaoWhatsApp whatsapp={whatsapp} codigo={codigo} />
      </Cartao>
    );
  }

  if (pago) {
    return (
      <Cartao>
        <Titulo icone="confirmado" texto="Pagamento confirmado!" />
        <p className="text-texto-suave">
          Recebemos o seu Pix. O pedido <strong>{codigo}</strong> entrou na fila de produção — fica
          pronto em até {prazoDias} dias úteis.
        </p>
        <p className="mt-2 text-sm text-texto-suave">
          <strong className="text-texto">Agora é só mandar suas fotos pelo WhatsApp.</strong> A
          gente já vai chamar você por lá para combinar o envio. Guarde este código: é por ele que
          a gente se encontra.
        </p>
        <BotaoWhatsApp whatsapp={whatsapp} codigo={codigo} />
      </Cartao>
    );
  }

  return (
    <Cartao>
      <Titulo icone="relogio" texto="Falta pagar" />
      <p className="text-texto-suave">
        Pedido <strong>{codigo}</strong> — <strong className="text-texto">{formatarBRL(total)}</strong>
      </p>
      <Expiracao expiraEm={expiraEm} />

      {qrcodeBase64 ? (
        <div className="mt-5 flex justify-center">
          <Image
            src={`data:image/png;base64,${qrcodeBase64}`}
            alt={`QR Code do Pix do pedido ${codigo}`}
            width={260}
            height={260}
            unoptimized
            className="rounded-grande border border-borda bg-white p-3"
          />
        </div>
      ) : (
        <p className="mt-5 rounded-grande bg-creme-claro p-4 text-sm text-texto-suave">
          O QR Code não pôde ser gerado. Use o código abaixo ou fale com a gente pelo WhatsApp.
        </p>
      )}

      {copiaCola && <CopiaCola valor={copiaCola} />}

      <ol className="mt-6 space-y-1 text-sm text-texto-suave">
        <li>1. Abra o app do seu banco e escolha Pix.</li>
        <li>2. Leia o QR Code ou cole o código.</li>
        <li>3. Confirme — esta página avisa sozinha quando o pagamento cair.</li>
      </ol>

      <p className="mt-4 text-xs text-texto-fraco">
        A produção começa depois da confirmação do pagamento e leva até {prazoDias} dias úteis.
      </p>
      <BotaoWhatsApp whatsapp={whatsapp} codigo={codigo} />
    </Cartao>
  );
}

function CopiaCola({ valor }: { valor: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
    } catch {
      return; // navegador sem permissão: o cliente ainda consegue selecionar o texto
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <div className="mt-5">
      <p className="mb-2 text-sm font-semibold">Pix copia e cola</p>
      <textarea
        readOnly
        value={valor}
        rows={3}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full resize-none rounded-grande border border-borda bg-creme-claro p-3 font-mono text-xs text-texto-suave"
      />
      <button type="button" onClick={copiar} className={`${botaoPrimario} mt-2 w-full`}>
        {copiado ? "Código copiado!" : "Copiar código"}
      </button>
    </div>
  );
}

function Expiracao({ expiraEm }: { expiraEm: string | null }) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    if (!expiraEm) return;
    const alvo = new Date(expiraEm).getTime();
    const tick = () => setRestante(Math.max(0, alvo - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiraEm]);

  if (restante === null) return null;
  if (restante === 0) {
    return (
      <p className="mt-2 text-sm font-semibold text-perigo">
        Este Pix expirou. Refaça o pedido ou fale com a gente.
      </p>
    );
  }

  const minutos = Math.floor(restante / 60_000);
  const segundos = Math.floor((restante % 60_000) / 1000);
  return (
    <p className="mt-2 text-sm text-texto-suave">
      Vale por mais{" "}
      <strong className="text-texto">
        {minutos}:{String(segundos).padStart(2, "0")}
      </strong>
    </p>
  );
}

function BotaoWhatsApp({ whatsapp, codigo }: { whatsapp: string; codigo: string }) {
  const texto = encodeURIComponent(`Olá! Falando sobre o pedido ${codigo}.`);
  return (
    <a
      href={`https://wa.me/${whatsapp}?text=${texto}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-5 block text-center text-sm font-semibold text-terracota hover:underline"
    >
      Falar com a gente no WhatsApp
    </a>
  );
}

function Cartao({ children }: { children: React.ReactNode }) {
  return <div className="rounded-grande border border-borda bg-cartao p-5 sm:p-7">{children}</div>;
}

function Titulo({ icone, texto }: { icone: NomeIcone; texto: string }) {
  return (
    <h1 className="mb-3 flex items-center gap-2 text-2xl font-semibold">
      <Icone nome={icone} className="h-6 w-6 text-terracota" />
      {texto}
    </h1>
  );
}

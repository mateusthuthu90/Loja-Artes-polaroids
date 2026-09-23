import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtualizaStatus } from "@/components/loja/checkout/AtualizaStatus";
import { botaoContorno, botaoPrimario } from "@/components/loja/ui";
import { lerConfig } from "@/lib/catalogo";
import { formatarBRL } from "@/lib/preco";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkWhatsApp } from "@/lib/whatsapp";

// Nunca cachear: o status do pagamento muda.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagamento com cartão",
  robots: { index: false, follow: false },
};

const REGEX_CODIGO = /^AP-\d{4}-\d{4}$/;

// Mesma dívida da tela do Pix: o código do pedido é sequencial e adivinhável,
// então aqui não aparece nenhum dado pessoal do cliente — só valor e status.
export default async function PaginaCartao({ params }: PageProps<"/checkout/cartao/[codigo]">) {
  const { codigo } = await params;
  if (!REGEX_CODIGO.test(codigo)) notFound();

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    notFound();
  }

  const [{ data: pedido }, config] = await Promise.all([
    supabase
      .from("pedidos")
      .select("codigo, total, status, parcelas")
      .eq("codigo", codigo)
      .maybeSingle(),
    lerConfig(),
  ]);

  if (!pedido) notFound();

  const pago = pedido.status !== "aguardando_pagamento" && pedido.status !== "cancelado";
  const cancelado = pedido.status === "cancelado";
  const parcelas = Number(pedido.parcelas ?? 1);

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* Enquanto o Mercado Pago analisa, a página se atualiza sozinha. */}
      {!pago && !cancelado && <AtualizaStatus />}

      <div className="rounded-grande border border-borda bg-cartao p-6 text-center sm:p-8">
        <p className="text-sm text-texto-suave">Pedido {pedido.codigo}</p>

        {pago ? (
          <>
            <h1 className="mt-2 text-2xl font-bold text-sucesso">Pagamento aprovado</h1>
            <p className="mt-3 text-texto-suave">
              Recebemos {formatarBRL(Number(pedido.total))}
              {parcelas > 1 ? ` em ${parcelas}x` : " à vista"}. Já vamos começar a produção.
            </p>
            <p className="mt-2 text-sm text-texto-suave">
              Produção em até {config.prazo_producao.dias_uteis} dias úteis. A gente avisa pelo WhatsApp
              quando estiver pronto.
            </p>
          </>
        ) : cancelado ? (
          <>
            <h1 className="mt-2 text-2xl font-bold text-perigo">Pagamento não concluído</h1>
            <p className="mt-3 text-texto-suave">
              Este pedido foi cancelado. Se você acha que houve um engano, fale com a gente.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold">Confirmando seu pagamento</h1>
            <p className="mt-3 text-texto-suave">
              O Mercado Pago está analisando a compra de {formatarBRL(Number(pedido.total))}. Isso costuma
              levar poucos minutos.
            </p>
            <p className="mt-2 text-sm text-texto-suave">
              Pode fechar esta página: assim que for aprovado, a gente avisa pelo WhatsApp.
            </p>
          </>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/produtos" className={pago ? botaoContorno : botaoPrimario}>
            Continuar comprando
          </Link>
          {config.contato.whatsapp && (
            <a
              href={linkWhatsApp(config.contato.whatsapp, `Olá! Sobre o pedido ${pedido.codigo}`)}
              target="_blank"
              rel="noopener noreferrer"
              className={botaoContorno}
            >
              Falar no WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

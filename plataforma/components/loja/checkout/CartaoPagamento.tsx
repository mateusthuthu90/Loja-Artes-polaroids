"use client";

// Formulário de cartão do Mercado Pago ("Card Payment Brick").
//
// Por que não é um formulário nosso: o número do cartão e o CVV vão do navegador
// do cliente DIRETO para o Mercado Pago. Nosso servidor recebe só um `token` de
// uso único que representa aquele cartão naquela compra. Nunca vemos o número,
// nunca ele aparece num log nosso, e não precisamos de certificação PCI.
//
// O Brick também resolve sozinho o que daria muito trabalho na mão: detectar a
// bandeira, listar as parcelas com os juros de cada uma, validar os campos e
// traduzir os erros. Os juros são do cliente (decisão do lojista), que é o
// comportamento padrão quando mandamos o valor à vista.
//
// Carregamos o SDK por <script> em vez de pacote npm: o site roda em Cloudflare
// Workers e o SDK é mantido para o navegador, não para bundler.
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_PARCELAS = 12;

export interface DadosCartao {
  token: string;
  parcelas: number;
  metodoId: string;
  emissorId: string;
}

interface Props {
  total: number;
  /** Deve devolver uma promessa que rejeita se o pagamento não passar. */
  onPagar: (dados: DadosCartao) => Promise<void>;
}

/** O SDK se pendura no window; não há tipagem oficial publicada. */
interface JanelaComMP extends Window {
  MercadoPago?: new (chave: string, opcoes?: { locale?: string }) => {
    bricks: () => {
      create: (tipo: string, container: string, config: unknown) => Promise<{ unmount: () => void }>;
    };
  };
}

export function CartaoPagamento({ total, onPagar }: Props) {
  const chavePublica = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  const [sdkPronto, setSdkPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [montando, setMontando] = useState(true);

  // O callback do Brick é criado uma vez, mas precisa enxergar o onPagar atual.
  const onPagarRef = useRef(onPagar);
  useEffect(() => {
    onPagarRef.current = onPagar;
  }, [onPagar]);

  const montarBrick = useCallback(async () => {
    const janela = window as JanelaComMP;
    if (!janela.MercadoPago || !chavePublica) return null;

    const mp = new janela.MercadoPago(chavePublica, { locale: "pt-BR" });
    return mp.bricks().create("cardPayment", "brick-cartao", {
      initialization: {
        // Valor à vista. O Mercado Pago acrescenta o juro de cada parcela na
        // simulação que o cliente vê — por isso o total do pedido não muda.
        amount: total,
      },
      customization: {
        paymentMethods: { maxInstallments: MAX_PARCELAS },
        visual: { style: { theme: "default" } },
      },
      callbacks: {
        onReady: () => setMontando(false),
        onSubmit: (dadosFormulario: {
          token: string;
          installments: number;
          payment_method_id: string;
          issuer_id: string;
        }) =>
          onPagarRef.current({
            token: dadosFormulario.token,
            parcelas: Number(dadosFormulario.installments) || 1,
            metodoId: dadosFormulario.payment_method_id,
            emissorId: String(dadosFormulario.issuer_id ?? ""),
          }),
        onError: (e: { message?: string }) => {
          console.error("[brick-cartao]", e);
          setErro(e?.message ?? "Não foi possível carregar o formulário do cartão.");
          setMontando(false);
        },
      },
    });
  }, [chavePublica, total]);

  useEffect(() => {
    if (!sdkPronto) return;
    let vivo = true;
    let instancia: { unmount: () => void } | null = null;

    montarBrick()
      .then((b) => {
        if (!vivo) {
          b?.unmount();
          return;
        }
        instancia = b;
      })
      .catch((e) => {
        console.error("[brick-cartao] falha ao montar", e);
        setErro("Não foi possível carregar o formulário do cartão.");
        setMontando(false);
      });

    return () => {
      vivo = false;
      instancia?.unmount();
    };
  }, [sdkPronto, montarBrick]);

  // Sem a chave pública o formulário não existe. Acontece se a variável de
  // ambiente não foi configurada — o cliente não pode ficar olhando um vazio.
  if (!chavePublica) {
    return (
      <p className="rounded-grande border border-borda bg-cartao p-4 text-sm text-perigo">
        O pagamento com cartão está indisponível no momento. Você pode pagar com Pix.
      </p>
    );
  }

  return (
    <div>
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onReady={() => setSdkPronto(true)}
        onError={() => {
          setErro("Não foi possível carregar o formulário do cartão. Verifique sua internet.");
          setMontando(false);
        }}
      />

      {montando && !erro && (
        <p className="py-6 text-center text-sm text-texto-suave">Carregando o formulário seguro…</p>
      )}

      <div id="brick-cartao" />

      {erro && <p className="mt-2 text-sm text-perigo">{erro}</p>}

      <p className="mt-3 text-xs text-texto-suave">
        Os dados do cartão vão direto para o Mercado Pago. Esta loja não recebe e não guarda o
        número do seu cartão.
      </p>
    </div>
  );
}

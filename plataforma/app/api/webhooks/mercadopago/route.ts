// POST /api/webhooks/mercadopago — onde o Mercado Pago avisa que um pagamento mudou.
//
// Esta URL é pública: qualquer pessoa na internet pode mandar um POST aqui
// dizendo "o pedido tal foi pago". Quatro regras protegem contra isso:
//
//  1. A assinatura é conferida ANTES de tudo. O Mercado Pago assina cada aviso
//     com um segredo que só nós dois conhecemos. Sem segredo configurado, a
//     rota recusa todos os avisos — é melhor não confirmar pedido nenhum do que
//     confirmar um pedido falso.
//  2. O corpo do aviso NÃO é fonte de verdade. Dele sai só o id do pagamento;
//     o status vem de uma consulta nossa à API do Mercado Pago.
//  3. O valor pago é conferido contra o total do pedido antes de confirmar.
//  4. Quem de fato muda o pedido é a função confirmar_pagamento() no banco, que
//     trava a linha e recusa se o pedido não estiver mais aguardando pagamento.
//     O Mercado Pago manda o mesmo aviso várias vezes de propósito — isso faz o
//     segundo aviso virar um "já estava pago, nada a fazer".
//
// Sobre o código de resposta: devolvemos 200 sempre que o aviso foi entendido,
// mesmo quando não fazemos nada (pagamento ainda pendente, pedido já pago).
// Qualquer status de erro faz o Mercado Pago reenviar o mesmo aviso por horas.
// Só a assinatura inválida devolve 401 — aí queremos mesmo que ele pare.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { consultarPagamento } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

/** Diferença tolerada entre o valor pago e o total do pedido (centavos de arredondamento). */
const TOLERANCIA_VALOR = 0.02;

export async function POST(request: NextRequest) {
  const corpoBruto = await request.text();

  const pagamentoId = extrairPagamentoId(request, corpoBruto);
  if (!pagamentoId) {
    // Avisos de outros assuntos (merchant_order, chargeback) caem aqui.
    // Não são erro: o Mercado Pago manda e nós ignoramos.
    return ok();
  }

  const assinatura = await conferirAssinatura(request, pagamentoId);
  if (!assinatura.valida) {
    console.error("[webhook-mp] assinatura recusada:", assinatura.motivo);
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  // ------------------------------------------- a verdade vem da API, não do POST
  const pagamento = await consultarPagamento(pagamentoId);
  if (!pagamento) {
    // Falha nossa ao consultar (rede, token). Devolvemos 500 de propósito para
    // o Mercado Pago reenviar — é o único caso em que queremos a repetição.
    console.error("[webhook-mp] não foi possível consultar o pagamento", pagamentoId);
    return NextResponse.json({ erro: "consulta falhou" }, { status: 500 });
  }

  if (pagamento.status !== "approved") {
    // pending, in_process, rejected, cancelled: nada a fazer agora. Se virar
    // approved depois, o Mercado Pago manda outro aviso.
    return ok();
  }

  const referencia = pagamento.external_reference;
  if (!referencia) {
    console.error("[webhook-mp] pagamento aprovado sem external_reference:", pagamentoId);
    return ok();
  }

  // ------------------------------------------------------------------ o pedido
  const supabase = createAdminClient();

  const { data: pedido, error: erroBusca } = await supabase
    .from("pedidos")
    .select("id, codigo, total, status")
    .eq("codigo", referencia)
    .maybeSingle();

  if (erroBusca) {
    console.error("[webhook-mp] erro ao buscar pedido:", erroBusca.message);
    return NextResponse.json({ erro: "busca falhou" }, { status: 500 });
  }

  if (!pedido) {
    // Pagamento aprovado para um código que não existe aqui. Não reenviar
    // adianta nada, então 200 — mas isso precisa aparecer no log.
    console.error("[webhook-mp] pagamento aprovado sem pedido correspondente:", referencia);
    return ok();
  }

  // Confere o valor. A cobrança foi criada por nós com o total do pedido, então
  // divergência aqui significa que algo não bate — não confirmamos no escuro.
  const valorPago = Number(pagamento.transaction_amount ?? 0);
  const total = Number(pedido.total);
  if (Math.abs(valorPago - total) > TOLERANCIA_VALOR) {
    console.error(
      "[webhook-mp] valor divergente no pedido",
      pedido.codigo,
      "— pago:",
      valorPago,
      "esperado:",
      total,
    );
    return ok();
  }

  // ----------------------------------------------------------------- confirma
  const { data: confirmou, error: erroConfirma } = await supabase.rpc("confirmar_pagamento", {
    p_pedido_id: pedido.id,
    p_mp_payment_id: String(pagamento.id),
  });

  if (erroConfirma) {
    console.error("[webhook-mp] erro ao confirmar pedido", pedido.codigo, erroConfirma.message);
    return NextResponse.json({ erro: "confirmação falhou" }, { status: 500 });
  }

  // false = o pedido já não estava aguardando pagamento (aviso repetido, ou
  // cancelado antes de pagar). Normal, não é erro.
  console.log(
    confirmou
      ? `[webhook-mp] pedido ${pedido.codigo} confirmado como pago`
      : `[webhook-mp] pedido ${pedido.codigo} já não estava aguardando pagamento (status ${pedido.status})`,
  );

  return ok();
}

function ok() {
  return NextResponse.json({ recebido: true });
}

/**
 * Tira o id do pagamento do aviso.
 *
 * O Mercado Pago tem dois formatos em circulação: o atual manda
 * `{ type: "payment", data: { id } }` no corpo, e o antigo manda
 * `?topic=payment&id=...` na URL. Aceitamos os dois.
 */
function extrairPagamentoId(request: NextRequest, corpoBruto: string): string | null {
  const params = request.nextUrl.searchParams;

  // O parâmetro data.id da URL é o que entra na assinatura, então ele tem
  // prioridade: assinar um valor e usar outro deixaria a conferência sem efeito.
  const daUrl = params.get("data.id") ?? params.get("id");
  const assunto = params.get("type") ?? params.get("topic");

  let doCorpo: string | null = null;
  let assuntoCorpo: string | null = null;
  try {
    const corpo = JSON.parse(corpoBruto) as {
      type?: string;
      topic?: string;
      data?: { id?: string | number };
    };
    assuntoCorpo = corpo.type ?? corpo.topic ?? null;
    if (corpo.data?.id != null) doCorpo = String(corpo.data.id);
  } catch {
    // corpo vazio ou não-JSON: seguimos só com a URL
  }

  const ehPagamento = [assunto, assuntoCorpo].some((a) => a === "payment" || a === "payment.updated");
  if (!ehPagamento) return null;

  const id = daUrl ?? doCorpo;
  return id && /^[0-9a-zA-Z-]{1,64}$/.test(id) ? id : null;
}

/**
 * Confere a assinatura do aviso.
 *
 * O Mercado Pago manda o cabeçalho `x-signature` com um horário (`ts`) e um
 * hash (`v1`). Remontamos a mesma frase que ele assinou, calculamos o hash com
 * o nosso segredo e comparamos. Se bater, o aviso veio mesmo dele.
 */
async function conferirAssinatura(
  request: NextRequest,
  pagamentoId: string,
): Promise<{ valida: boolean; motivo?: string }> {
  const segredo = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!segredo) {
    return { valida: false, motivo: "MERCADOPAGO_WEBHOOK_SECRET não configurado" };
  }

  const cabecalho = request.headers.get("x-signature");
  if (!cabecalho) return { valida: false, motivo: "sem cabeçalho x-signature" };

  const partes = new Map<string, string>();
  for (const pedaco of cabecalho.split(",")) {
    const [chave, ...resto] = pedaco.split("=");
    if (chave && resto.length) partes.set(chave.trim(), resto.join("=").trim());
  }

  const ts = partes.get("ts");
  const recebido = partes.get("v1");
  if (!ts || !recebido) return { valida: false, motivo: "x-signature incompleto" };

  const requestId = request.headers.get("x-request-id") ?? "";

  // A frase assinada segue um molde fixo do Mercado Pago. Ids alfanuméricos
  // entram em minúsculas.
  const idNormalizado = /^\d+$/.test(pagamentoId) ? pagamentoId : pagamentoId.toLowerCase();
  const frase =
    `id:${idNormalizado};` + (requestId ? `request-id:${requestId};` : "") + `ts:${ts};`;

  const esperado = await hmacSha256Hex(segredo, frase);

  return comparacaoSegura(esperado, recebido.toLowerCase())
    ? { valida: true }
    : { valida: false, motivo: "hash não confere" };
}

/**
 * HMAC-SHA256 pelo Web Crypto — o site roda em Cloudflare Workers, onde o
 * `crypto` do Node não existe.
 */
async function hmacSha256Hex(segredo: string, mensagem: string): Promise<string> {
  const codificador = new TextEncoder();
  const chave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, codificador.encode(mensagem));
  return [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compara dois hashes em tempo constante.
 *
 * Com `===` o JavaScript para na primeira letra diferente, e o tempo da
 * resposta entrega quantas letras já estavam certas — dá para descobrir o hash
 * tentativa por tentativa. Aqui todas as letras são sempre percorridas.
 */
function comparacaoSegura(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

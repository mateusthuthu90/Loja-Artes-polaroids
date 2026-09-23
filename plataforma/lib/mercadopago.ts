// Cobranças no Mercado Pago: Pix e cartão de crédito.
//
// Falamos com a API REST por `fetch`, sem o SDK oficial: o site roda em
// Cloudflare Workers e o SDK é feito para Node (usa http/https nativos).
// São duas chamadas simples — não vale a dependência nem o risco.
//
// O CPF do cliente passa por aqui e NÃO é gravado no nosso banco: o Mercado
// Pago exige o dado do pagador, nós não precisamos guardá-lo (LGPD).
import "server-only";

const API = "https://api.mercadopago.com/v1/payments";

/** Minutos até o Pix expirar. Combina com `configuracoes.pedido_expiracao_horas`. */
const MINUTOS_PARA_PAGAR = 30;

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalhe?: unknown,
  ) {
    super(message);
    this.name = "MercadoPagoError";
  }
}

export interface PagadorPix {
  nome: string;
  sobrenome: string;
  email: string;
  cpf: string; // só dígitos
}

export interface CobrancaPix {
  /** id do pagamento no Mercado Pago */
  pagamentoId: string;
  /** string do "copia e cola" */
  copiaCola: string;
  /** PNG do QR Code em base64 (sem o prefixo data:) */
  qrcodeBase64: string;
  expiraEm: string;
}

export function mercadoPagoConfigurado(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

/**
 * Cria a cobrança Pix de um pedido já gravado.
 *
 * `idempotencia` deve ser estável para o mesmo pedido (usamos o id): se o
 * cliente clicar duas vezes ou a rede repetir a chamada, o Mercado Pago
 * devolve a MESMA cobrança em vez de criar uma segunda.
 */
export async function criarCobrancaPix(opcoes: {
  idempotencia: string;
  valor: number;
  descricao: string;
  referencia: string;
  pagador: PagadorPix;
  notificacaoUrl?: string;
}): Promise<CobrancaPix> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new MercadoPagoError("MERCADOPAGO_ACCESS_TOKEN não configurado", 500);

  const expiraEm = new Date(Date.now() + MINUTOS_PARA_PAGAR * 60_000);

  const corpo = {
    transaction_amount: Number(opcoes.valor.toFixed(2)),
    description: opcoes.descricao,
    payment_method_id: "pix",
    external_reference: opcoes.referencia,
    date_of_expiration: comFusoBrasilia(expiraEm),
    ...(opcoes.notificacaoUrl ? { notification_url: opcoes.notificacaoUrl } : {}),
    payer: {
      email: opcoes.pagador.email,
      first_name: opcoes.pagador.nome,
      last_name: opcoes.pagador.sobrenome,
      identification: { type: "CPF", number: opcoes.pagador.cpf },
    },
  };

  let resposta: Response;
  try {
    resposta = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": opcoes.idempotencia,
      },
      body: JSON.stringify(corpo),
    });
  } catch (e) {
    throw new MercadoPagoError("Não foi possível falar com o Mercado Pago", 502, e);
  }

  const dados = (await resposta.json().catch(() => null)) as MPPagamento | null;

  if (!resposta.ok || !dados) {
    // A mensagem do MP costuma explicar o motivo real (CPF inválido, conta sem
    // chave Pix, valor abaixo do mínimo). Registramos para aparecer no log do
    // Worker, mas o cliente recebe um texto simples.
    console.error("[mercadopago] recusou a cobrança:", resposta.status, JSON.stringify(dados));
    throw new MercadoPagoError(
      typeof dados?.message === "string" ? dados.message : "Mercado Pago recusou a cobrança",
      resposta.status,
      dados,
    );
  }

  const transacao = dados.point_of_interaction?.transaction_data;
  if (!transacao?.qr_code || !transacao.qr_code_base64) {
    console.error("[mercadopago] resposta sem QR Code:", JSON.stringify(dados));
    throw new MercadoPagoError("Mercado Pago não devolveu o QR Code do Pix", 502, dados);
  }

  return {
    pagamentoId: String(dados.id),
    copiaCola: transacao.qr_code,
    qrcodeBase64: transacao.qr_code_base64,
    expiraEm: expiraEm.toISOString(),
  };
}

/** Consulta um pagamento — usada pela tela do Pix e pelo webhook (Prompt 7). */
export async function consultarPagamento(pagamentoId: string): Promise<MPPagamento | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const resposta = await fetch(`${API}/${encodeURIComponent(pagamentoId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!resposta.ok) {
      console.error("[mercadopago] falha ao consultar pagamento:", resposta.status);
      return null;
    }
    return (await resposta.json()) as MPPagamento;
  } catch (e) {
    console.error("[mercadopago] erro ao consultar pagamento:", e);
    return null;
  }
}

/**
 * O Mercado Pago exige a data com fuso explícito (ISO 8601 com offset).
 * `toISOString()` devolve "Z", que a API recusa — então montamos com -03:00.
 */
function comFusoBrasilia(data: Date): string {
  const emBrasilia = new Date(data.getTime() - 3 * 60 * 60_000);
  return `${emBrasilia.toISOString().replace(/\.\d{3}Z$/, "")}.000-03:00`;
}

export interface MPPagamento {
  id: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  /** Valor efetivamente pago. O webhook confere contra o total do pedido. */
  transaction_amount?: number;
  message?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

// -----------------------------------------------------------------------------
// Cartão de crédito
// -----------------------------------------------------------------------------
// O número do cartão NUNCA passa por aqui. O navegador do cliente manda os dados
// direto para o Mercado Pago (SDK oficial, com a Public Key) e recebe de volta um
// `token` de uso único. É esse token que chega ao nosso servidor. Do cartão, só
// sabemos os últimos quatro dígitos e a bandeira — e nem isso guardamos.
//
// Sobre juros: `installments` é o número de parcelas. Como os juros são do
// cliente, mandamos o valor à vista e o Mercado Pago acrescenta o juro na fatura
// dele. Por isso `pedidos.total` continua sendo sempre o preço à vista.

export interface PagadorCartao {
  email: string;
  cpf: string; // só dígitos
}

export interface ResultadoCartao {
  pagamentoId: string;
  /** approved | in_process | rejected | cancelled */
  status: string;
  statusDetalhe: string;
  aprovado: boolean;
  /** true quando o Mercado Pago ainda está analisando (análise antifraude) */
  emAnalise: boolean;
  parcelas: number;
}

/**
 * Cobra no cartão um pedido já gravado.
 *
 * Diferente do Pix, aqui a resposta já diz se passou ou não. Recusa NÃO é erro
 * de programa: é resposta normal do banco do cliente, e volta em `status` para
 * quem chamou decidir o que fazer.
 */
export async function criarPagamentoCartao(opcoes: {
  idempotencia: string;
  valor: number;
  descricao: string;
  referencia: string;
  token: string;
  parcelas: number;
  metodoId?: string;
  emissorId?: string;
  pagador: PagadorCartao;
  notificacaoUrl?: string;
}): Promise<ResultadoCartao> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new MercadoPagoError("MERCADOPAGO_ACCESS_TOKEN não configurado", 500);

  const corpo = {
    transaction_amount: Number(opcoes.valor.toFixed(2)),
    token: opcoes.token,
    installments: opcoes.parcelas,
    description: opcoes.descricao,
    external_reference: opcoes.referencia,
    ...(opcoes.metodoId ? { payment_method_id: opcoes.metodoId } : {}),
    ...(opcoes.emissorId ? { issuer_id: opcoes.emissorId } : {}),
    ...(opcoes.notificacaoUrl ? { notification_url: opcoes.notificacaoUrl } : {}),
    payer: {
      email: opcoes.pagador.email,
      identification: { type: "CPF", number: opcoes.pagador.cpf },
    },
  };

  let resposta: Response;
  try {
    resposta = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // Mesmo pedido = mesma cobrança. Protege contra clique duplo e contra a
        // rede reenviando: sem isso o cliente pode ser cobrado duas vezes.
        "X-Idempotency-Key": opcoes.idempotencia,
      },
      body: JSON.stringify(corpo),
    });
  } catch (e) {
    throw new MercadoPagoError("Não foi possível falar com o Mercado Pago", 502, e);
  }

  const dados = (await resposta.json().catch(() => null)) as MPPagamento | null;

  if (!resposta.ok || !dados) {
    // Aqui é erro de verdade: token vencido, valor inválido, conta sem permissão.
    // Recusa do banco não cai neste caminho — ela volta com HTTP 201.
    console.error("[mercadopago] cartão recusado na origem:", resposta.status, JSON.stringify(dados));
    throw new MercadoPagoError(
      typeof dados?.message === "string" ? dados.message : "Mercado Pago recusou a cobrança",
      resposta.status,
      dados,
    );
  }

  const status = dados.status ?? "unknown";

  return {
    pagamentoId: String(dados.id),
    status,
    statusDetalhe: dados.status_detail ?? "",
    aprovado: status === "approved",
    emAnalise: status === "in_process" || status === "pending",
    parcelas: opcoes.parcelas,
  };
}

/**
 * Traduz a recusa do Mercado Pago para uma frase que ajuda o cliente a resolver.
 *
 * O texto importa: "cartão recusado" faz a pessoa desistir, "confira o código de
 * segurança" faz ela tentar de novo e comprar.
 */
export function mensagemRecusa(statusDetalhe: string): string {
  const mapa: Record<string, string> = {
    cc_rejected_bad_filled_card_number: "Confira o número do cartão.",
    cc_rejected_bad_filled_date: "Confira a data de validade do cartão.",
    cc_rejected_bad_filled_security_code: "Confira o código de segurança (CVV).",
    cc_rejected_bad_filled_other: "Confira os dados do cartão e tente de novo.",
    cc_rejected_insufficient_amount: "O cartão não tem limite disponível para esta compra.",
    cc_rejected_call_for_authorize: "Seu banco precisa autorizar esta compra. Ligue para ele e tente de novo.",
    cc_rejected_card_disabled: "Este cartão está desabilitado. Ligue para o seu banco ou use outro cartão.",
    cc_rejected_card_error: "Não foi possível usar este cartão. Tente outro.",
    cc_rejected_duplicated_payment: "Esta compra já foi feita. Confira seu extrato antes de tentar de novo.",
    cc_rejected_high_risk: "O pagamento não foi aprovado. Tente outro cartão ou pague com Pix.",
    cc_rejected_max_attempts: "Muitas tentativas com este cartão. Use outro cartão ou pague com Pix.",
    cc_rejected_invalid_installments: "Este cartão não aceita esse número de parcelas.",
  };

  return mapa[statusDetalhe] ?? "O pagamento não foi aprovado. Tente outro cartão ou pague com Pix.";
}

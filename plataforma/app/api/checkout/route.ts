// POST /api/checkout — cria o pedido e devolve a cobrança Pix.
//
// Princípio da rota: NADA que vem do navegador define valor. O cliente manda o
// que quer comprar (produto, opções, quantidade); o servidor recarrega o
// catálogo do banco e recalcula preço, promoção, cupom e frete com as mesmas
// funções de lib/preco.ts que a tela usou. Se o cliente adulterar o preço no
// navegador, o pedido sai com o valor certo do banco.
//
// Ordem das operações (importa):
//  1. valida tudo        → erro aqui não deixa rastro
//  2. grava o pedido     → já com status aguardando_pagamento
//  3. move as fotos      → agora existem pedido_itens para amarrá-las
//  4. cria o Pix no MP   → se falhar, o pedido é cancelado e nada fica órfão
//  5. consome o cupom    → só depois que a cobrança existe
//
// O contrário (Pix antes do pedido) deixaria uma cobrança paga sem pedido
// nenhum no banco — o pior resultado possível.
import { NextResponse } from "next/server";
import { lerConfig } from "@/lib/catalogo";
import { buscarCupomValido } from "@/lib/cupom";
import {
  MercadoPagoError,
  criarCobrancaPix,
  criarPagamentoCartao,
  mensagemRecusa,
  mercadoPagoConfigurado,
} from "@/lib/mercadopago";
import {
  arredondar,
  calcularFrete,
  esgotado,
  fotosPorUnidade,
  melhorPromocao,
  precoUnitario,
  validarOpcoes,
  OpcaoInvalidaError,
} from "@/lib/preco";
import { ipDaRequisicao, permitir } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Produto, Promocao } from "@/lib/types";
import {
  REGEX_CAMINHO_FOTO,
  semErros,
  somenteDigitos,
  validarDados,
  validarEndereco,
  type DadosCliente,
  type Endereco,
} from "@/lib/validacao";

const MAX_PEDIDOS_POR_HORA_POR_IP = 10;
const MAX_ITENS = 30;
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const BUCKET = "fotos-clientes";
/** Teto de parcelas. Acima disso o juro fica alto demais e a recusa dispara. */
const MAX_PARCELAS = 12;
/** Token de cartao do Mercado Pago: hexadecimal, gerado no navegador. */
const REGEX_TOKEN_CARTAO = /^[0-9a-zA-Z]{16,64}$/;

interface ItemRecebido {
  produtoId: string;
  opcoes: Record<string, string>;
  quantidade: number;
  fotos: { caminho: string; nome?: string }[];
}

export async function POST(request: Request) {
  // ---------------------------------------------------------------- entrada
  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return erro("Requisição inválida", 400);
  }

  if (!permitir(`checkout:${ipDaRequisicao(request)}`, MAX_PEDIDOS_POR_HORA_POR_IP, 60 * 60 * 1000)) {
    return erro("Muitos pedidos em pouco tempo. Aguarde alguns minutos.", 429);
  }

  const sessao = typeof corpo.sessao === "string" ? corpo.sessao : "";
  if (!REGEX_UUID.test(sessao)) return erro("Sessão inválida. Recarregue a página.", 400);

  const brutos = corpo.dados as Partial<Record<keyof DadosCliente, unknown>> | undefined;
  if (!brutos || typeof brutos !== "object") return erro("Dados do cliente ausentes", 400);
  // Tudo vira string ANTES de validar, e só a versão normalizada é usada daqui
  // para baixo: um JSON com número em `cpf` não pode derrubar a rota.
  const dados: DadosCliente = {
    nome: String(brutos.nome ?? "").trim().slice(0, 120),
    whatsapp: somenteDigitos(String(brutos.whatsapp ?? "")),
    email: String(brutos.email ?? "").trim().slice(0, 200),
    cpf: somenteDigitos(String(brutos.cpf ?? "")),
  };
  const errosDados = validarDados(dados);
  if (!semErros(errosDados)) return erro(Object.values(errosDados)[0] as string, 400);

  const tipoEntrega = corpo.tipoEntrega === "retirada" ? "retirada" : "envio";
  const endereco = normalizarEndereco(corpo.endereco);
  if (tipoEntrega === "envio") {
    const errosEndereco = validarEndereco(endereco);
    if (!semErros(errosEndereco)) return erro(Object.values(errosEndereco)[0] as string, 400);
  }

  const observacoes = String(corpo.observacoes ?? "").trim().slice(0, 1000);

  // -------------------------------------------------------- forma de pagamento
  // No cartão, o navegador já falou com o Mercado Pago e recebeu um token de uso
  // único. É só ele que chega aqui — número do cartão e CVV nunca passam pelo
  // nosso servidor, nem pelos nossos logs.
  const pagamentoBruto = (corpo.pagamento ?? {}) as Record<string, unknown>;
  const formaPagamento = pagamentoBruto.forma === "cartao" ? "cartao" : "pix";
  const cartaoToken = String(pagamentoBruto.token ?? "").trim();
  const parcelas = Math.trunc(Number(pagamentoBruto.parcelas ?? 1));
  const cartaoMetodoId = String(pagamentoBruto.metodoId ?? "").trim() || undefined;
  const cartaoEmissorId = String(pagamentoBruto.emissorId ?? "").trim() || undefined;

  if (formaPagamento === "cartao") {
    if (!REGEX_TOKEN_CARTAO.test(cartaoToken)) {
      return erro("Dados do cartão inválidos. Preencha o cartão de novo.", 400);
    }
    if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > MAX_PARCELAS) {
      return erro("Número de parcelas inválido", 400);
    }
    // O CPF já foi validado acima em validarDados: o Mercado Pago exige o do
    // pagador tanto no Pix quanto no cartão.
  }

  if (!Array.isArray(corpo.itens) || corpo.itens.length === 0) {
    return erro("Seu carrinho está vazio", 400);
  }
  if (corpo.itens.length > MAX_ITENS) return erro("Pedido com itens demais", 400);
  const itensRecebidos = corpo.itens as ItemRecebido[];

  // -------------------------------------------------------------- catálogo
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    console.error("[checkout] supabase admin indisponível:", e);
    return erro("Não foi possível finalizar agora. Tente novamente em instantes.", 503);
  }

  const config = await lerConfig();
  if (!config.loja.aberta) return erro(config.loja.mensagem_fechada || "A loja está fechada", 409);
  if (tipoEntrega === "retirada" && !config.retirada.ativa) {
    return erro("A retirada presencial não está disponível no momento", 409);
  }
  if (!mercadoPagoConfigurado()) {
    console.error("[checkout] MERCADOPAGO_ACCESS_TOKEN ausente");
    return erro("O pagamento está indisponível no momento. Fale com a gente pelo WhatsApp.", 503);
  }

  // Lemos o catálogo FRESCO (sem o cache de 60s do site): o preço que vira
  // pedido tem de ser o que está no banco agora.
  const ids = [...new Set(itensRecebidos.map((i) => String(i.produtoId)))];
  const [{ data: produtosBrutos, error: erroProdutos }, { data: promocoesBrutas }] = await Promise.all([
    supabase.from("produtos").select("*").in("id", ids).eq("status", "publicado"),
    supabase.from("promocoes").select("*"),
  ]);
  if (erroProdutos) {
    console.error("[checkout] erro ao ler produtos:", erroProdutos.message);
    return erro("Não foi possível confirmar os preços. Tente novamente.", 503);
  }

  const promocoes = ((promocoesBrutas ?? []) as Promocao[]).map((p) => ({
    ...p,
    valor: Number(p.valor),
    alvos: p.alvos ?? [],
  }));
  const catalogo = new Map<string, Produto>(
    ((produtosBrutos ?? []) as Produto[])
      .map((p) => ({ ...p, preco: Number(p.preco) }))
      .map((p) => [p.id, { ...p, promocao: melhorPromocao(p, promocoes) }]),
  );

  // ------------------------------------------------------- recálculo real
  const itens: {
    produto: Produto;
    opcoes: Record<string, string>;
    quantidade: number;
    unitario: number;
    fotosExigidas: number;
    fotos: { caminho: string; nome?: string }[];
  }[] = [];

  for (const recebido of itensRecebidos) {
    const produto = catalogo.get(String(recebido.produtoId));
    if (!produto) return erro("Um dos produtos saiu do ar. Revise seu carrinho.", 409);
    if (esgotado(produto)) return erro(`"${produto.nome}" está esgotado`, 409);

    const quantidade = Number(recebido.quantidade);
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 999) {
      return erro("Quantidade inválida", 400);
    }

    const opcoes = (recebido.opcoes ?? {}) as Record<string, string>;
    try {
      validarOpcoes(produto, opcoes);
    } catch (e) {
      if (e instanceof OpcaoInvalidaError) return erro(e.message, 409);
      throw e;
    }

    const { min, max } = fotosPorUnidade(produto, opcoes);
    const fotos = Array.isArray(recebido.fotos) ? recebido.fotos : [];
    for (const f of fotos) {
      const caminho = String(f?.caminho ?? "");
      // a foto tem de pertencer a ESTA sessão: ninguém anexa arquivo de terceiro
      if (!REGEX_CAMINHO_FOTO.test(caminho) || !caminho.startsWith(`pendentes/${sessao}/`)) {
        return erro("Uma das fotos enviadas é inválida. Reenvie as fotos.", 400);
      }
    }
    if (fotos.length < min * quantidade || fotos.length > max * quantidade) {
      return erro(`Envie as fotos de "${produto.nome}" antes de finalizar`, 400);
    }

    itens.push({
      produto,
      opcoes,
      quantidade,
      unitario: precoUnitario(produto, opcoes),
      fotosExigidas: max * quantidade,
      fotos,
    });
  }

  const subtotal = arredondar(itens.reduce((s, i) => s + i.unitario * i.quantidade, 0));
  if (subtotal <= 0) return erro("Seu carrinho está vazio", 400);

  // Cupom revalidado no servidor com a mesma regra do carrinho.
  let cupomId: string | null = null;
  let desconto = 0;
  let freteGratis = false;
  const codigoCupom = typeof corpo.cupom === "string" ? corpo.cupom : "";
  if (codigoCupom) {
    const r = await buscarCupomValido(supabase, codigoCupom, subtotal);
    if (!r.ok) return erro(r.erro, 409);
    cupomId = r.cupom.id;
    desconto = r.aplicado.desconto;
    freteGratis = r.aplicado.freteGratis;
  }

  const frete = freteGratis ? 0 : calcularFrete(subtotal, tipoEntrega, config.frete);
  const total = arredondar(subtotal - desconto + frete);
  if (total <= 0) return erro("Valor do pedido inválido", 400);

  // ------------------------------------------------------- grava o pedido
  const { data: codigoGerado, error: erroCodigo } = await supabase.rpc("gerar_codigo_pedido");
  if (erroCodigo || !codigoGerado) {
    console.error("[checkout] erro ao gerar código:", erroCodigo?.message);
    return erro("Não foi possível abrir seu pedido. Tente novamente.", 503);
  }
  const codigo = String(codigoGerado);

  const { data: pedido, error: erroPedido } = await supabase
    .from("pedidos")
    .insert({
      codigo,
      cliente_nome: dados.nome,
      cliente_whatsapp: dados.whatsapp,
      cliente_email: dados.email,
      tipo_entrega: tipoEntrega,
      endereco: tipoEntrega === "envio" ? enderecoLimpo(endereco) : null,
      frete_valor: frete,
      subtotal,
      desconto,
      total,
      observacoes_cliente: observacoes || null,
      forma_pagamento: formaPagamento,
      parcelas: formaPagamento === "cartao" ? parcelas : null,
    })
    .select("id")
    .single();

  if (erroPedido || !pedido) {
    console.error("[checkout] erro ao gravar pedido:", erroPedido?.message);
    return erro("Não foi possível abrir seu pedido. Tente novamente.", 503);
  }

  const { data: itensGravados, error: erroItens } = await supabase
    .from("pedido_itens")
    .insert(
      itens.map((i) => ({
        pedido_id: pedido.id,
        produto_id: i.produto.id,
        nome_produto: i.produto.nome, // snapshot (regra 3.4)
        opcoes_escolhidas: i.opcoes,
        quantidade: i.quantidade,
        preco_unitario: i.unitario,
        fotos_exigidas: i.fotosExigidas,
      })),
    )
    .select("id");

  if (erroItens || !itensGravados || itensGravados.length !== itens.length) {
    console.error("[checkout] erro ao gravar itens:", erroItens?.message);
    await desfazer(supabase, pedido.id, "falha ao gravar os itens");
    return erro("Não foi possível abrir seu pedido. Tente novamente.", 503);
  }

  // -------------------------------------------------------- move as fotos
  // Sai de pendentes/<sessão>/ para pedidos/<código>/: a rotina de limpeza
  // apaga o que ficou em pendentes sem nunca virar pedido.
  for (const [indice, item] of itens.entries()) {
    const pedidoItemId = itensGravados[indice].id;
    for (const foto of item.fotos) {
      const destino = `pedidos/${codigo}/${foto.caminho.split("/").pop()}`;
      const { error: erroMover } = await supabase.storage.from(BUCKET).move(foto.caminho, destino);
      if (erroMover) {
        // A foto pode já ter sido movida numa tentativa anterior: seguimos e
        // deixamos o registro apontando para o destino final.
        console.error("[checkout] falha ao mover foto:", foto.caminho, erroMover.message);
      }
      const { error: erroFoto } = await supabase.from("pedido_fotos").insert({
        pedido_item_id: pedidoItemId,
        storage_path: destino,
        nome_original: foto.nome?.slice(0, 200) ?? null,
      });
      if (erroFoto) console.error("[checkout] falha ao registrar foto:", erroFoto.message);
    }
  }

  // ------------------------------------------------------------- cobra
  // Dois caminhos. No Pix, a cobrança nasce pendente e quem confirma é o
  // webhook. No cartão, a resposta já diz se passou — e quando passa, confirmamos
  // aqui mesmo para o cliente não ficar olhando uma tela de "aguardando".
  const [primeiroNome, ...resto] = dados.nome.split(/\s+/);
  let retorno: { forma: "pix" | "cartao"; status: string };

  if (formaPagamento === "cartao") {
    let resultado;
    try {
      resultado = await criarPagamentoCartao({
        idempotencia: pedido.id, // mesmo pedido = mesma cobrança, nunca duas
        valor: total,
        descricao: `Artes Polaroids · pedido ${codigo}`,
        referencia: codigo,
        token: cartaoToken,
        parcelas,
        metodoId: cartaoMetodoId,
        emissorId: cartaoEmissorId,
        pagador: { email: dados.email, cpf: dados.cpf },
        notificacaoUrl: urlWebhook(),
      });
    } catch (e) {
      const detalhe = e instanceof MercadoPagoError ? e.message : String(e);
      console.error("[checkout] cartão não processado:", detalhe);
      await desfazer(supabase, pedido.id, `cartão não processado: ${detalhe}`);
      return erro("Não foi possível processar o cartão agora. Tente novamente em instantes.", 502);
    }

    // Recusa do banco não é erro nosso, mas o pedido não pode ficar de pé
    // esperando um dinheiro que não vem: desfazemos e explicamos o motivo.
    if (!resultado.aprovado && !resultado.emAnalise) {
      await desfazer(supabase, pedido.id, `cartão recusado: ${resultado.statusDetalhe}`);
      return NextResponse.json(
        { erro: mensagemRecusa(resultado.statusDetalhe), recusado: true },
        { status: 402 },
      );
    }

    const { error: erroCartao } = await supabase
      .from("pedidos")
      .update({ mp_payment_id: resultado.pagamentoId })
      .eq("id", pedido.id);
    if (erroCartao) {
      // A cobrança existe no Mercado Pago; só o nosso registro do id falhou. O
      // webhook ainda acha o pedido pelo external_reference.
      console.error("[checkout] erro ao salvar id do cartão:", erroCartao.message);
    }

    if (resultado.aprovado) {
      const { error: erroConfirma } = await supabase.rpc("confirmar_pagamento", {
        p_pedido_id: pedido.id,
        p_mp_payment_id: resultado.pagamentoId,
      });
      if (erroConfirma) {
        // O dinheiro entrou e nós não conseguimos registrar. Não é para o
        // cliente resolver: o webhook chega em seguida e tenta de novo.
        console.error("[checkout] cartão aprovado mas não confirmado:", erroConfirma.message);
      }
    }

    retorno = { forma: "cartao", status: resultado.aprovado ? "pago" : "em_analise" };
  } else {
    let cobranca;
    try {
      cobranca = await criarCobrancaPix({
        idempotencia: pedido.id, // mesmo pedido = mesma cobrança, nunca duas
        valor: total,
        descricao: `Artes Polaroids · pedido ${codigo}`,
        referencia: codigo,
        pagador: {
          nome: primeiroNome,
          sobrenome: resto.join(" ") || primeiroNome,
          email: dados.email,
          cpf: dados.cpf,
        },
        notificacaoUrl: urlWebhook(),
      });
    } catch (e) {
      const detalhe = e instanceof MercadoPagoError ? e.message : String(e);
      console.error("[checkout] Pix não criado:", detalhe);
      await desfazer(supabase, pedido.id, `Pix não criado: ${detalhe}`);
      return erro("Não foi possível gerar o Pix agora. Tente novamente em instantes.", 502);
    }

    const { error: erroPix } = await supabase
      .from("pedidos")
      .update({
        mp_payment_id: cobranca.pagamentoId,
        pix_qrcode: cobranca.qrcodeBase64,
        pix_copia_cola: cobranca.copiaCola,
        pix_expira_em: cobranca.expiraEm,
      })
      .eq("id", pedido.id);

    if (erroPix) {
      // A cobrança existe no Mercado Pago mas não conseguimos guardar o QR.
      // Não cancelamos: o webhook ainda confirma pelo external_reference.
      console.error("[checkout] erro ao salvar dados do Pix:", erroPix.message);
      return erro("Seu pedido foi aberto, mas o QR Code falhou. Fale com a gente pelo WhatsApp.", 500);
    }

    retorno = { forma: "pix", status: "aguardando_pagamento" };
  }

  if (cupomId) {
    const { error: erroCupom } = await supabase.rpc("consumir_cupom", { p_cupom_id: cupomId });
    if (erroCupom) console.error("[checkout] falha ao consumir cupom:", erroCupom.message);
  }

  return NextResponse.json({ codigo, ...retorno });
}

/** Cancela um pedido recém-criado que não chegou a virar cobrança. */
async function desfazer(
  supabase: ReturnType<typeof createAdminClient>,
  pedidoId: string,
  motivo: string,
) {
  const { error } = await supabase.rpc("cancelar_pedido", {
    p_pedido_id: pedidoId,
    p_autor: "sistema",
    p_motivo: motivo,
  });
  if (error) console.error("[checkout] falha ao cancelar pedido órfão:", error.message);
}

/** Todo campo vira string aparada antes de qualquer validação. */
function normalizarEndereco(bruto: unknown): Endereco {
  const e = (bruto ?? {}) as Partial<Record<keyof Endereco, unknown>>;
  const texto = (v: unknown) => String(v ?? "").trim().slice(0, 120);
  return {
    cep: somenteDigitos(String(e.cep ?? "")),
    rua: texto(e.rua),
    numero: texto(e.numero),
    complemento: texto(e.complemento),
    bairro: texto(e.bairro),
    cidade: texto(e.cidade),
    uf: texto(e.uf).toUpperCase(),
  };
}

function enderecoLimpo(e: Endereco) {
  return {
    cep: e.cep,
    rua: e.rua,
    numero: e.numero,
    complemento: e.complemento || null,
    bairro: e.bairro,
    cidade: e.cidade,
    uf: e.uf,
  };
}

/** O Mercado Pago avisa aqui quando o Pix é pago (rota do Prompt 7). */
function urlWebhook(): string | undefined {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base || base.startsWith("http://localhost")) return undefined; // o MP não alcança localhost
  return `${base.replace(/\/$/, "")}/api/webhooks/mercadopago`;
}

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

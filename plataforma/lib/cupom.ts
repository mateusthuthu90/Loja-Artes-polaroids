// Regra única de validação de cupom.
//
// Usada em dois lugares que precisam concordar:
//  • app/(loja)/acoes.ts — o campo de cupom do carrinho (informativo)
//  • app/api/checkout/route.ts — o desconto que de fato vira dinheiro
//
// Se as duas divergissem, o cliente veria um valor e pagaria outro.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularCupom } from "./preco";
import type { Cupom, CupomAplicado } from "./types";

export type ResultadoCupom =
  | { ok: true; cupom: Cupom; aplicado: CupomAplicado }
  | { ok: false; erro: string };

export const CODIGO_CUPOM_VALIDO = /^[A-Z0-9]{3,20}$/;

export function normalizarCodigo(codigo: unknown): string {
  return String(codigo ?? "").trim().toUpperCase();
}

/**
 * Busca o cupom e confere período, limite de usos e mínimo do pedido.
 * Devolve também o registro completo, porque o checkout precisa do `id`
 * para chamar `consumir_cupom` depois de gravar o pedido.
 */
export async function buscarCupomValido(
  supabase: SupabaseClient,
  codigo: string,
  subtotal: number,
): Promise<ResultadoCupom> {
  const limpo = normalizarCodigo(codigo);
  if (!CODIGO_CUPOM_VALIDO.test(limpo)) return { ok: false, erro: "Código inválido" };

  const { data, error } = await supabase.from("cupons").select("*").eq("codigo", limpo).maybeSingle();
  if (error) {
    console.error("[cupom] erro ao buscar:", error.message);
    return { ok: false, erro: "Não foi possível validar o cupom agora." };
  }
  if (!data) return { ok: false, erro: "Cupom não encontrado" };

  const cupom: Cupom = {
    ...(data as Cupom),
    valor: Number(data.valor),
    minimo_pedido: Number(data.minimo_pedido),
  };

  const agora = Date.now();
  if (!cupom.ativo) return { ok: false, erro: "Este cupom não está mais valendo" };
  if (cupom.inicio && new Date(cupom.inicio).getTime() > agora) {
    return { ok: false, erro: "Este cupom ainda não começou" };
  }
  if (cupom.fim && new Date(cupom.fim).getTime() < agora) {
    return { ok: false, erro: "Este cupom expirou" };
  }
  if (cupom.limite_usos !== null && cupom.usos >= cupom.limite_usos) {
    return { ok: false, erro: "Este cupom esgotou" };
  }

  const valor = Number(subtotal);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { ok: false, erro: "Adicione produtos ao carrinho primeiro" };
  }
  if (cupom.minimo_pedido > 0 && valor < cupom.minimo_pedido) {
    const minimo = cupom.minimo_pedido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return { ok: false, erro: `Este cupom vale em pedidos a partir de ${minimo}` };
  }

  return { ok: true, cupom, aplicado: calcularCupom(valor, cupom) };
}

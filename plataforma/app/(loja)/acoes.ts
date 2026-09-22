"use server";

// Validação de cupom para a loja.
// O cliente manda só o código; a lista de cupons nunca vai para o navegador.
// O desconto exibido aqui é só informativo: o checkout recalcula tudo no servidor.
import { headers } from "next/headers";
import { calcularCupom } from "@/lib/preco";
import { ipDaRequisicao, permitir } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cupom, CupomAplicado } from "@/lib/types";

export type RespostaCupom = { ok: true; cupom: CupomAplicado } | { ok: false; erro: string };

export async function validarCupom(codigo: string, subtotal: number): Promise<RespostaCupom> {
  const limpo = String(codigo ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(limpo)) return { ok: false, erro: "Código inválido" };

  // freio contra tentativa de adivinhar códigos
  const ip = ipDaRequisicao(new Request("http://x", { headers: await headers() }));
  if (!permitir(`cupom:${ip}`, 25, 10 * 60 * 1000)) {
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos." };
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { ok: false, erro: "Não foi possível validar o cupom agora." };
  }

  const { data, error } = await supabase.from("cupons").select("*").eq("codigo", limpo).maybeSingle();
  if (error) {
    console.error("[cupom] erro ao buscar:", error.message);
    return { ok: false, erro: "Não foi possível validar o cupom agora." };
  }
  if (!data) return { ok: false, erro: "Cupom não encontrado" };

  const cupom = { ...(data as Cupom), valor: Number(data.valor), minimo_pedido: Number(data.minimo_pedido) };
  const agora = Date.now();
  if (!cupom.ativo) return { ok: false, erro: "Este cupom não está mais valendo" };
  if (cupom.inicio && new Date(cupom.inicio).getTime() > agora) return { ok: false, erro: "Este cupom ainda não começou" };
  if (cupom.fim && new Date(cupom.fim).getTime() < agora) return { ok: false, erro: "Este cupom expirou" };
  if (cupom.limite_usos !== null && cupom.usos >= cupom.limite_usos) return { ok: false, erro: "Este cupom esgotou" };

  const valor = Number(subtotal);
  if (!Number.isFinite(valor) || valor <= 0) return { ok: false, erro: "Adicione produtos ao carrinho primeiro" };
  if (cupom.minimo_pedido > 0 && valor < cupom.minimo_pedido) {
    return {
      ok: false,
      erro: `Este cupom vale em pedidos a partir de ${cupom.minimo_pedido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    };
  }

  return { ok: true, cupom: calcularCupom(valor, cupom) };
}

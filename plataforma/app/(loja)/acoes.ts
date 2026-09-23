"use server";

// Validação de cupom para a loja.
// O cliente manda só o código; a lista de cupons nunca vai para o navegador.
// O desconto exibido aqui é só informativo: o checkout recalcula tudo no servidor
// com a MESMA função (lib/cupom.ts), então os dois nunca divergem.
import { headers } from "next/headers";
import { buscarCupomValido } from "@/lib/cupom";
import { ipDaRequisicao, permitir } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CupomAplicado } from "@/lib/types";

export type RespostaCupom = { ok: true; cupom: CupomAplicado } | { ok: false; erro: string };

export async function validarCupom(codigo: string, subtotal: number): Promise<RespostaCupom> {
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

  const r = await buscarCupomValido(supabase, codigo, subtotal);
  return r.ok ? { ok: true, cupom: r.aplicado } : { ok: false, erro: r.erro };
}

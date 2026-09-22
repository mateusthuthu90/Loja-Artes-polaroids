"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { registrarAcao } from "@/lib/admin/log";
import { exigirAdmin } from "@/lib/admin/sessao";
import { TAG_CATALOGO } from "@/lib/catalogo";
import type { EscopoPromocao, TipoCupom, TipoDesconto } from "@/lib/types";

export type Resposta = { ok: true; id?: string } | { ok: false; erro: string };

function atualizarLoja() {
  revalidateTag(TAG_CATALOGO, { expire: 0 });
  revalidatePath("/", "layout");
}

/** "2026-10-05T18:00" (input datetime-local) → ISO no fuso de Brasília; "" → null */
function paraData(valor: string | null | undefined): string | null {
  const v = (valor ?? "").trim();
  if (!v) return null;
  const d = new Date(`${v}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------------------------------------------------------------------------
// Cupons
// ---------------------------------------------------------------------------
export interface FormCupom {
  id: string | null;
  codigo: string;
  descricao: string;
  tipo: TipoCupom;
  valor: string;
  minimo_pedido: string;
  inicio: string;
  fim: string;
  limite_usos: string;
  ativo: boolean;
}

function lerNumero(texto: string): number {
  const t = texto.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
  return t ? Number(t) : NaN;
}

export async function salvarCupom(f: FormCupom): Promise<Resposta> {
  const { supabase, user } = await exigirAdmin();

  const codigo = f.codigo.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(codigo)) return { ok: false, erro: "O código deve ter de 3 a 20 letras ou números, sem espaço nem acento" };

  const valor = f.tipo === "frete_gratis" ? 0 : lerNumero(f.valor);
  if (f.tipo !== "frete_gratis") {
    if (!(valor > 0)) return { ok: false, erro: "Informe o valor do desconto" };
    if (f.tipo === "percentual" && valor > 90) return { ok: false, erro: "O desconto em porcentagem pode ir até 90%" };
  }

  const minimo = f.minimo_pedido.trim() ? lerNumero(f.minimo_pedido) : 0;
  if (Number.isNaN(minimo) || minimo < 0) return { ok: false, erro: "Valor mínimo do pedido inválido" };

  const limite = f.limite_usos.trim() ? Number(f.limite_usos.trim()) : null;
  if (limite !== null && (!Number.isInteger(limite) || limite < 1)) return { ok: false, erro: "Limite de usos inválido" };

  const inicio = paraData(f.inicio);
  const fim = paraData(f.fim);
  if (inicio && fim && new Date(fim) <= new Date(inicio)) return { ok: false, erro: "A data final precisa ser depois da inicial" };

  const dados = {
    codigo,
    descricao: f.descricao.trim().slice(0, 160) || null,
    tipo: f.tipo,
    valor,
    minimo_pedido: minimo,
    inicio,
    fim,
    limite_usos: limite,
    ativo: f.ativo,
  };

  const resultado = f.id
    ? await supabase.from("cupons").update(dados).eq("id", f.id).select("id").single()
    : await supabase.from("cupons").insert(dados).select("id").single();

  if (resultado.error) {
    if (resultado.error.code === "23505") return { ok: false, erro: "Já existe um cupom com esse código" };
    console.error("[cupons]", resultado.error);
    return { ok: false, erro: "Não foi possível salvar o cupom" };
  }

  await registrarAcao(user.id, f.id ? "cupom.editar" : "cupom.criar", "cupom", resultado.data.id, { codigo, tipo: f.tipo, valor });
  atualizarLoja();
  return { ok: true, id: resultado.data.id };
}

export async function alternarCupom(id: string, ativo: boolean): Promise<Resposta> {
  const { supabase, user } = await exigirAdmin();
  const { error } = await supabase.from("cupons").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível alterar" };
  await registrarAcao(user.id, ativo ? "cupom.ativar" : "cupom.desativar", "cupom", id);
  atualizarLoja();
  return { ok: true };
}

export async function excluirCupom(id: string): Promise<Resposta> {
  const { supabase, user } = await exigirAdmin();
  const { count } = await supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("cupom_id", id);
  if ((count ?? 0) > 0) {
    // cupom já usado em pedidos: desativa para não quebrar o histórico
    const { error } = await supabase.from("cupons").update({ ativo: false }).eq("id", id);
    if (error) return { ok: false, erro: "Não foi possível desativar" };
    await registrarAcao(user.id, "cupom.desativar", "cupom", id, { motivo: "tentativa de exclusão com pedidos" });
    atualizarLoja();
    return { ok: false, erro: "Este cupom já foi usado em pedidos, então foi apenas DESATIVADO." };
  }
  const { error } = await supabase.from("cupons").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível excluir" };
  await registrarAcao(user.id, "cupom.excluir", "cupom", id);
  atualizarLoja();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Promoções
// ---------------------------------------------------------------------------
export interface FormPromocao {
  id: string | null;
  nome: string;
  selo: string;
  tipo: TipoDesconto;
  valor: string;
  escopo: EscopoPromocao;
  alvos: string[];
  inicio: string;
  fim: string;
  ativa: boolean;
}

export async function salvarPromocao(f: FormPromocao): Promise<Resposta> {
  const { supabase, user } = await exigirAdmin();

  const nome = f.nome.trim();
  if (!nome || nome.length > 80) return { ok: false, erro: "Informe um nome para a promoção" };

  const valor = lerNumero(f.valor);
  if (!(valor > 0)) return { ok: false, erro: "Informe o valor do desconto" };
  if (f.tipo === "percentual" && valor > 90) return { ok: false, erro: "O desconto em porcentagem pode ir até 90%" };
  if (f.escopo !== "loja" && f.alvos.length === 0) {
    return { ok: false, erro: f.escopo === "categoria" ? "Escolha ao menos uma categoria" : "Escolha ao menos um produto" };
  }

  const inicio = paraData(f.inicio);
  const fim = paraData(f.fim);
  if (inicio && fim && new Date(fim) <= new Date(inicio)) return { ok: false, erro: "A data final precisa ser depois da inicial" };

  const dados = {
    nome,
    selo: f.selo.trim().slice(0, 24) || null,
    tipo: f.tipo,
    valor,
    escopo: f.escopo,
    alvos: f.escopo === "loja" ? [] : f.alvos,
    inicio,
    fim,
    ativa: f.ativa,
  };

  const resultado = f.id
    ? await supabase.from("promocoes").update(dados).eq("id", f.id).select("id").single()
    : await supabase.from("promocoes").insert(dados).select("id").single();

  if (resultado.error) {
    console.error("[promocoes]", resultado.error);
    return { ok: false, erro: "Não foi possível salvar a promoção" };
  }

  await registrarAcao(user.id, f.id ? "promocao.editar" : "promocao.criar", "promocao", resultado.data.id, {
    nome,
    tipo: f.tipo,
    valor,
    escopo: f.escopo,
  });
  atualizarLoja();
  return { ok: true, id: resultado.data.id };
}

export async function alternarPromocao(id: string, ativa: boolean): Promise<Resposta> {
  const { supabase, user } = await exigirAdmin();
  const { error } = await supabase.from("promocoes").update({ ativa }).eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível alterar" };
  await registrarAcao(user.id, ativa ? "promocao.ativar" : "promocao.pausar", "promocao", id);
  atualizarLoja();
  return { ok: true };
}

export async function excluirPromocao(id: string): Promise<Resposta> {
  const { supabase, user } = await exigirAdmin();
  const { error } = await supabase.from("promocoes").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível excluir" };
  await registrarAcao(user.id, "promocao.excluir", "promocao", id);
  atualizarLoja();
  return { ok: true };
}

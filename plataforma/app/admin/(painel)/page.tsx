import Link from "next/link";
import { exigirAdmin } from "@/lib/admin/sessao";
import { COR_STATUS, ROTULO_STATUS } from "@/lib/admin/status";
import { formatarBRL } from "@/lib/preco";
import type { StatusPedido } from "@/lib/types";

export const metadata = { title: "Dashboard" };

interface PedidoResumo {
  id: string;
  codigo: string;
  cliente_nome: string;
  total: number;
  status: StatusPedido;
  criado_em: string;
  pago_em: string | null;
}

export default async function Dashboard() {
  const { supabase, nome } = await exigirAdmin();

  // Datas no fuso de Brasília
  const agora = new Date();
  const hojeBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora); // 2026-09-22
  const inicioHoje = new Date(`${hojeBR}T00:00:00-03:00`).toISOString();
  const inicioMes = new Date(`${hojeBR.slice(0, 7)}-01T00:00:00-03:00`).toISOString();

  const [aguardando, pagosHoje, emProducao, doMes, ultimos, produtos, alertas] = await Promise.all([
    supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("status", "aguardando_pagamento"),
    supabase.from("pedidos").select("id", { count: "exact", head: true }).gte("pago_em", inicioHoje),
    supabase.from("pedidos").select("id", { count: "exact", head: true }).in("status", ["pago", "em_producao"]),
    supabase.from("pedidos").select("total").gte("pago_em", inicioMes).neq("status", "cancelado"),
    supabase
      .from("pedidos")
      .select("id, codigo, cliente_nome, total, status, criado_em, pago_em")
      .order("criado_em", { ascending: false })
      .limit(8),
    supabase.from("produtos").select("nome, status, estoque, estoque_minimo"),
    supabase
      .from("log_admin")
      .select("id, acao, detalhes, criado_em")
      .eq("acao", "estoque.insuficiente")
      .order("criado_em", { ascending: false })
      .limit(5),
  ]);

  const faturamentoMes = (doMes.data ?? []).reduce((s, p) => s + Number(p.total), 0);
  const listaProdutos = produtos.data ?? [];
  const rascunhos = listaProdutos.filter((p) => p.status === "rascunho");
  const estoqueBaixo = listaProdutos.filter((p) => p.estoque !== null && p.estoque <= p.estoque_minimo && p.status === "publicado");
  const pedidos = (ultimos.data ?? []) as PedidoResumo[];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-semibold">Olá, {nome}! 👋</h1>
      <p className="mb-6 mt-1 text-texto-suave">Resumo da loja hoje.</p>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardNumero rotulo="Aguardando pagamento" valor={aguardando.count ?? 0} href="/admin/pedidos?status=aguardando_pagamento" />
        <CardNumero rotulo="Pagos hoje" valor={pagosHoje.count ?? 0} href="/admin/pedidos?status=pago" destaque />
        <CardNumero rotulo="Para produzir" valor={emProducao.count ?? 0} href="/admin/pedidos?status=em_producao" />
        <CardNumero rotulo="Faturamento do mês" valor={formatarBRL(faturamentoMes)} />
      </div>

      {(estoqueBaixo.length > 0 || rascunhos.length > 0 || (alertas.data ?? []).length > 0) && (
        <section className="mb-8 space-y-2">
          {(alertas.data ?? []).length > 0 && (
            <Alerta cor="perigo">
              ⚠ {alertas.data!.length} pedido(s) pago(s) sem estoque suficiente. Fale com o cliente.
            </Alerta>
          )}
          {estoqueBaixo.length > 0 && (
            <Alerta cor="dourado">
              📦 Estoque baixo: {estoqueBaixo.map((p) => `${p.nome} (${p.estoque})`).join(", ")}
            </Alerta>
          )}
          {rascunhos.length > 0 && (
            <Alerta cor="neutro">
              📝 {rascunhos.length} produto(s) em rascunho, fora da loja: {rascunhos.map((p) => p.nome).join(", ")}.{" "}
              <Link href="/admin/produtos" className="font-semibold underline">Ver produtos</Link>
            </Alerta>
          )}
        </section>
      )}

      <section className="rounded-grande border border-borda bg-cartao p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Últimos pedidos</h2>
          <Link href="/admin/pedidos" className="text-sm font-semibold text-terracota hover:underline">Ver todos</Link>
        </div>
        {pedidos.length === 0 ? (
          <p className="py-8 text-center text-texto-suave">
            Nenhum pedido ainda. Assim que o Pix estiver ligado, eles aparecem aqui. 🎉
          </p>
        ) : (
          <ul className="divide-y divide-borda">
            {pedidos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{p.codigo}</p>
                  <p className="truncate text-texto-suave">{p.cliente_nome}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${COR_STATUS[p.status]}`}>
                  {ROTULO_STATUS[p.status]}
                </span>
                <span className="shrink-0 font-semibold">{formatarBRL(Number(p.total))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CardNumero({ rotulo, valor, href, destaque }: { rotulo: string; valor: number | string; href?: string; destaque?: boolean }) {
  const conteudo = (
    <>
      <p className="text-xs font-bold uppercase tracking-wider text-texto-suave">{rotulo}</p>
      <p className={`mt-2 font-display text-2xl font-bold sm:text-3xl ${destaque ? "text-sucesso" : "text-marrom"}`}>{valor}</p>
    </>
  );
  const classe = "block rounded-card border border-borda bg-cartao p-4 transition";
  return href ? (
    <Link href={href} className={`${classe} hover:border-terracota hover:shadow-suave`}>{conteudo}</Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

function Alerta({ cor, children }: { cor: "perigo" | "dourado" | "neutro"; children: React.ReactNode }) {
  const classes = {
    perigo: "bg-perigo/10 text-perigo",
    dourado: "bg-dourado-claro text-marrom",
    neutro: "bg-creme-claro text-texto-suave border border-borda",
  };
  return <p className={`rounded-xl px-4 py-3 text-sm ${classes[cor]}`}>{children}</p>;
}

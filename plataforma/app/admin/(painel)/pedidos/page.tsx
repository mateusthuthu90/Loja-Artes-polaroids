import Link from "next/link";
import { exigirAdmin } from "@/lib/admin/sessao";
import { COR_STATUS, ROTULO_STATUS } from "@/lib/admin/status";
import { formatarBRL } from "@/lib/preco";
import type { StatusPedido } from "@/lib/types";
import { EmBreve } from "../EmBreve";

export const metadata = { title: "Pedidos" };

const STATUS = Object.keys(ROTULO_STATUS) as StatusPedido[];

export default async function PaginaPedidos({ searchParams }: PageProps<"/admin/pedidos">) {
  const { supabase } = await exigirAdmin();
  const { status } = await searchParams;
  const filtro = STATUS.includes(status as StatusPedido) ? (status as StatusPedido) : null;

  let consulta = supabase
    .from("pedidos")
    .select("id, codigo, cliente_nome, cliente_whatsapp, total, status, tipo_entrega, criado_em")
    .order("criado_em", { ascending: false })
    .limit(100);
  if (filtro) consulta = consulta.eq("status", filtro);
  const { data: pedidos } = await consulta;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-3xl font-semibold">Pedidos</h1>

      <nav className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        <Filtro href="/admin/pedidos" ativo={!filtro}>Todos</Filtro>
        {STATUS.map((s) => (
          <Filtro key={s} href={`/admin/pedidos?status=${s}`} ativo={filtro === s}>{ROTULO_STATUS[s]}</Filtro>
        ))}
      </nav>

      <div className="overflow-hidden rounded-grande border border-borda bg-cartao">
        {(pedidos ?? []).length === 0 ? (
          <p className="p-10 text-center text-texto-suave">Nenhum pedido {filtro ? `com status "${ROTULO_STATUS[filtro]}"` : "ainda"}.</p>
        ) : (
          <ul className="divide-y divide-borda">
            {pedidos!.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm">
                <span className="w-28 font-semibold">{p.codigo}</span>
                <span className="min-w-0 flex-1 truncate">{p.cliente_nome}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${COR_STATUS[p.status as StatusPedido]}`}>
                  {ROTULO_STATUS[p.status as StatusPedido]}
                </span>
                <span className="w-24 text-right font-semibold">{formatarBRL(Number(p.total))}</span>
                <span className="w-full text-xs text-texto-fraco sm:w-auto">
                  {new Date(p.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EmBreve etapa="Prompt 11">
        Detalhe do pedido com as fotos do cliente e o botão &quot;Baixar todas (.zip)&quot;, avanço de status,
        código de rastreio, notas internas e botão do WhatsApp com mensagem pronta.
      </EmBreve>
    </div>
  );
}

function Filtro({ href, ativo, children }: { href: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold ${
        ativo ? "border-terracota bg-terracota-claro text-marrom" : "border-borda bg-cartao hover:border-terracota"
      }`}
    >
      {children}
    </Link>
  );
}

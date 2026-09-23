import Image from "next/image";
import Link from "next/link";
import { EstoqueRapido } from "@/components/admin/EstoqueRapido";
import { Icone } from "@/components/Icone";
import { exigirAdmin } from "@/lib/admin/sessao";
import type { Produto } from "@/lib/types";
import { AjusteEstoque } from "./AjusteEstoque";

export const metadata = { title: "Estoque" };

const MOTIVO: Record<string, string> = {
  venda: "Venda",
  cancelamento: "Cancelamento",
  reposicao: "Reposição",
  perda: "Perda",
  correcao: "Correção",
};

export default async function PaginaEstoque() {
  const { supabase } = await exigirAdmin();
  const [{ data: produtos }, { data: movimentos }, { data: admins }] = await Promise.all([
    supabase.from("produtos").select("*").neq("status", "inativo").order("nome"),
    supabase
      .from("estoque_movimentos")
      .select("id, produto_id, delta, motivo, observacao, autor, criado_em")
      .order("criado_em", { ascending: false })
      .limit(30),
    supabase.from("admins").select("user_id, nome"),
  ]);

  const lista = (produtos ?? []) as Produto[];
  const controlados = lista.filter((p) => p.estoque !== null);
  const sobDemanda = lista.filter((p) => p.estoque === null);
  const nomes = new Map(lista.map((p) => [p.id, p.nome]));
  const autores = new Map((admins ?? []).map((a) => [a.user_id, a.nome]));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-3xl font-semibold">Estoque</h1>
      <p className="mb-6 text-sm text-texto-suave">
        O saldo baixa sozinho quando o pagamento é confirmado e volta se o pedido for cancelado.
        Produto com estoque 0 aparece como <strong>Esgotado</strong> na loja, sem sumir da vitrine.
      </p>

      <h2 className="mb-3 text-xl font-semibold">Com controle de estoque</h2>
      {controlados.length === 0 ? (
        <p className="rounded-grande border border-dashed border-borda p-6 text-center text-sm text-texto-suave">
          Nenhum produto com estoque controlado. Use o botão <strong>Controlar estoque</strong> na lista abaixo.
        </p>
      ) : (
        <ul className="space-y-2">
          {controlados.map((p) => {
            const baixo = p.estoque! <= p.estoque_minimo;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-card border border-borda bg-cartao p-3">
                <Link href={`/admin/produtos/${p.id}`} prefetch={false} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-terracota-claro">
                  {p.imagens[0] && <Image src={p.imagens[0]} alt={p.nome} fill sizes="48px" className="object-cover" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/produtos/${p.id}`} prefetch={false} className="font-semibold hover:text-marrom">{p.nome}</Link>
                  <p className="flex items-center gap-1 text-xs text-texto-suave">
                    {p.estoque === 0 ? (
                      <span className="font-bold text-perigo">Esgotado</span>
                    ) : baixo ? (
                      <>
                        <Icone nome="alerta" className="h-3.5 w-3.5 text-dourado" />
                        <span className="font-bold text-dourado">Estoque baixo</span>
                      </>
                    ) : null}
                    <span>avisar quando chegar a {p.estoque_minimo}</span>
                  </p>
                </div>
                <span className="font-display text-2xl font-bold text-marrom">{p.estoque}</span>
                <AjusteEstoque produtoId={p.id} estoque={p.estoque!} />
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-3 mt-8 text-xl font-semibold">Sob demanda</h2>
      <p className="mb-3 text-sm text-texto-suave">Produzidos a cada pedido, sem limite de quantidade.</p>
      <ul className="space-y-2">
        {sobDemanda.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-borda bg-cartao p-3">
            <Link href={`/admin/produtos/${p.id}`} prefetch={false} className="font-semibold hover:text-marrom">{p.nome}</Link>
            <EstoqueRapido produtoId={p.id} estoque={null} estoqueMinimo={p.estoque_minimo} />
          </li>
        ))}
      </ul>

      <h2 className="mb-3 mt-8 text-xl font-semibold">Últimas movimentações</h2>
      {(movimentos ?? []).length === 0 ? (
        <p className="rounded-grande border border-dashed border-borda p-6 text-center text-sm text-texto-suave">
          Nenhuma movimentação ainda.
        </p>
      ) : (
        <ul className="divide-y divide-borda rounded-grande border border-borda bg-cartao">
          {movimentos!.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
              <span className={`w-12 font-bold ${m.delta > 0 ? "text-sucesso" : "text-perigo"}`}>
                {m.delta > 0 ? "+" : ""}{m.delta}
              </span>
              <span className="min-w-0 flex-1 truncate">{nomes.get(m.produto_id) ?? "produto removido"}</span>
              <span className="rounded-full bg-creme px-2 py-0.5 text-xs">{MOTIVO[m.motivo] ?? m.motivo}</span>
              {m.observacao && <span className="text-xs text-texto-suave">{m.observacao}</span>}
              <span className="text-xs text-texto-fraco">
                {autores.get(m.autor) ?? (m.autor === "mercadopago" ? "pagamento" : "sistema")} ·{" "}
                {new Date(m.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

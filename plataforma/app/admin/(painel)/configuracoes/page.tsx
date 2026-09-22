import { exigirAdmin } from "@/lib/admin/sessao";
import { EmBreve } from "../EmBreve";

export const metadata = { title: "Configurações" };

export default async function PaginaConfiguracoes() {
  const { supabase } = await exigirAdmin();
  const { data } = await supabase.from("configuracoes").select("chave, descricao, valor").order("chave");

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-3xl font-semibold">Configurações</h1>
      <ul className="divide-y divide-borda rounded-grande border border-borda bg-cartao">
        {(data ?? []).map((c) => (
          <li key={c.chave} className="p-4 text-sm">
            <p className="font-semibold">{c.chave}</p>
            <p className="text-texto-suave">{c.descricao}</p>
            <code className="mt-1 block overflow-x-auto rounded-lg bg-creme-claro px-2 py-1 text-xs">{JSON.stringify(c.valor)}</code>
          </li>
        ))}
      </ul>
      <EmBreve etapa="Prompt 12">
        Formulário para editar frete, prazo de produção, banner da home, WhatsApp da loja e modo férias, sem mexer em código.
      </EmBreve>
    </div>
  );
}

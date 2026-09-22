import { exigirAdmin } from "@/lib/admin/sessao";
import { EmBreve } from "../EmBreve";

export const metadata = { title: "Estoque" };

export default async function PaginaEstoque() {
  await exigirAdmin();
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-3xl font-semibold">Estoque</h1>
      <p className="text-texto-suave">
        Hoje todos os produtos estão como <strong>sob demanda</strong> (sem controle de estoque).
        A baixa automática no pagamento e a devolução no cancelamento já funcionam no banco.
      </p>
      <EmBreve etapa="Prompt 12">
        Ajuste manual com motivo (reposição, perda, correção), histórico de movimentos e alerta de estoque baixo.
      </EmBreve>
    </div>
  );
}

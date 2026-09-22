// Registro de ações do admin (regra 8.2: quem fez o quê e quando).
// Grava com a service role — a tabela não aceita escrita pelo navegador.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function registrarAcao(
  usuarioId: string,
  acao: string,
  entidade: string,
  entidadeId: string | null,
  detalhes: Record<string, unknown> = {},
) {
  try {
    const { error } = await createAdminClient()
      .from("log_admin")
      .insert({ usuario_id: usuarioId, acao, entidade, entidade_id: entidadeId, detalhes });
    if (error) console.error("[log_admin] falha ao registrar:", error.message);
  } catch (e) {
    // o log nunca pode impedir a operação principal
    console.error("[log_admin] indisponível:", e);
  }
}

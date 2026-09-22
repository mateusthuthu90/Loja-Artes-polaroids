// Verificação de acesso ao painel. Duas barreiras (regra 8.1):
//  1. proxy.ts: sem sessão → /admin/login
//  2. aqui: sessão válida E usuário na tabela `admins` (estar logado não basta)
import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function exigirAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("nome")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    redirect("/admin/login?erro=sem-acesso");
  }

  return { supabase, user, nome: admin.nome as string };
}

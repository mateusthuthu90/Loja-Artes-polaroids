"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/env";
import { ipDaRequisicao, permitir } from "@/lib/rate-limit";

export interface EstadoLogin {
  erro: string | null;
  email: string;
}

export async function entrar(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const destino = String(formData.get("next") ?? "/admin");

  if (!supabaseConfigurado()) return { erro: "Supabase não configurado no servidor.", email };
  if (!email || !senha) return { erro: "Informe e-mail e senha.", email };

  // Freio contra tentativa de adivinhar senha: 10 tentativas a cada 15 min por IP
  const ip = ipDaRequisicao(new Request("http://x", { headers: await headers() }));
  if (!permitir(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return { erro: "Muitas tentativas. Aguarde 15 minutos e tente de novo.", email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) return { erro: "E-mail ou senha incorretos.", email };

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { erro: "Este usuário não tem acesso ao painel.", email };
  }

  // só redireciona para dentro do /admin (evita "open redirect")
  redirect(destino.startsWith("/admin") && !destino.startsWith("//") ? destino : "/admin");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

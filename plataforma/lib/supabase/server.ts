// Cliente do Supabase para SERVER COMPONENTS, Server Functions e Route Handlers.
// Usa a chave anon + a sessão do usuário (cookies). Respeita RLS:
// visitante vê só o catálogo publicado; o admin logado enxerga o que as políticas permitirem.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado a partir de um Server Component (cookies só leitura).
          // Sem problema: o proxy.ts já renova a sessão a cada requisição.
        }
      },
    },
  });
}

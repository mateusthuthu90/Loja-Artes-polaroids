// Cliente do Supabase para o NAVEGADOR (Client Components).
// Usa só a chave anon — tudo que ele consegue ler/escrever é limitado pelas regras de RLS.
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

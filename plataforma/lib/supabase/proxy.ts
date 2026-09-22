// Renova a sessão do Supabase a cada requisição e protege as rotas /admin/*.
// Chamado pelo proxy.ts da raiz (no Next 16 o antigo "middleware" se chama "proxy").
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "./env";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rotaAdmin = pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (!supabaseConfigurado()) {
    // Sem Supabase não existe login possível: /admin fica sempre bloqueado.
    if (rotaAdmin) return redirecionarParaLogin(request);
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() valida o token no servidor do Supabase (não confia só no cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (rotaAdmin && !user) return redirecionarParaLogin(request);

  return response;
}

function redirecionarParaLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

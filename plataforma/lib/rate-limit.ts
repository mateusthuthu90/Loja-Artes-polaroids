// Limite simples de requisições por IP (janela deslizante em memória).
// Suficiente para o MVP barrar spam básico; cada instância do servidor tem a
// sua memória, então não é um limite global exato. Se o volume crescer,
// trocar por Upstash/Vercel KV.
import "server-only";

const janelas = new Map<string, number[]>();

export function permitir(chave: string, limite: number, janelaMs: number, peso = 1): boolean {
  const agora = Date.now();
  const recentes = (janelas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (recentes.length + peso > limite) {
    janelas.set(chave, recentes);
    return false;
  }
  for (let i = 0; i < peso; i++) recentes.push(agora);
  janelas.set(chave, recentes);

  if (janelas.size > 5000) {
    // evita crescer para sempre: descarta chaves antigas
    for (const [k, ts] of janelas) if (!ts.some((t) => agora - t < janelaMs)) janelas.delete(k);
  }
  return true;
}

export function ipDaRequisicao(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "desconhecido"
  );
}

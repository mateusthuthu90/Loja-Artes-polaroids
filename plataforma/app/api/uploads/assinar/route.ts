// POST /api/uploads/assinar
// Gera URLs assinadas (uso único, ~2h) para o navegador subir fotos direto no
// bucket PRIVADO "fotos-clientes", sem nunca ter permissão de escrita nele.
//
// As fotos vão para pendentes/<sessão>/<uuid>.<ext>. O /api/checkout (Prompt 6)
// confere que os caminhos pertencem à sessão e amarra cada foto ao item do pedido.
// Pendentes que nunca viraram pedido são apagadas pela rotina de limpeza (Prompt 13).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ipDaRequisicao, permitir } from "@/lib/rate-limit";
import { FOTO_TAMANHO_MAXIMO, FOTO_TIPOS_ACEITOS } from "@/lib/validacao";

const MAX_POR_REQUISICAO = 20;
const MAX_POR_HORA_POR_IP = 400; // folga para kits de 100 fotos + reenvios
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const EXTENSAO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
};

interface ArquivoPedido {
  tipo: string;
  tamanho: number;
}

export async function POST(request: Request) {
  let corpo: { sessao?: unknown; arquivos?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return erro("Requisição inválida", 400);
  }

  const sessao = typeof corpo.sessao === "string" ? corpo.sessao : "";
  if (!REGEX_UUID.test(sessao)) return erro("Sessão inválida", 400);

  if (!Array.isArray(corpo.arquivos) || corpo.arquivos.length === 0) {
    return erro("Nenhum arquivo informado", 400);
  }
  if (corpo.arquivos.length > MAX_POR_REQUISICAO) {
    return erro(`Envie no máximo ${MAX_POR_REQUISICAO} fotos por vez`, 400);
  }

  const arquivos = corpo.arquivos as ArquivoPedido[];
  for (const a of arquivos) {
    if (!a || !FOTO_TIPOS_ACEITOS.includes(a.tipo)) {
      return erro("Formato não aceito. Envie fotos JPG, PNG, HEIC ou WebP", 400);
    }
    if (typeof a.tamanho !== "number" || a.tamanho <= 0 || a.tamanho > FOTO_TAMANHO_MAXIMO) {
      return erro("Cada foto pode ter no máximo 15 MB", 400);
    }
  }

  if (!permitir(`upload:${ipDaRequisicao(request)}`, MAX_POR_HORA_POR_IP, 60 * 60 * 1000, arquivos.length)) {
    return erro("Muitas fotos enviadas em pouco tempo. Aguarde alguns minutos e tente de novo.", 429);
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    console.error("[uploads] supabase admin indisponível:", e);
    return erro("Envio de fotos indisponível no momento. Tente novamente em instantes.", 503);
  }

  const bucket = supabase.storage.from("fotos-clientes");
  const assinaturas = await Promise.all(
    arquivos.map(async (a) => {
      const caminho = `pendentes/${sessao}/${crypto.randomUUID()}.${EXTENSAO[a.tipo]}`;
      const { data, error } = await bucket.createSignedUploadUrl(caminho);
      if (error || !data) {
        console.error("[uploads] falha ao assinar:", error?.message);
        return null;
      }
      return { caminho: data.path, token: data.token };
    }),
  );

  if (assinaturas.some((a) => a === null)) {
    return erro("Não foi possível preparar o envio das fotos. Tente novamente.", 502);
  }

  return NextResponse.json({ assinaturas });
}

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

"use client";

// Recarrega os dados da página em intervalos, sem o cliente precisar apertar
// nada. Usado enquanto um pagamento está em análise: quando o webhook do
// Mercado Pago confirmar, a tela muda sozinha.
//
// Não renderiza nada — é só o temporizador.
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const RECARREGAR_A_CADA = 5000;

export function AtualizaStatus({ intervaloMs = RECARREGAR_A_CADA }: { intervaloMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => router.refresh(), intervaloMs);
    return () => clearInterval(t);
  }, [router, intervaloMs]);

  return null;
}

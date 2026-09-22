"use client";

// Estado do checkout persistido no localStorage: se o celular recarregar a
// página no meio (muito comum ao abrir a galeria de fotos), nada se perde —
// nem os dados digitados, nem as fotos já enviadas.
import { useCallback, useEffect, useState } from "react";
import type { DadosCliente, Endereco, TipoEntrega } from "@/lib/validacao";

const CHAVE = "ap_checkout_v1";

export interface FotoEnviada {
  caminho: string; // pendentes/<sessão>/<uuid>.jpg — gerado pelo servidor
  nome: string; // nome original, só para o cliente reconhecer
  miniatura: string | null;
  largura: number | null;
  altura: number | null;
}

export interface EstadoCheckout {
  sessao: string;
  dados: DadosCliente;
  tipoEntrega: TipoEntrega;
  endereco: Endereco;
  observacoes: string;
  /** fotos por item do carrinho (chave do item) */
  fotos: Record<string, FotoEnviada[]>;
}

function novoEstado(): EstadoCheckout {
  return {
    sessao: crypto.randomUUID(),
    dados: { nome: "", whatsapp: "", email: "" },
    tipoEntrega: "envio",
    endereco: { cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" },
    observacoes: "",
    fotos: {},
  };
}

function ler(): EstadoCheckout {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    if (salvo && typeof salvo.sessao === "string") {
      const base = novoEstado();
      return {
        ...base,
        ...salvo,
        dados: { ...base.dados, ...salvo.dados },
        endereco: { ...base.endereco, ...salvo.endereco },
        fotos: salvo.fotos && typeof salvo.fotos === "object" ? salvo.fotos : {},
      };
    }
  } catch {
    // estado corrompido → começa de novo
  }
  return novoEstado();
}

export function useEstadoCheckout() {
  const [estado, setEstado] = useState<EstadoCheckout | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
    setEstado(ler());
  }, []);

  const atualizar = useCallback((fn: (e: EstadoCheckout) => EstadoCheckout) => {
    setEstado((atual) => {
      if (!atual) return atual;
      const novo = fn(atual);
      try {
        localStorage.setItem(CHAVE, JSON.stringify(novo));
      } catch {
        // storage cheio (muitas miniaturas): segue sem persistir as miniaturas
        try {
          const semMiniaturas = {
            ...novo,
            fotos: Object.fromEntries(
              Object.entries(novo.fotos).map(([k, fs]) => [k, fs.map((f) => ({ ...f, miniatura: null }))]),
            ),
          };
          localStorage.setItem(CHAVE, JSON.stringify(semMiniaturas));
        } catch {
          // sem storage: funciona só nesta aba
        }
      }
      return novo;
    });
  }, []);

  /** Depois que o pedido é criado, o checkout recomeça do zero (nova sessão). */
  const reiniciar = useCallback(() => {
    try {
      localStorage.removeItem(CHAVE);
    } catch {}
    setEstado(novoEstado());
  }, []);

  return { estado, atualizar, reiniciar };
}

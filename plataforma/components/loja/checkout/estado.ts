"use client";

// Estado do checkout persistido no localStorage: se o celular recarregar a
// página no meio, nada se perde do que o cliente já digitou.
import { useCallback, useEffect, useState } from "react";
import type { DadosCliente, Endereco, TipoEntrega } from "@/lib/validacao";

const CHAVE = "ap_checkout_v1";

export interface EstadoCheckout {
  sessao: string;
  dados: DadosCliente;
  tipoEntrega: TipoEntrega;
  endereco: Endereco;
  observacoes: string;
}

function novoEstado(): EstadoCheckout {
  return {
    sessao: crypto.randomUUID(),
    dados: { nome: "", whatsapp: "", email: "", cpf: "" },
    tipoEntrega: "envio",
    endereco: { cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" },
    observacoes: "",
  };
}

function ler(): EstadoCheckout {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    if (salvo && typeof salvo.sessao === "string") {
      const base = novoEstado();
      // Campo a campo: estados salvos antes da remoção do upload carregam um
      // "fotos" com miniaturas em base64 que não serve mais para nada.
      return {
        sessao: salvo.sessao,
        dados: { ...base.dados, ...salvo.dados },
        tipoEntrega: salvo.tipoEntrega ?? base.tipoEntrega,
        endereco: { ...base.endereco, ...salvo.endereco },
        observacoes: typeof salvo.observacoes === "string" ? salvo.observacoes : "",
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
        // sem storage (modo anônimo / cota cheia): funciona só nesta aba
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

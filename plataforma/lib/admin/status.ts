import type { StatusPedido } from "@/lib/types";

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_producao: "Em produção",
  enviado: "Enviado",
  pronto_retirada: "Pronto p/ retirada",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const COR_STATUS: Record<StatusPedido, string> = {
  aguardando_pagamento: "bg-dourado-claro text-marrom",
  pago: "bg-sucesso-claro text-sucesso",
  em_producao: "bg-terracota-claro text-marrom",
  enviado: "bg-[#e3ecf4] text-[#3d6286]",
  pronto_retirada: "bg-[#e3ecf4] text-[#3d6286]",
  concluido: "bg-creme text-texto-suave",
  cancelado: "bg-perigo/10 text-perigo",
};

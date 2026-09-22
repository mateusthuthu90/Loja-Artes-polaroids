// Regras de preço e de fotos exigidas — usadas pela TELA e pelo SERVIDOR.
// O checkout recalcula tudo com estas mesmas funções a partir do banco,
// ignorando qualquer valor que venha do navegador.
import type { OpcoesEscolhidas, Produto } from "./types";

export class OpcaoInvalidaError extends Error {}

/** Valida as opções escolhidas contra o produto. Lança OpcaoInvalidaError se algo não bater. */
export function validarOpcoes(produto: Produto, escolhidas: OpcoesEscolhidas): void {
  const nomesValidos = new Set(produto.opcoes.map((g) => g.nome));
  for (const nome of Object.keys(escolhidas)) {
    if (!nomesValidos.has(nome)) {
      throw new OpcaoInvalidaError(`Opção "${nome}" não existe em ${produto.nome}`);
    }
  }
  for (const grupo of produto.opcoes) {
    const escolhido = escolhidas[grupo.nome];
    if (!grupo.valores.some((v) => v.label === escolhido)) {
      throw new OpcaoInvalidaError(`Escolha um valor válido para "${grupo.nome}" em ${produto.nome}`);
    }
  }
}

/** Preço unitário = preço base + acréscimos das opções escolhidas. */
export function precoUnitario(produto: Produto, escolhidas: OpcoesEscolhidas): number {
  const acrescimos = produto.opcoes.reduce((soma, grupo) => {
    const valor = grupo.valores.find((v) => v.label === escolhidas[grupo.nome]);
    return soma + (valor?.acrescimo ?? 0);
  }, 0);
  return arredondar(Number(produto.preco) + acrescimos);
}

/**
 * Quantas fotos o cliente precisa enviar por UNIDADE do item.
 * Se alguma opção escolhida define "fotos", ela manda; senão vale min/max do produto.
 */
export function fotosPorUnidade(
  produto: Produto,
  escolhidas: OpcoesEscolhidas,
): { min: number; max: number } {
  if (!produto.requer_fotos_cliente) return { min: 0, max: 0 };
  for (const grupo of produto.opcoes) {
    const valor = grupo.valores.find((v) => v.label === escolhidas[grupo.nome]);
    if (valor?.fotos) return { min: valor.fotos, max: valor.fotos };
  }
  return { min: produto.min_fotos, max: produto.max_fotos };
}

/** Menor preço possível do produto (para "A partir de R$ X" nos cards). */
export function precoMinimo(produto: Produto): number {
  const menorAcrescimo = produto.opcoes.reduce(
    (soma, g) => soma + Math.min(0, ...g.valores.map((v) => v.acrescimo)),
    0,
  );
  return arredondar(Number(produto.preco) + menorAcrescimo);
}

/** Produto tem preço variável conforme a opção? */
export function temPrecoVariavel(produto: Produto): boolean {
  return produto.opcoes.some((g) => new Set(g.valores.map((v) => v.acrescimo)).size > 1);
}

export function esgotado(produto: Produto): boolean {
  return produto.estoque !== null && produto.estoque <= 0;
}

export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarBRL(valor: number): string {
  return brl.format(valor);
}

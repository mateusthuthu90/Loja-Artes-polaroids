// Validação do cadastro de produto — prevencao-erros.md §1.
// Roda na tela (feedback na hora) e de novo no servidor antes de gravar.
import type { GrupoOpcao, Produto, StatusProduto } from "./types";

export interface ProdutoForm {
  id: string | null;
  categoria_id: string;
  nome: string;
  slug: string;
  descricao_curta: string;
  descricao: string;
  preco: string; // texto digitado: "12,90"
  imagens: string[];
  opcoes: GrupoOpcao[];
  sob_demanda: boolean;
  estoque: string;
  estoque_minimo: string;
  requer_fotos_cliente: boolean;
  min_fotos: string;
  max_fotos: string;
  prazo_producao_dias: string; // "" = usa o padrão da loja
  destaque: boolean;
  novo: boolean;
  status: StatusProduto;
}

export type ErrosProduto = Partial<Record<keyof ProdutoForm | "geral", string>>;

export const LIMITES = { nome: 80, descricao_curta: 160, descricao: 4000, imagens: 8 };

/** "Polaroid Retrô 10x" → "polaroid-retro-10x" */
export function gerarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Aceita "12,90", "12.90", "R$ 1.234,56" → 12.9 / 1234.56. NaN se inválido. */
export function lerPreco(texto: string): number {
  let t = texto.replace(/[^\d.,]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  return Number(t);
}

export function formatarPrecoCampo(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

function inteiro(texto: string): number {
  return /^\d+$/.test(texto.trim()) ? Number(texto.trim()) : NaN;
}

/** Remove qualquer tag HTML colada de outro lugar (evita layout quebrado / XSS). */
export function limparTexto(texto: string): string {
  return texto.replace(/<[^>]*>/g, "").replace(/\r\n/g, "\n").trim();
}

export function validarProduto(f: ProdutoForm): ErrosProduto {
  const e: ErrosProduto = {};
  const nome = limparTexto(f.nome);
  if (!nome) e.nome = "Informe o nome";
  else if (nome.length > LIMITES.nome) e.nome = `Máximo de ${LIMITES.nome} caracteres`;

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) e.slug = "Use só letras minúsculas, números e hífen";
  if (!f.categoria_id) e.categoria_id = "Escolha uma categoria";

  const preco = lerPreco(f.preco);
  if (!(preco > 0)) e.preco = "Preço inválido. Ex.: 34,90";
  else if (preco > 99999) e.preco = "Preço muito alto";

  if (limparTexto(f.descricao_curta).length > LIMITES.descricao_curta)
    e.descricao_curta = `Máximo de ${LIMITES.descricao_curta} caracteres`;
  if (limparTexto(f.descricao).length > LIMITES.descricao) e.descricao = `Máximo de ${LIMITES.descricao} caracteres`;
  if (f.imagens.length > LIMITES.imagens) e.imagens = `Máximo de ${LIMITES.imagens} fotos`;

  if (!f.sob_demanda && !(inteiro(f.estoque) >= 0)) e.estoque = "Informe a quantidade em estoque (0 ou mais)";
  if (!(inteiro(f.estoque_minimo) >= 0)) e.estoque_minimo = "Número inválido";
  if (f.prazo_producao_dias.trim() && !(inteiro(f.prazo_producao_dias) >= 0)) e.prazo_producao_dias = "Número de dias inválido";

  if (f.requer_fotos_cliente) {
    const min = inteiro(f.min_fotos);
    const max = inteiro(f.max_fotos);
    if (!(min >= 0)) e.min_fotos = "Número inválido";
    if (!(max >= 1)) e.max_fotos = "Mínimo 1";
    else if (min > max) e.max_fotos = "Máximo deve ser maior ou igual ao mínimo";
  }

  // Variações: nome, valores sem duplicados, acréscimo numérico
  const nomesGrupos = new Set<string>();
  for (const g of f.opcoes) {
    const ng = g.nome.trim();
    if (!ng) { e.opcoes = "Toda variação precisa de um nome (ex.: Tamanho)"; break; }
    if (nomesGrupos.has(ng.toLowerCase())) { e.opcoes = `Variação "${ng}" repetida`; break; }
    nomesGrupos.add(ng.toLowerCase());
    if (g.valores.length === 0) { e.opcoes = `Adicione ao menos uma opção em "${ng}"`; break; }
    const labels = new Set<string>();
    for (const v of g.valores) {
      const l = v.label.trim();
      if (!l) { e.opcoes = `Há uma opção sem nome em "${ng}"`; break; }
      if (labels.has(l.toLowerCase())) { e.opcoes = `Opção "${l}" repetida em "${ng}"`; break; }
      labels.add(l.toLowerCase());
      if (!Number.isFinite(v.acrescimo)) { e.opcoes = `Preço inválido em "${l}"`; break; }
      if (preco > 0 && preco + v.acrescimo < 0.01) { e.opcoes = `O preço de "${l}" precisa ser maior que zero`; break; }
      if (v.fotos !== undefined && !(Number.isInteger(v.fotos) && v.fotos >= 1)) { e.opcoes = `Quantidade de fotos inválida em "${l}"`; break; }
      if (v.unidades !== undefined && !(Number.isInteger(v.unidades) && v.unidades >= 1)) { e.opcoes = `Número de unidades inválido em "${l}"`; break; }
    }
    if (e.opcoes) break;
  }

  // Regra 1.1: só publica completo
  if (f.status === "publicado") {
    if (f.imagens.length === 0) e.imagens = "Para publicar, adicione ao menos 1 foto";
    if (!limparTexto(f.descricao)) e.descricao = "Para publicar, escreva a descrição";
  }
  return e;
}

export const PRODUTO_VAZIO: ProdutoForm = {
  id: null, categoria_id: "", nome: "", slug: "", descricao_curta: "", descricao: "", preco: "",
  imagens: [], opcoes: [], sob_demanda: true, estoque: "0", estoque_minimo: "3",
  requer_fotos_cliente: true, min_fotos: "1", max_fotos: "1", prazo_producao_dias: "",
  destaque: false, novo: true, status: "rascunho",
};

/** Linha da tabela `produtos` → formulário. */
export function deBanco(p: Produto): ProdutoForm {
  return {
    id: p.id,
    categoria_id: p.categoria_id,
    nome: p.nome,
    slug: p.slug,
    descricao_curta: p.descricao_curta,
    descricao: p.descricao,
    preco: formatarPrecoCampo(Number(p.preco)),
    imagens: p.imagens,
    opcoes: p.opcoes,
    sob_demanda: p.estoque === null,
    estoque: String(p.estoque ?? 0),
    estoque_minimo: String(p.estoque_minimo),
    requer_fotos_cliente: p.requer_fotos_cliente,
    min_fotos: String(p.min_fotos),
    max_fotos: String(p.max_fotos),
    prazo_producao_dias: p.prazo_producao_dias === null ? "" : String(p.prazo_producao_dias),
    destaque: p.destaque,
    novo: p.novo,
    status: p.status,
  };
}

/** Converte o formulário validado nas colunas da tabela `produtos`. */
export function paraBanco(f: ProdutoForm) {
  return {
    categoria_id: f.categoria_id,
    nome: limparTexto(f.nome),
    slug: f.slug,
    descricao_curta: limparTexto(f.descricao_curta),
    descricao: limparTexto(f.descricao),
    preco: lerPreco(f.preco),
    imagens: f.imagens,
    opcoes: f.opcoes.map((g) => ({
      nome: g.nome.trim(),
      valores: g.valores.map((v) => ({
        label: v.label.trim(),
        acrescimo: Math.round(v.acrescimo * 100) / 100,
        ...(v.fotos ? { fotos: v.fotos } : {}),
        ...(v.unidades ? { unidades: v.unidades } : {}),
      })),
    })),
    estoque: f.sob_demanda ? null : inteiro(f.estoque),
    estoque_minimo: inteiro(f.estoque_minimo),
    requer_fotos_cliente: f.requer_fotos_cliente,
    min_fotos: f.requer_fotos_cliente ? inteiro(f.min_fotos) : 0,
    max_fotos: f.requer_fotos_cliente ? inteiro(f.max_fotos) : 0,
    prazo_producao_dias: f.prazo_producao_dias.trim() ? inteiro(f.prazo_producao_dias) : null,
    destaque: f.destaque,
    novo: f.novo,
    status: f.status,
  };
}

// Validações do checkout — as MESMAS funções rodam na tela (feedback imediato)
// e no servidor (/api/checkout), que nunca confia no que vem do navegador.

export interface DadosCliente {
  nome: string;
  whatsapp: string; // só dígitos, com DDD: 33998035543
  email: string; // opcional ("" = não informado)
}

export interface Endereco {
  cep: string; // só dígitos
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export type TipoEntrega = "retirada" | "envio";

export type Erros<T> = Partial<Record<keyof T, string>>;

export const somenteDigitos = (v: string) => v.replace(/\D/g, "");

export function validarDados(d: DadosCliente): Erros<DadosCliente> {
  const erros: Erros<DadosCliente> = {};
  const nome = d.nome.trim();
  if (nome.length < 3 || !nome.includes(" ")) erros.nome = "Informe seu nome e sobrenome";
  else if (nome.length > 120) erros.nome = "Nome muito longo";

  const tel = somenteDigitos(d.whatsapp);
  if (!/^[1-9]{2}9?\d{8}$/.test(tel)) erros.whatsapp = "WhatsApp inválido. Use DDD + número";

  const email = d.email.trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) erros.email = "E-mail inválido";
  return erros;
}

const UFS = new Set(
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "),
);

export function validarEndereco(e: Endereco): Erros<Endereco> {
  const erros: Erros<Endereco> = {};
  if (somenteDigitos(e.cep).length !== 8) erros.cep = "CEP deve ter 8 números";
  if (e.rua.trim().length < 3) erros.rua = "Informe a rua";
  if (!e.numero.trim()) erros.numero = "Informe o número (ou S/N)";
  if (e.bairro.trim().length < 2) erros.bairro = "Informe o bairro";
  if (e.cidade.trim().length < 2) erros.cidade = "Informe a cidade";
  if (!UFS.has(e.uf.trim().toUpperCase())) erros.uf = "UF inválida";
  for (const campo of Object.keys(e) as (keyof Endereco)[]) {
    if (e[campo].length > 120) erros[campo] = "Texto muito longo";
  }
  return erros;
}

export const semErros = (erros: object) => Object.keys(erros).length === 0;

// ---------------------------------------------------------------------------
// Máscaras de digitação
// ---------------------------------------------------------------------------
export function mascararWhatsApp(v: string): string {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascararCep(v: string): string {
  const d = somenteDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// ---------------------------------------------------------------------------
// Fotos do cliente (regra 4.2)
// ---------------------------------------------------------------------------
export const FOTO_TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const FOTO_TAMANHO_MAXIMO = 15 * 1024 * 1024; // 15 MB (limite do bucket)
/** Abaixo disso a foto pode sair pixelada — avisamos, mas não bloqueamos. */
export const FOTO_LADO_MINIMO_RECOMENDADO = 800;

/** Caminho de upload gerado pelo servidor: pendentes/<sessão>/<uuid>.<ext> */
export const REGEX_CAMINHO_FOTO =
  /^pendentes\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/;

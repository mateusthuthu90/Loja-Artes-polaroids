// Validações do checkout — as MESMAS funções rodam na tela (feedback imediato)
// e no servidor (/api/checkout), que nunca confia no que vem do navegador.

export interface DadosCliente {
  nome: string;
  whatsapp: string; // só dígitos, com DDD: 33998035543
  email: string; // obrigatório: o Mercado Pago exige o e-mail do pagador no Pix
  cpf: string; // só dígitos. Vai para o Mercado Pago e NÃO é gravado no nosso banco.
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

  // E-mail virou obrigatório no Prompt 6: o Pix do Mercado Pago recusa a cobrança
  // sem e-mail do pagador, e é por ele que o cliente recebe o comprovante.
  const email = d.email.trim();
  if (!email) erros.email = "Informe seu e-mail (o Pix é enviado para ele)";
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) erros.email = "E-mail inválido";

  if (!cpfValido(d.cpf)) erros.cpf = "CPF inválido";
  return erros;
}

/**
 * CPF com dígitos verificadores (regra oficial). Não consulta a Receita:
 * só garante que o número é bem formado, evitando erro bobo de digitação
 * antes de mandar a cobrança para o Mercado Pago.
 */
export function cpfValido(v: string): boolean {
  const d = somenteDigitos(v);
  if (d.length !== 11) return false;
  // 00000000000, 11111111111… são formalmente válidos no cálculo, mas não existem
  if (/^(\d)\1{10}$/.test(d)) return false;

  for (const [ate, posicao] of [[9, 10], [10, 11]] as const) {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (posicao - i);
    const resto = (soma * 10) % 11;
    if ((resto === 10 ? 0 : resto) !== Number(d[ate])) return false;
  }
  return true;
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

export function mascararCpf(v: string): string {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// As fotos do cliente não passam mais pelo site: são combinadas pelo WhatsApp
// depois da confirmação do pagamento. As constantes de upload saíram junto.

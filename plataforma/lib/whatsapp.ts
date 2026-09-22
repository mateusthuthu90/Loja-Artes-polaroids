/** Link wa.me com mensagem pronta. `numero` só dígitos com DDI (ex.: 5533998035543). */
export function linkWhatsApp(numero: string, mensagem?: string): string {
  const base = `https://wa.me/${numero.replace(/\D/g, "")}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

/** 5533998035543 → (33) 99803-5543 */
export function formatarWhatsApp(numero: string): string {
  const d = numero.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return numero;
}

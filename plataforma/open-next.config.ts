// Adaptador que faz o Next.js rodar na Cloudflare (Workers).
// Sem cache incremental externo por enquanto: o catálogo já é revalidado a cada
// 60s e o painel invalida na hora ao salvar. Se um dia precisar, dá para ligar
// o cache em R2 (https://opennext.js.org/cloudflare/caching).
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();

// Adaptador que faz o Next.js rodar na Cloudflare (Workers).
//
// O cache incremental NÃO é opcional aqui. Sem ele o Worker re-renderiza a
// página inteira a cada visita, mesmo nas rotas marcadas como estáticas: a home
// chegou a gastar 1168 ms de CPU numa única requisição, contra um teto de 10 ms
// no plano gratuito. Era a origem do erro 1102 ("Worker exceeded resource
// limits") no admin e no checkout.
//
// - incrementalCache: guarda a página já renderizada no KV (NEXT_INC_CACHE_KV).
// - withRegionalCache: mantém uma cópia na borda mais próxima do visitante,
//   evitando ida ao KV a cada acesso. "long-lived" porque as páginas da loja só
//   mudam quando o painel salva algo.
// - tagCache: guarda as tags (NEXT_TAG_CACHE_KV). É o que faz o revalidateTag
//   do painel derrubar a página na hora — sem ele, uma edição só apareceria
//   quando o tempo de revalidação expirasse.
//
// Referência: https://opennext.js.org/cloudflare/caching
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import kvTagCache from "@opennextjs/cloudflare/overrides/tag-cache/kv-next-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(kvIncrementalCache, { mode: "long-lived" }),
  tagCache: kvTagCache,
  // Entrega a página cacheada ANTES de subir o servidor Next inteiro. É o que
  // separa um acerto de cache de 10 ms de um de 200 ms. Só pode ficar ligado
  // porque este projeto não usa PPR (conferido em next.config.ts).
  enableCacheInterception: true,
});

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Saída do build para a Cloudflare (opennextjs + wrangler). São ~70MB de
    // bundle gerado, incluindo um worker.js de 13MB: sem isto o `npm run lint`
    // tenta parsear tudo e morre sem memória (exit 134). Só aparecem depois do
    // primeiro `cf:build`, por isso passou despercebido até agora.
    ".open-next/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;

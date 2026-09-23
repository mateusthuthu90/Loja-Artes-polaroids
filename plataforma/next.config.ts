import type { NextConfig } from "next";

// Fotos enviadas pelo painel ficam no Storage do Supabase, em buckets públicos:
// "produtos" (fotos de produto) e "site" (banners da home).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Permite abrir o servidor de desenvolvimento pelo celular na mesma rede Wi-Fi
  // (ex.: http://192.168.31.108:3000). Só vale no `npm run dev`.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;

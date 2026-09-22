import type { Metadata } from "next";
import Image from "next/image";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = {
  title: "Entrar no painel",
  robots: { index: false, follow: false },
};

export default async function PaginaLogin({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const proximo = typeof params.next === "string" ? params.next : "/admin";
  const semAcesso = params.erro === "sem-acesso";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-grande border border-borda bg-cartao p-7 shadow-media">
        <Image
          src="/images/brand/logo.png"
          alt="Artes Polaroids"
          width={180}
          height={72}
          className="mx-auto mb-4 h-16 w-auto object-contain"
          priority
        />
        <h1 className="text-center text-2xl font-semibold">Painel da loja</h1>
        <p className="mb-6 mt-1 text-center text-sm text-texto-suave">Acesso restrito</p>
        {semAcesso && (
          <p className="mb-4 rounded-xl bg-perigo/10 px-3 py-2 text-sm text-perigo">
            Este usuário não tem acesso ao painel.
          </p>
        )}
        <FormLogin proximo={proximo} />
      </div>
    </main>
  );
}

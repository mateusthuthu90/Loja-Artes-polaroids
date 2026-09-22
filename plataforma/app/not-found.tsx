import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="mb-3 text-5xl" aria-hidden>📷</p>
      <h1 className="text-3xl font-semibold">Essa página não foi revelada</h1>
      <p className="mb-8 mt-2 text-texto-suave">O produto pode ter saído da vitrine ou o link está incompleto.</p>
      <Link
        href="/produtos"
        className="rounded-full bg-marrom px-7 py-3.5 font-semibold text-creme-claro hover:bg-texto"
      >
        Ver produtos
      </Link>
    </main>
  );
}

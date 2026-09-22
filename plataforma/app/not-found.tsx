import Link from "next/link";
import { Icone } from "@/components/Icone";

export default function NaoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Icone nome="camera" className="mb-3 h-12 w-12 text-terracota" />
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

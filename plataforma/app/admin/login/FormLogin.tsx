"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "../acoes";

const campo =
  "w-full rounded-xl border-[1.5px] border-borda bg-white px-4 py-3 text-base outline-none transition focus:border-terracota";

export function FormLogin({ proximo }: { proximo: string }) {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, { erro: null, email: "" });

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="next" value={proximo} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">E-mail</span>
        <input name="email" type="email" autoComplete="username" required defaultValue={estado.email} className={campo} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Senha</span>
        <input name="senha" type="password" autoComplete="current-password" required className={campo} />
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-xl bg-perigo/10 px-3 py-2 text-sm text-perigo">
          {estado.erro}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-full bg-marrom px-7 py-3.5 font-semibold text-creme-claro transition hover:bg-texto disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

import type { ReactNode } from "react";

export function EmBreve({ etapa, children }: { etapa: string; children: ReactNode }) {
  return (
    <div className="mt-6 rounded-card border border-dashed border-borda bg-creme-claro p-4 text-sm text-texto-suave">
      <span className="mr-2 rounded-full bg-dourado-claro px-2 py-0.5 text-xs font-bold text-marrom">Em breve · {etapa}</span>
      {children}
    </div>
  );
}

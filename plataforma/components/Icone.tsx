import type { SVGProps } from "react";

// Ícones de linha usados na loja e no painel — nada de emoji.
// Todos herdam a cor do texto (currentColor) e o mesmo traço fino da marca.
const CAMINHOS = {
  relogio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  caminhao: (
    <>
      <rect x="1" y="6" width="14" height="11" rx="1.5" />
      <path d="M15 10h4l3 3v4h-7z" />
      <circle cx="6" cy="18.5" r="1.8" />
      <circle cx="18" cy="18.5" r="1.8" />
    </>
  ),
  coracao: <path d="M20.8 5.6a5 5 0 0 0-7.1 0l-1.7 1.7-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.7 8.8-8.7a5 5 0 0 0 0-7.1z" />,
  camera: (
    <>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.8-3h6.4L17 7h3a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="3.6" />
    </>
  ),
  sacola: (
    <>
      <path d="M5 7h14l-1.2 14H6.2z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </>
  ),
  caixa: (
    <>
      <path d="M3 8.5L12 4l9 4.5v7L12 20l-9-4.5z" />
      <path d="M3 8.5L12 13l9-4.5" />
      <path d="M12 13v7" />
    </>
  ),
  documento: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </>
  ),
  estrela: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  casa: (
    <>
      <path d="M4 10.5L12 4l8 6.5" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  girar: (
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4h-4" />
    </>
  ),
  tesoura: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <path d="M8 7.5L20 18M20 6L8 16.5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  confirmado: <path d="M4 12.5l5 5L20 6.5" />,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  seta: <path d="M9 5l7 7-7 7" />,
  presente: (
    <>
      <rect x="3" y="9" width="18" height="12" rx="1.5" />
      <path d="M3 13h18M12 9v12" />
      <path d="M12 9S10.5 4 8 4a2.2 2.2 0 0 0 0 5zM12 9s1.5-5 4-5a2.2 2.2 0 0 1 0 5z" />
    </>
  ),
  escudo: <path d="M12 3l8 3v6c0 4.8-3.4 8.3-8 10.5C7.4 20.3 4 16.8 4 12V6z" />,
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

/** Lista para o painel oferecer só ícones que existem de verdade. */
export const NOMES_ICONES = Object.keys(CAMINHOS) as NomeIcone[];

export function iconeValido(nome: string): NomeIcone {
  return (nome in CAMINHOS ? nome : "estrela") as NomeIcone;
}

export function Icone({ nome, className = "h-5 w-5", ...props }: { nome: NomeIcone } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {CAMINHOS[nome]}
    </svg>
  );
}

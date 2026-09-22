// Slides do banner da home.
//
// As fotos do estúdio são verticais/quadradas (nada de landscape), por isso o
// hero não usa imagem sangrada: cada slide monta uma composição de polaroids,
// que é justamente a linguagem da marca.
//
// O slide 1 continua alimentado por `configuracoes.banner_home` no Supabase —
// quem editar o banner pelo banco continua mandando na primeira tela.
import type { ConfigLoja } from "./catalogo";

export interface SlideBanner {
  id: string;
  selo: string;
  titulo: string;
  /** Trecho final do título, destacado em itálico. Pode ficar vazio. */
  destaque: string;
  subtitulo: string;
  /** Legenda manuscrita na borda da polaroid. */
  legenda: string;
  cta: string;
  /** Cor do halo de fundo — muda a temperatura do slide sem sair da paleta. */
  halo: string;
  /** Inclinação da polaroid principal e da de apoio. */
  giro: [string, string];
  imagem: { src: string; alt: string };
  apoio: { src: string; alt: string };
}

const SLIDES: SlideBanner[] = [
  {
    id: "memorias",
    selo: "Lembranças personalizadas",
    titulo: "Suas memórias, reveladas",
    destaque: "com carinho",
    subtitulo:
      "Polaroids, quadros e porta-retratos feitos à mão com as fotos que você não quer esquecer.",
    legenda: "a gente",
    cta: "Escolher meus produtos",
    halo: "rgba(185, 132, 106, 0.26)",
    giro: ["-2.5deg", "7deg"],
    imagem: {
      src: "/images/banners/memorias.jpg",
      alt: "Porta-retrato de madeira com foto de casal, rodeado por polaroids abertas em leque",
    },
    apoio: {
      src: "/images/banners/memorias-apoio.jpg",
      alt: "Capinha de celular com uma polaroid do casal aplicada",
    },
  },
  {
    id: "presente",
    selo: "Presente que emociona",
    titulo: "Um presente que ela vai",
    destaque: "guardar pra sempre",
    subtitulo:
      "Caixas montadas com varal de fotos, quadro e luzinhas — daquelas que fazem chorar na hora de abrir.",
    legenda: "pra você",
    cta: "Montar meu presente",
    halo: "rgba(217, 164, 65, 0.28)",
    giro: ["2deg", "-8deg"],
    imagem: {
      src: "/images/banners/presente.jpg",
      alt: "Caixa presente iluminada com varal de polaroids, quadro e bombons",
    },
    apoio: {
      src: "/images/banners/presente-apoio.jpg",
      alt: "Caixa kraft fechada com laço de fita vermelha",
    },
  },
  {
    id: "colecao",
    selo: "Tem para todo gosto",
    titulo: "Da polaroid ao globo de neve,",
    destaque: "tudo com a sua foto",
    subtitulo:
      "Chaveiros, álbuns, capinhas, quadros e luminárias. Escolha o formato, a gente cuida do resto.",
    legenda: "escolha a sua",
    cta: "Ver a coleção inteira",
    halo: "rgba(92, 69, 52, 0.18)",
    giro: ["-1.5deg", "9deg"],
    imagem: {
      src: "/images/banners/colecao.jpg",
      alt: "Globo de neve iluminado com foto de casal dentro",
    },
    apoio: {
      src: "/images/banners/colecao-apoio.jpg",
      alt: "Kit de chaveiros polaroid com cartão e saquinho de organza",
    },
  },
];

/** O banner do banco manda no primeiro slide; o resto é fixo. */
export function montarSlides(config: ConfigLoja): SlideBanner[] {
  const { titulo, subtitulo } = config.banner_home;
  return SLIDES.map((slide, i) =>
    i === 0
      ? {
          ...slide,
          titulo: titulo?.trim() || slide.titulo,
          // título vindo do banco vem inteiro, sem trecho destacado
          destaque: titulo?.trim() ? "" : slide.destaque,
          subtitulo: subtitulo?.trim() || slide.subtitulo,
        }
      : slide,
  );
}

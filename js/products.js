/* ==========================================================================
   ARTES POLAROIDS — CATÁLOGO DE PRODUTOS (dados mockados)
   Edite os produtos aqui. Quando o backend real existir (Fase 2+),
   este arquivo será substituído por uma chamada de API, mas a estrutura
   dos objetos pode continuar a mesma.
   ========================================================================== */

const PRODUCTS = [
  {
    id: 'kit-10-polaroids',
    category: 'Polaroids',
    name: 'Kit 10 Polaroids',
    shortDesc: 'Suas 10 fotos favoritas reveladas no clássico formato polaroid.',
    fullDesc: 'Um kit compacto e delicado com 10 fotos suas reveladas em papel fosco premium, no tradicional formato polaroid com borda branca. Perfeito para guardar na carteira, montar um mural ou presentear alguém especial.',
    price: 17.00,
    icon: '📷',
    isNew: true,
    options: {
      Formato: ['Retrato', 'Paisagem'],
    },
  },
  {
    id: 'kit-20-polaroids',
    category: 'Polaroids',
    name: 'Kit 20 Polaroids',
    shortDesc: 'O dobro de memórias para reviver quando quiser.',
    fullDesc: 'Kit com 20 fotos reveladas em formato polaroid, papel fosco de alta definição e cores fiéis. Ideal para quem quer contar uma história maior — uma viagem, um relacionamento, um ano inteiro de momentos.',
    price: 32.00,
    icon: '📷',
    isNew: false,
    options: {
      Formato: ['Retrato', 'Paisagem'],
    },
  },
  {
    id: 'kit-50-polaroids',
    category: 'Polaroids',
    name: 'Kit 50 Polaroids',
    shortDesc: 'Para quem tem muitas memórias para guardar.',
    fullDesc: 'O nosso maior kit de polaroids: 50 fotos reveladas com todo o cuidado de sempre. Ótimo para presentear em datas especiais ou criar um mural completo de recordações.',
    price: 75.00,
    icon: '📷',
    isNew: false,
    options: {
      Formato: ['Retrato', 'Paisagem'],
    },
  },
  {
    id: 'quadro-polaroid-mesa',
    category: 'Quadros',
    name: 'Quadro Polaroid de Mesa',
    shortDesc: 'Uma foto seleção, emoldurada com carinho.',
    fullDesc: 'Moldura de mesa em acabamento de madeira, com sua foto favorita revelada no estilo polaroid. Um detalhe simples que transforma qualquer escrivaninha ou estante.',
    price: 34.90,
    icon: '🖼️',
    isNew: false,
    options: {
      Acabamento: ['Madeira clara', 'Madeira escura'],
    },
  },
  {
    id: 'chaveiro-foto',
    category: 'Chaveiros',
    name: 'Chaveiro com Foto',
    shortDesc: 'Leve uma lembrança no bolso todos os dias.',
    fullDesc: 'Chaveiro acrílico resistente, personalizado com a foto que você escolher. Pequeno, durável e cheio de significado.',
    price: 8.50,
    icon: '🔑',
    isNew: false,
    options: {
      Formato: ['Redondo', 'Retangular'],
    },
  },
  {
    id: 'ima-foto',
    category: 'Ímãs',
    name: 'Ímã com Foto',
    shortDesc: 'Sua geladeira mais cheia de memórias.',
    fullDesc: 'Ímã personalizado com a foto que você escolher, em acabamento fosco resistente. Vendido individualmente — combine vários para montar seu mural na geladeira.',
    price: 3.00,
    icon: '🧲',
    isNew: false,
    options: {},
  },
  {
    id: 'scrapbook-memorias',
    category: 'Scrapbook',
    name: 'Scrapbook Memórias',
    shortDesc: 'Um álbum artesanal só seu, para contar sua história.',
    fullDesc: 'Álbum artesanal personalizado, feito à mão com suas fotos, mensagens e pequenos detalhes decorativos. Um presente completo para relacionamentos, aniversários ou datas comemorativas.',
    price: 60.00,
    icon: '📔',
    isNew: true,
    options: {
      Tamanho: ['Pequeno (20 fotos)', 'Médio (35 fotos)', 'Grande (50 fotos)'],
    },
  },
  {
    id: 'globo-foto',
    category: 'Presentes',
    name: 'Globo de Foto Personalizado',
    shortDesc: 'Sua memória favorita, dentro de um globo de vidro.',
    fullDesc: 'Um presente encantador: sua foto favorita dentro de um globo de vidro com base de madeira. Um objeto decorativo que também é uma lembrança para guardar por anos.',
    price: 69.90,
    icon: '🔮',
    isNew: false,
    options: {},
  },
  {
    id: 'caixa-surpresa',
    category: 'Presentes',
    name: 'Caixa Surpresa Personalizada',
    shortDesc: 'Uma caixinha cheia de polaroids e mensagens.',
    fullDesc: 'Caixa temática recheada com polaroids, mensagens surpresa e pequenos mimos. Ideal para presentear em aniversários, aniversários de namoro ou só porque sim.',
    price: 59.90,
    icon: '🎁',
    isNew: false,
    options: {},
  },
];

const CATEGORIES = ['Todos', ...Array.from(new Set(PRODUCTS.map(p => p.category)))];

function findProduct(id){
  return PRODUCTS.find(p => p.id === id);
}

function formatBRL(value){
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

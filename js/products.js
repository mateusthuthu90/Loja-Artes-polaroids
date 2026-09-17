/* ==========================================================================
   ARTES POLAROIDS — CATÁLOGO DE PRODUTOS (dados mockados)
   Edite os produtos aqui. Quando o backend real existir (Fase 2+),
   este arquivo será substituído por uma chamada de API, mas a estrutura
   dos objetos pode continuar a mesma.
   ========================================================================== */

const PRODUCTS = [
  {
    id: 'polaroid-retro',
    category: 'Polaroids',
    name: 'Polaroid Retrô',
    shortDesc: 'Polaroid borda branca 7x8cm. Formato ideal para fotos quadradas.',
    fullDesc: 'Para esse modelo, as fotos deverão estar no formato quadrado. Caso não estejam nesse formato, poderá haver cortes indesejados na hora da produção.\n\nNossas fotos são reveladas em papel fotográfico profissional Fujifilm brilhoso! Elas são à prova d\'água, não amarelam e não desbotam com o tempo!',
    price: 20.00,
    icon: '📷',
    images: ['images/products/polaroid-retro-1.jpg', 'images/products/polaroid-retro-2.jpg'],
    isNew: true,
    tiers: [
      { qty: 10, price: 20.00 },
      { qty: 20, price: 40.00 },
      { qty: 50, price: 90.00 },
      { qty: 100, price: 170.00 },
    ],
    options: {},
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

// Para produtos com preço por quantidade (tiers), mostra o menor preço com "A partir de"
function getDisplayPrice(product){
  if(product.tiers && product.tiers.length){
    const min = Math.min(...product.tiers.map(t => t.price));
    return { label: 'A partir de', value: formatBRL(min) };
  }
  return { label: '', value: formatBRL(product.price) };
}

// Retorna o HTML da miniatura: foto real se existir, senão o emoji/gradiente padrão
function productThumbImg(product){
  if(product.images && product.images[0]){
    return `<img src="${product.images[0]}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;">`;
  }
  return product.icon;
}

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
    id: 'polaroid-classica',
    category: 'Polaroids',
    name: 'Polaroid Clássica',
    shortDesc: 'Polaroid com borda branca um pouco maior. Formato ideal para fotos quadradas.',
    fullDesc: 'Para esse modelo, as fotos deverão estar no formato quadrado. Caso não estejam nesse formato, poderá haver cortes indesejados na hora da produção.\n\nNossas fotos são reveladas em papel fotográfico profissional Fujifilm brilhoso! Elas são à prova d\'água, não amarelam e não desbotam com o tempo!',
    price: 20.00,
    icon: '📷',
    images: ['images/products/polaroid-classica-1.jpg', 'images/products/polaroid-classica-2.jpg'],
    isNew: false,
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
    name: 'Globo de Foto Iluminado',
    shortDesc: 'Sua foto dentro de um globo com LED, tipo luminária.',
    fullDesc: 'Um globo de foto personalizado com iluminação de LED embutida, como uma luminária de mesa. Não é feito de vidro — é resistente e seguro para o dia a dia.\n\nColoque sua foto favorita e ilumine o ambiente com uma lembrança especial.',
    price: 67.90,
    icon: '🔮',
    images: ['images/products/globo-foto-1.jpg', 'images/products/globo-foto-2.jpg'],
    isNew: false,
    options: {},
  },
  {
    id: 'caixa-surpresa',
    category: 'Presentes',
    name: 'Box Amor Para Vida Toda',
    shortDesc: 'Caixa surpresa personalizada com fotos e chaveiros. 10x10x5cm.',
    fullDesc: 'Acompanha 10 fotos reveladas no estilo retrô e 2 chaveirinhos personalizados com as frases "Quero ser seu" e "Por onde for", formando a frase "Quero ser seu par, por onde for".\n\nVem em um saquinho de organza, com enchimento de palha dentro da caixa.\n\nDimensões da caixa: 10x10x5cm de altura.',
    price: 54.90,
    icon: '🎁',
    images: ['images/products/box-amor-1.jpg', 'images/products/box-amor-2.jpg', 'images/products/box-amor-3.jpg'],
    isNew: false,
    options: {},
  },
  {
    id: 'front-page-love',
    category: 'Quadros',
    name: 'Front Page Love',
    shortDesc: 'Quadro & porta-retrato personalizado.',
    fullDesc: 'Um quadro exclusivo inspirado em capas de jornal, criado para eternizar momentos e sentimentos especiais de um jeito criativo e elegante. Perfeito para presentear ou decorar com significado.\n\nAcabamento premium, com vidro de proteção.',
    price: 49.90,
    icon: '🗞️',
    images: ['images/products/front-page-love-1.jpg'],
    isNew: true,
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

// Miniatura usada nos cards de listagem: se o produto tiver 2+ fotos,
// monta duas camadas empilhadas pra trocar a foto no hover (efeito comum em lojas).
function productCardThumbHtml(product){
  if(product.images && product.images.length > 1){
    return `
      <img src="${product.images[0]}" alt="${product.name}" class="thumb-img thumb-img-1">
      <img src="${product.images[1]}" alt="${product.name}" class="thumb-img thumb-img-2">
    `;
  }
  return productThumbImg(product);
}

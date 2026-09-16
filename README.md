# Artes Polaroids — Loja Virtual (Versão Visual / Fase 1)

Este projeto reproduz e evolui a identidade visual aprovada (referência: projeto Lovable "polaroid-precious-moments"), organizada como uma loja completa navegável, com dados mockados — **sem backend real ainda**.

## Estrutura

```
/
├── index.html          → Home (hero, benefícios, produtos em destaque, como funciona, CTA)
├── produtos.html        → Catálogo com filtro por categoria
├── produto.html          → Página individual do produto (?id=slug-do-produto)
├── carrinho.html         → Carrinho com cupom e frete mockados
├── checkout.html         → Checkout visual (Pix / Cartão) — não processa pagamento real
├── confirmacao.html      → Tela de pedido confirmado com número e status
├── faq.html               → Perguntas frequentes (accordion)
├── contato.html           → Canais de contato + formulário demonstrativo
├── css/
│   └── style.css          → TODO o design system: cores, fontes, espaçamentos, componentes
├── js/
│   ├── products.js        → Catálogo de produtos (EDITE AQUI para trocar produtos/preços)
│   ├── cart.js             → Lógica de carrinho (localStorage) — pronta para virar API real
│   └── main.js              → Header, footer, toast, accordion (componentes compartilhados)
└── images/
    ├── products/            → Coloque aqui as fotos reais dos produtos
    ├── hero/                → Imagens da seção principal da home
    ├── gallery/             → Fotos de galeria das páginas de produto
    └── brand/                → Logo e identidade visual
```

## Como editar o catálogo
Abra `js/products.js` e edite o array `PRODUCTS`. Cada produto tem:
- `id` (usado na URL, ex: produto.html?id=kit-10-polaroids)
- `category`, `name`, `shortDesc`, `fullDesc`, `price`
- `icon` (emoji temporário — trocar por imagem real depois)
- `options` (variações como Formato, Tamanho, etc.)

## Como trocar a identidade visual
Tudo está centralizado em `css/style.css`, na seção `:root` no topo do arquivo — cores, fontes, raio de borda, sombras e espaçamentos. Mudando ali, o site inteiro se atualiza.

## O que é só visual por enquanto (mockado)
- Cupom de desconto (`js/cart.js` → `MOCK_COUPONS`) — códigos de teste: `MEMORIA10` (10%) e `BEMVINDO5` (5%)
- Frete (`getMockShipping`) — grátis acima de R$100, senão R$14,90 fixo
- Checkout — não conecta a nenhum gateway de pagamento ainda
- "Personalizar minhas fotos" — botão desabilitado, preparado para a Fase 10
- Formulário de contato — só mostra uma confirmação visual

## Próximas fases (conforme planejado)
1. Produtos reais + carrinho (ligado a backend)
2. Upload de fotos
3. Supabase Storage + banco de dados
4. Mercado Pago (pagamento real)
5. Painel administrativo
6. Sistema de pedidos
7. Cupons e promoções reais
8. Editor de fotos
9. Pré-visualização dos produtos personalizados

Este projeto foi estruturado em componentes e dados separados exatamente para que essas fases futuras substituam apenas partes específicas (ex: `js/products.js` vira uma chamada de API) sem precisar redesenhar as telas.

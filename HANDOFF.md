# HANDOFF — Loja Artes Polaroids

Documento de transição para continuar este projeto em outra máquina.

## Links importantes
- **Repositório GitHub**: https://github.com/mateusthuthu90/Loja-Artes-polaroids
- **Site publicado (Vercel)**: https://loja-artes-polaroids.vercel.app
- **Deploy automático**: já configurado — todo `git push` na branch `main` publica sozinho na Vercel em ~1-2 minutos.

## Stack e arquitetura
- Site estático: HTML + CSS + JavaScript puro (sem framework, sem build step).
- Sem backend ainda — tudo roda no navegador. Carrinho, cupom, frete e pedido usam `localStorage`.
- Hospedagem: Vercel, conectada diretamente ao repositório GitHub (push → deploy automático).
- Fluxo de trabalho usado até aqui: pedir mudança → editar arquivos → `git commit` + `git push` (com um Personal Access Token do GitHub, formato `ghp_...`, permissão `repo`) → Vercel publica sozinha.

## Estrutura de pastas
```
/
├── index.html          → Home (hero, benefícios, produtos em destaque, como funciona, CTA)
├── produtos.html        → Catálogo com filtro por categoria (aceita ?cat=NomeDaCategoria na URL)
├── produto.html          → Página individual do produto (?id=slug-do-produto)
├── carrinho.html         → Carrinho com cupom, frete/retirada e resumo
├── checkout.html         → Checkout visual (Pix / Cartão) — NÃO processa pagamento real ainda
├── confirmacao.html      → Tela de pedido confirmado com número e status
├── faq.html               → Perguntas frequentes (accordion)
├── contato.html           → Canais de contato (WhatsApp, Instagram, e-mail — todos clicáveis)
├── css/
│   └── style.css          → Design system inteiro: cores, fontes, espaçamentos, todos os componentes
├── js/
│   ├── products.js        → Catálogo de produtos (fonte da verdade dos preços e descrições)
│   ├── cart.js             → Lógica de carrinho, frete/retirada, cupom (tudo via localStorage)
│   └── main.js              → Header (com menu suspenso de categorias), footer, toast, accordion, modal de compra
└── images/
    ├── products/            → Fotos reais dos produtos já usadas no site
    ├── hero/                → Foto principal da home
    ├── gallery/              → (ainda vazia, reservada pra uso futuro)
    └── brand/                → Logo oficial (logo.png)
```

## O que já está pronto

### Visual e identidade
- Paleta de cores, tipografia (Playfair Display + Inter) e componentes seguindo a referência visual aprovada (tons creme/terracota/marrom).
- Logo oficial da Artes Polaroids no header e rodapé, em formato circular.
- Foto real das polaroids no hero da home.
- Rodapé com fundo claro (não mais escuro), consistente com o resto do site.
- Seção de benefícios com ícones outline (não emojis), posicionada perto do rodapé.
- Menu "Produtos" com dropdown ao passar o mouse, mostrando as categorias (com delay de 400ms antes de fechar, pra não sumir cedo demais).

### Catálogo (js/products.js) — 9 produtos:
1. **Polaroid Retrô** — preço por quantidade (10un R$20 / 20un R$40 / 50un R$90 / 100un R$170), fotos reais
2. **Polaroid Clássica** — mesma lógica de preços, borda um pouco maior, fotos reais
3. **Quadro Polaroid de Mesa** — R$34,90
4. **Front Page Love** (quadro inspirado em jornal) — R$49,90, acabamento premium com vidro, foto real
5. **Chaveiro com Foto** — R$8,50
6. **Ímã com Foto** — R$3,00
7. **Scrapbook Memórias** — R$60,00
8. **Globo de Foto Iluminado** (LED, não é vidro) — R$67,90, fotos reais
9. **Box Amor Para Vida Toda** (caixa surpresa com 10 polaroids + 2 chaveiros + organza) — R$54,90, fotos reais

### Funcionalidades
- **Carrinho**: adicionar/remover, alterar quantidade, cupom mockado (`MEMORIA10` = 10%, `BEMVINDO5` = 5%), auto-limpeza de itens de produtos removidos do catálogo (evita bug de contagem errada).
- **Preço por quantidade (tiers)**: produtos como as Polaroids guardam um `unitPrice` específico por item no carrinho (não usam só o `price` fixo do catálogo) — ver `getItemUnitPrice()` em `cart.js`.
- **Entrega**: escolha entre "Retirar na loja" (grátis) ou "Enviar pelo Correios" com cálculo de frete **mockado** a partir do CEP (determinístico, não é API real dos Correios ainda — ver `calculateShippingFee()` em `cart.js`). Frete grátis automático acima de R$100.
- **Compra**: botão "Comprar" nos cards.
  - Produto sem variação → abre mini modal "Adicionar ao carrinho?" com opções "Adicionar ao carrinho" / "Continuar comprando".
  - Produto com tiers (quantidade) → leva direto pra página do produto pra escolher a quantidade primeiro.
  - Na página do produto, depois de comprar, abre modal "Adicionado ao carrinho!" com "Ir para o carrinho" / "Continuar comprando".
- **Hover nos cards**: produtos com 2+ fotos trocam de imagem ao passar o mouse (crossfade suave).
- **Checkout**: formulário de endereço, seleção visual Pix/Cartão (não processa nada ainda), resumo do pedido reflete o frete escolhido no carrinho.
- **Confirmação de pedido**: número de pedido gerado, resumo, botão de WhatsApp com mensagem pré-pronta.
- Contatos reais: WhatsApp `(33) 99803-5543`, Instagram `@artes.polaroids`, e-mail `artes.polaroids1@gmail.com` — todos clicáveis.

## O que falta / próximos passos possíveis
Seguindo o plano de fases original:
1. **Pagamento real** — conectar Mercado Pago (Checkout Pro) de verdade. Já existe uma tentativa anterior desse projeto num repositório separado (`artes-polaroids-site`) com uma Netlify Function pronta pra isso (`create-preference.js`) — pode servir de referência, mas precisa ser adaptada pra esse projeto atual.
2. **Frete real** — trocar `calculateShippingFee()` (mockada) pela API real dos Correios ou de uma transportadora.
3. **Backend/banco de dados** — hoje não existe persistência real de pedidos, só `localStorage` no navegador do cliente. Pedidos não ficam salvos em lugar nenhum acessível pelo dono da loja.
4. **Upload de fotos pelo cliente** — hoje o fluxo é "compra → manda foto pelo WhatsApp". Futuramente dá pra ter upload direto no site.
5. **Painel administrativo** — pra gerenciar pedidos, produtos e estoque sem editar código.
6. **Cupons reais** — hoje são só 2 códigos fixos no código (`MEMORIA10`, `BEMVINDO5`).
7. Mobile: o menu suspenso de categorias (hover) não funciona em toque — no celular, a pessoa já cai direto na página de Produtos e usa os botões de categoria de lá, o que já funciona bem, mas pode ser refinado.

## Decisões técnicas importantes
- **Preço por quantidade sem backend**: cada item do carrinho pode guardar um `unitPrice` próprio (além do `price` do catálogo), pra suportar kits com desconto por quantidade sem precisar de lógica de servidor.
- **Sanitização automática do carrinho**: toda vez que `getCart()` é chamado, ele remove itens cujo produto não existe mais no catálogo — evita bugs quando produtos são renomeados/removidos (já aconteceu uma vez quando consolidamos os kits de polaroid).
- **Imagens**: todas otimizadas (redimensionadas + comprimidas) antes de entrar no repositório, pra não pesar o carregamento do site. Ao adicionar novas fotos de produto, vale manter esse cuidado (idealmente < 300KB cada, lado maior ~1000-1200px).
- **Sem framework**: decisão consciente de manter tudo em HTML/CSS/JS puro, já que o site ainda está na fase de validação visual/funcional. Se o projeto crescer muito (painel admin, backend robusto), pode valer migrar pra algo como Next.js — mas isso é uma decisão futura, não tomada ainda.

## Como rodar o projeto localmente
Não precisa de instalação nem build:
1. Baixe/clone a pasta do projeto.
2. Abra `index.html` diretamente no navegador, ou
3. Rode um servidor local simples (recomendado, evita problemas de CORS com fetch/localStorage em alguns navegadores):
   ```bash
   cd caminho/do/projeto
   python3 -m http.server 8000
   ```
   Depois acesse `http://localhost:8000` no navegador.

## Como continuar o deploy automático
O repositório já está conectado à Vercel. Pra continuar publicando:
```bash
git add -A
git commit -m "sua mensagem"
git push origin main
```
Isso requer um Personal Access Token do GitHub (`ghp_...`) com permissão `repo`, configurado como credencial do `git push` (ou salvo num credential helper). O token usado nas sessões anteriores tem validade até **15/12/2026** — depois disso, será preciso gerar um novo em `github.com/settings/tokens`.

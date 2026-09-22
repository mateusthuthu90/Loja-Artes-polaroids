# Artes Polaroids — Plataforma (loja + painel admin)

Nova versão da loja, conforme `../Progama e-commerce/Arquitetura do Projeto/arquitetura-artes-polaroids.md`.
Next.js 16 (App Router) + Tailwind 4 + Supabase + Mercado Pago (Pix).

> O site estático atual (raiz do repositório) **continua no ar** até a Fase 1 ficar pronta.
> Esta pasta não interfere nele.

## Andamento

| Fase / Prompt | Entrega | Status |
|---|---|---|
| Fase 0 · Prompt 1 | Projeto Next.js + Tailwind + clientes Supabase (client/server/admin) + proxy de sessão | ✅ |
| Fase 0 · Prompt 2 | Migration com todas as tabelas, RLS, storage, esteira de status, funções de pagamento/cancelamento + seed com o catálogo real | ✅ |
| Fase 1 · Prompt 3 | Vitrine: home, /produtos, /categoria/[slug], /produto/[slug] (galeria, opções, preço ao vivo, Open Graph) | ✅ |
| Fase 1 · Prompt 4 | Carrinho (Context + localStorage, sincroniza abas, recalcula preço pelo catálogo) | ✅ |
| Fase 1 · Prompt 5 | Checkout parte 1: dados (máscara), entrega (CEP automático via ViaCEP), upload de fotos por item (compressão, URLs assinadas, bucket privado) | ✅ |
| Fase 1 · Prompt 6 | Checkout parte 2: criar pedido + Pix (Mercado Pago) | ⏳ próximo |
| Fase 1 · Prompt 9 | Admin: login (Supabase Auth + tabela admins), proteção de /admin, menu, dashboard com números reais, listas de pedidos/produtos/configurações (leitura) | ✅ |
| Fase 1 · Prompts 7, 8, 10, 11 | Webhook, acompanhamento, CRUD de produtos, gestão de pedidos | — |

## Configurar o Supabase (uma vez, ~15 min)

1. Crie o projeto em [supabase.com](https://supabase.com) (nome: `artes-polaroids`, região São Paulo).
2. **SQL Editor** → cole e rode, nesta ordem:
   1. `supabase/migrations/20260922000001_schema_inicial.sql`
   2. `supabase/seed.sql`
3. **Authentication → Sign In / Providers**: desligue *Allow new users to sign up*.
4. **Authentication → Users → Add user**: crie o seu usuário (e-mail + senha).
   Copie o *User UID* e rode no SQL Editor:
   ```sql
   insert into public.admins (user_id, nome) values ('COLE-O-UID-AQUI', 'Wanderson');
   ```
   (Só quem está na tabela `admins` opera o painel — estar logado não basta.)
5. **Project Settings → API**: copie a URL, a chave `anon` e a `service_role`.
6. Nesta pasta: copie `.env.example` para `.env.local` e preencha.

## Rodar localmente

```bash
cd plataforma
npm install
npm run dev
```

Abra http://localhost:3000 — a página de status mostra se o Supabase está conectado
e lista os produtos publicados vindos do banco.

## Regras que o banco garante sozinho

| Regra | Onde |
|---|---|
| Produto só publica com foto e descrição (1.1) | constraint `produtos_publicado_completo` |
| Preço > 0, estoque nunca negativo (2.3) | checks em `produtos` |
| Pedido é snapshot (3.4) | `pedido_itens.nome_produto` / `preco_unitario` |
| Esteira de status sem pular etapas (3.2) + histórico | trigger `tg_pedidos_status` → `pedido_historico` |
| Pagamento processado uma vez só (webhook duplicado) | função `confirmar_pagamento` |
| Estoque baixa no pagamento (2.2) e volta no cancelamento | `confirmar_pagamento` / `cancelar_pedido` → `estoque_movimentos` |
| Total = subtotal − desconto + frete | constraint `pedidos_total_confere` |
| Pedidos nunca acessíveis ao público | RLS (só admin; cliente via API por código) |
| Fotos dos clientes privadas | bucket `fotos-clientes` (privado, 15 MB, jpg/png/webp/heic) |

## Estrutura

```
app/               páginas (loja em /, admin em /admin — a partir do Prompt 3)
lib/supabase/      client.ts (navegador) · server.ts (server components) · admin.ts (service role, só servidor) · proxy.ts
lib/preco.ts       cálculo de preço/fotos — o MESMO código na tela e no checkout do servidor
lib/types.ts       tipos das tabelas
proxy.ts           renova sessão e bloqueia /admin/* sem login (no Next 16, "middleware" virou "proxy")
supabase/          migrations + seed
public/images/     fotos atuais dos produtos e logo
```

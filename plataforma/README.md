# Artes Polaroids — Plataforma (loja + painel admin)

Nova versão da loja, conforme `../Progama e-commerce/Arquitetura do Projeto/arquitetura-artes-polaroids.md`.
Next.js 16 (App Router) + Tailwind 4 + Supabase + Mercado Pago (Pix).

**No ar:** https://artes-polaroids.mateusthuthu90.workers.dev (Cloudflare Workers)

> O site estático antigo (raiz do repositório) continua publicado em
> `loja-artes-polaroids.pages.dev` até trocarmos o encaminhamento.

## Andamento

| Fase / Prompt | Entrega | Status |
|---|---|---|
| Fase 0 · Prompt 1 | Projeto Next.js + Tailwind + clientes Supabase (client/server/admin) + proxy de sessão | ✅ |
| Fase 0 · Prompt 2 | Migration com todas as tabelas, RLS, storage, esteira de status, funções de pagamento/cancelamento + seed com o catálogo real | ✅ |
| Fase 1 · Prompt 3 | Vitrine: home, /produtos, /categoria/[slug], /produto/[slug] (galeria, opções, preço ao vivo, Open Graph) | ✅ |
| Fase 1 · Prompt 4 | Carrinho (Context + localStorage, sincroniza abas, recalcula preço pelo catálogo) | ✅ |
| Fase 1 · Prompt 5 | Checkout parte 1: dados (máscara), entrega (CEP automático via ViaCEP), upload de fotos por item (compressão, URLs assinadas, bucket privado) | ✅ |
| Fase 1 · Prompt 6 | Checkout parte 2: criar pedido + Pix (Mercado Pago), CPF do pagador, tela do QR Code | ⚠️ escrito, **sem teste real** (falta credencial do MP que consiga cobrar) |
| Fase 1 · Prompt 9 | Admin: login (Supabase Auth + tabela admins), proteção de /admin, menu, dashboard com números reais, listas de pedidos/produtos/configurações (leitura) | ✅ |
| Fase 1 · Prompt 10 | Admin de produtos: criar/editar (fotos com compressão, variações, fotos do cliente, estoque), publicar/despublicar, duplicar, excluir (vira inativo se tiver pedidos), categorias, pré-visualização e log de ações | ✅ |
| Fase 1 · Prompt 7 | Webhook do Mercado Pago: confere a assinatura do aviso, consulta o pagamento na API, confere o valor e confirma o pedido | ⚠️ escrito, **sem teste real** |
| Fase 1 · Prompt 7b | Cartão de crédito com parcelamento (Card Payment Brick; juros do cliente, à vista por conta da loja) | ⚠️ escrito, **sem teste real** |
| Fase 1 · Prompts 8, 11 | Acompanhamento do cliente, gestão de pedidos no painel | — |
| Extra | Descontos: cupons e promoções (painel + loja) | ✅ |
| Extra | Home editável no painel: banners (com upload das fotos), seções de produtos e textos — nada da página inicial é código | ✅ |
| Extra | Publicação na Cloudflare Workers (adaptador OpenNext) | ✅ |

## Continuar em outra máquina

1. `git clone https://github.com/mateusthuthu90/Loja-Artes-polaroids.git`
2. `cd Loja-Artes-polaroids/plataforma` e `npm install`
3. Copie `.env.example` para `.env.local` e preencha o que o arquivo pede — são
   duas famílias de chave:
   - **Supabase** (Project Settings → API): as 3. Sem elas a loja abre vazia.
   - **Mercado Pago** (mercadopago.com.br/developers → sua aplicação →
     Credenciais de **teste**): a `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` e o
     `MERCADOPAGO_ACCESS_TOKEN`; e, na área de Webhooks, a assinatura secreta
     (`MERCADOPAGO_WEBHOOK_SECRET`). Sem a Public Key o formulário de cartão não
     abre; sem o Access Token nenhuma cobrança é criada; sem a assinatura
     secreta o site recusa os avisos de pagamento e o pedido pago nunca é
     confirmado.

   Confira o **final do Access Token**: ele termina no número da conta dona
   dele. Se esse número for de um usuário de teste do Mercado Pago (aquelas
   contas `TESTUSER...`), toda cobrança volta com
   `401 Unauthorized use of live credentials` — as credenciais precisam ser da
   aplicação criada na conta real da loja.
4. `npm run dev` → http://localhost:3000

Para publicar a partir dessa máquina, também é preciso `npx wrangler login`
(conta Cloudflare) — ver a seção abaixo.

## Publicar (Cloudflare Workers)

A loja roda em Workers pelo adaptador [OpenNext](https://opennext.js.org/cloudflare).

```bash
npx wrangler login          # uma vez por máquina
npm run cf:build            # gera a versão Cloudflare em .open-next/
npx wrangler deploy         # publica
```

- Configuração do Worker: `wrangler.jsonc` (nome `artes-polaroids`, binding de
  imagens e dos arquivos estáticos) e `open-next.config.ts`.
- `npm run cf:preview` roda a versão Cloudflare localmente. Para isso, crie um
  arquivo `.dev.vars` com a linha `SUPABASE_SERVICE_ROLE_KEY=...` (fica fora do git).
- A chave secreta em produção fica guardada na Cloudflare, e é ela que vale em
  runtime: as variáveis do Worker sobrescrevem qualquer valor embutido no build.
  Só que o `npm run cf:build` copia o `.env.local` para dentro do bundle como
  reserva — então a chave viaja junto no artefato publicado. Para trocá-la:
  `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` e publique de novo, para o
  bundle deixar de carregar a cópia antiga.
- `.env.production` guarda só o endereço público do site (sem segredo). Quando o
  domínio próprio entrar, troque essa linha e publique de novo.

## Configurar o Supabase (uma vez, ~15 min)

1. Crie o projeto em [supabase.com](https://supabase.com) (nome: `artes-polaroids`, região São Paulo).
2. **SQL Editor** → cole e rode, nesta ordem (a ordem não é a numérica; veja o porquê abaixo):
   1. `supabase/migrations/20260922000001_schema_inicial.sql`
   2. `supabase/migrations/20260922000002_descontos.sql`
   3. `supabase/migrations/20260923000004_pagamento_cartao.sql`
   4. `supabase/seed.sql`
   5. `supabase/migrations/20260922000003_corrige_descricao_config.sql`
   6. `supabase/migrations/20260923000005_home_cms.sql`
   7. `supabase/migrations/20260923000006_banner_full_bleed.sql`

   As três primeiras só criam e alteram tabelas, então vêm antes do seed. A
   quinta **corrige uma linha que o seed cria**, por isso roda depois dele — o
   seed usa `on conflict do nothing` e não se corrige sozinho numa segunda
   passada. A sexta cria a home editável e semeia as seções de categoria,
   então precisa das categorias já criadas pelo seed. A sétima troca o banner
   antigo (composição de polaroids) pelo banner de foto sangrada e semeia os
   quatro slides atuais.
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
lib/home.ts        home montada no painel: banners, seções e o ranking de mais vendidos
lib/home-form.ts   validação da home — a mesma na tela e no servidor
lib/types.ts       tipos das tabelas
proxy.ts           renova sessão e bloqueia /admin/* sem login (no Next 16, "middleware" virou "proxy")
supabase/          migrations + seed
public/images/     fotos atuais dos produtos e logo
```

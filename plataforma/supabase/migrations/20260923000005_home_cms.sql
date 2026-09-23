-- =============================================================================
-- CMS da home: banners, seções e textos editáveis pelo painel
--
-- Antes desta migration a home era código: os slides do banner viviam em
-- lib/banners.ts e as seções (destaques, como funciona, benefícios) estavam
-- escritas direto no JSX. Toda mudança exigia deploy.
--
-- Agora:
--   home_banners  → slides do hero (imagem, textos, ordem, ativo)
--   home_secoes   → faixas de produtos da home (fonte configurável)
--   configuracoes.home_textos → textos das seções fixas
--   bucket "site" → imagens editoriais (banners), públicas, escrita só admin
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Banners do hero
-- -----------------------------------------------------------------------------
create table public.home_banners (
  id             uuid primary key default gen_random_uuid(),
  selo           text not null default ''  check (length(selo) <= 60),
  titulo         text not null             check (length(trim(titulo)) between 1 and 120),
  -- trecho final do título, exibido em itálico destacado
  destaque       text not null default ''  check (length(destaque) <= 60),
  subtitulo      text not null default ''  check (length(subtitulo) <= 300),
  -- legenda manuscrita na borda da polaroid
  legenda        text not null default ''  check (length(legenda) <= 40),
  cta_texto      text not null default 'Ver produtos' check (length(cta_texto) between 1 and 40),
  cta_link       text not null default '/produtos'    check (cta_link ~ '^(/|https?://|#)'),
  imagem         text not null             check (length(imagem) > 0),
  imagem_alt     text not null default ''  check (length(imagem_alt) <= 200),
  -- polaroid menor de apoio; opcional (null = slide com uma foto só)
  apoio          text,
  apoio_alt      text not null default ''  check (length(apoio_alt) <= 200),
  -- cor do halo de fundo: muda a temperatura do slide sem sair da paleta
  halo           text not null default 'rgba(185, 132, 106, 0.26)' check (length(halo) <= 60),
  giro_principal numeric(4, 1) not null default -2.5 check (giro_principal between -15 and 15),
  giro_apoio     numeric(4, 1) not null default 7    check (giro_apoio between -15 and 15),
  ordem          int not null default 0,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create index home_banners_vitrine_idx on public.home_banners (ativo, ordem);

create trigger home_banners_atualizado_em
  before update on public.home_banners
  for each row execute function public.tg_set_atualizado_em();

-- -----------------------------------------------------------------------------
-- Seções de produtos da home
--
-- `fonte` decide quais produtos entram na faixa:
--   destaques     → produtos marcados como destaque
--   novidades     → produtos marcados como novo
--   promocao      → produtos com promoção vigente
--   mais_vendidos → calculado a partir dos pedidos pagos
--   categoria     → todos os produtos de uma categoria
--   manual        → a lista escolhida a dedo, na ordem escolhida
-- -----------------------------------------------------------------------------
create table public.home_secoes (
  id            uuid primary key default gen_random_uuid(),
  selo          text not null default '' check (length(selo) <= 60),
  titulo        text not null            check (length(trim(titulo)) between 1 and 80),
  subtitulo     text not null default '' check (length(subtitulo) <= 300),
  fonte         text not null
                  check (fonte in ('destaques', 'novidades', 'promocao',
                                   'mais_vendidos', 'categoria', 'manual')),
  categoria_id  uuid references public.categorias (id) on delete set null,
  produto_ids   uuid[] not null default '{}'::uuid[]
                  check (array_length(produto_ids, 1) is null or array_length(produto_ids, 1) <= 24),
  limite        int not null default 8 check (limite between 2 and 24),
  layout        text not null default 'grade'  check (layout in ('grade', 'carrossel')),
  fundo         text not null default 'claro'  check (fundo in ('claro', 'branco')),
  link_texto    text not null default ''       check (length(link_texto) <= 40),
  link_href     text not null default ''       check (link_href = '' or link_href ~ '^(/|https?://|#)'),
  ordem         int not null default 0,
  ativa         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- seção de categoria sem categoria escolhida ficaria vazia para sempre
  constraint home_secoes_categoria_exige_alvo
    check (fonte <> 'categoria' or categoria_id is not null),
  constraint home_secoes_manual_exige_produtos
    check (fonte <> 'manual' or array_length(produto_ids, 1) >= 1)
);

create index home_secoes_vitrine_idx on public.home_secoes (ativa, ordem);

create trigger home_secoes_atualizado_em
  before update on public.home_secoes
  for each row execute function public.tg_set_atualizado_em();

-- -----------------------------------------------------------------------------
-- Mais vendidos
--
-- pedido_itens é fechado ao público (RLS). Esta função agrega apenas
-- produto + unidades — nenhum dado de cliente sai daqui — e por isso pode ser
-- security definer e ficar acessível ao catálogo anônimo.
-- -----------------------------------------------------------------------------
create or replace function public.produtos_mais_vendidos(limite int default 8)
returns table (produto_id uuid, unidades bigint)
language sql
stable
security definer
set search_path = public
as $$
  select i.produto_id, sum(i.quantidade)::bigint as unidades
    from public.pedido_itens i
    join public.pedidos p on p.id = i.pedido_id
   where p.status in ('pago', 'em_producao', 'enviado', 'pronto_retirada', 'concluido')
     and p.criado_em > now() - interval '180 days'
   group by i.produto_id
   order by unidades desc, i.produto_id
   limit greatest(1, least(coalesce(limite, 8), 24));
$$;

grant execute on function public.produtos_mais_vendidos(int) to anon, authenticated;

-- =============================================================================
-- RLS — mesma regra do catálogo: público lê o que está no ar, admin gerencia
-- =============================================================================
alter table public.home_banners enable row level security;
alter table public.home_secoes  enable row level security;

create policy "home_banners: público lê ativos" on public.home_banners
  for select to anon, authenticated using (ativo);
create policy "home_banners: admin gerencia" on public.home_banners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "home_secoes: público lê ativas" on public.home_secoes
  for select to anon, authenticated using (ativa);
create policy "home_secoes: admin gerencia" on public.home_secoes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Storage: bucket "site" para imagens editoriais (banners)
-- Separado de "produtos" para que limpar um não afete o outro.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site', 'site', true, 5 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "storage site: admin envia" on storage.objects
  for insert to authenticated with check (bucket_id = 'site' and public.is_admin());
create policy "storage site: admin altera" on storage.objects
  for update to authenticated using (bucket_id = 'site' and public.is_admin());
create policy "storage site: admin apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'site' and public.is_admin());

-- =============================================================================
-- Conteúdo inicial — o que já estava no código vira dado editável
-- =============================================================================
insert into public.home_banners
  (selo, titulo, destaque, subtitulo, legenda, cta_texto, cta_link,
   imagem, imagem_alt, apoio, apoio_alt, halo, giro_principal, giro_apoio, ordem)
values
  ('Lembranças personalizadas', 'Suas memórias, reveladas', 'com carinho',
   'Polaroids, quadros e porta-retratos feitos à mão com as fotos que você não quer esquecer.',
   'a gente', 'Escolher meus produtos', '/produtos',
   '/images/banners/memorias.jpg',
   'Porta-retrato de madeira com foto de casal, rodeado por polaroids abertas em leque',
   '/images/banners/memorias-apoio.jpg',
   'Capinha de celular com uma polaroid do casal aplicada',
   'rgba(185, 132, 106, 0.26)', -2.5, 7, 1),

  ('Presente que emociona', 'Um presente que ela vai', 'guardar pra sempre',
   'Caixas montadas com varal de fotos, quadro e luzinhas — daquelas que fazem chorar na hora de abrir.',
   'pra você', 'Montar meu presente', '/produtos',
   '/images/banners/presente.jpg',
   'Caixa presente iluminada com varal de polaroids, quadro e bombons',
   '/images/banners/presente-apoio.jpg',
   'Caixa kraft fechada com laço de fita vermelha',
   'rgba(217, 164, 65, 0.28)', 2, -8, 2),

  ('Tem para todo gosto', 'Da polaroid ao globo de neve,', 'tudo com a sua foto',
   'Chaveiros, álbuns, capinhas, quadros e luminárias. Escolha o formato, a gente cuida do resto.',
   'escolha a sua', 'Ver a coleção inteira', '/produtos',
   '/images/banners/colecao.jpg',
   'Globo de neve iluminado com foto de casal dentro',
   '/images/banners/colecao-apoio.jpg',
   'Kit de chaveiros polaroid com cartão e saquinho de organza',
   'rgba(92, 69, 52, 0.18)', -1.5, 9, 3);

-- Seções que não dependem de categoria
insert into public.home_secoes
  (selo, titulo, subtitulo, fonte, limite, layout, fundo, link_texto, link_href, ordem)
values
  ('Nossa coleção', 'Escolha sua lembrança',
   'Cada peça é produzida com as suas fotos e muito cuidado.',
   'destaques', 8, 'grade', 'claro', 'Ver todos os produtos', '/produtos', 1),

  ('Oferta por tempo limitado', 'Promoções da semana',
   'Aproveite enquanto o desconto está de pé.',
   'promocao', 8, 'carrossel', 'branco', '', '', 3),

  ('Acabou de chegar', 'Novidades',
   'As últimas peças que entraram no ateliê.',
   'novidades', 8, 'carrossel', 'claro', '', '', 4),

  ('Preferidos da galera', 'Mais vendidos',
   'O que mais sai daqui — e volta em forma de foto no story.',
   'mais_vendidos', 8, 'carrossel', 'branco', '', '', 5);

-- Seções de categoria: só entram se a categoria existir neste banco
insert into public.home_secoes
  (selo, titulo, subtitulo, fonte, categoria_id, limite, layout, fundo, link_texto, link_href, ordem)
select 'Clássico da casa', 'Polaroids',
       'O formato que deu nome à loja, em todas as quantidades.',
       'categoria', c.id, 8, 'carrossel', 'branco', 'Ver todas as polaroids', '/categoria/polaroids', 2
  from public.categorias c where c.slug = 'polaroids';

insert into public.home_secoes
  (selo, titulo, subtitulo, fonte, categoria_id, limite, layout, fundo, link_texto, link_href, ordem)
select 'Para dar de presente', 'Presentes',
       'Kits e caixas prontos para entregar na mão de quem você ama.',
       'categoria', c.id, 8, 'carrossel', 'claro', 'Ver todos os presentes', '/categoria/presentes', 6
  from public.categorias c where c.slug = 'presentes';

-- Textos das seções fixas (como funciona, chamada final, benefícios)
insert into public.configuracoes (chave, valor, publica, descricao) values
  ('home_textos',
   $json${
      "categorias": {"ativo": true},
      "como_funciona": {
        "ativo": true,
        "selo": "Simples assim",
        "titulo": "Como funciona",
        "subtitulo": "Do clique de \"comprar\" até a lembrança na sua mão, sem complicação.",
        "passos": [
          {"titulo": "Escolha seus produtos", "texto": "Navegue pela coleção e monte seu pedido do jeitinho que quiser."},
          {"titulo": "Envie suas fotos", "texto": "Ao finalizar o pedido, você sobe as fotos direto aqui no site. Sem bagunça no WhatsApp."},
          {"titulo": "Pague com Pix", "texto": "O pagamento é confirmado na hora e o seu pedido já entra na nossa fila de produção."},
          {"titulo": "Receba suas lembranças", "texto": "Produzimos tudo à mão e enviamos com carinho, ou você retira com a gente."}
        ]
      },
      "chamada": {
        "ativo": true,
        "titulo": "Pronto para eternizar seus momentos?",
        "texto": "Escolha sua lembrança favorita e receba com todo o cuidado que suas memórias merecem.",
        "botao": "Começar meu pedido",
        "link": "/produtos"
      },
      "beneficios": {
        "ativo": true,
        "itens": [
          {"icone": "camera",   "titulo": "Qualidade premium",           "texto": "Papel fotográfico profissional Fujifilm: à prova d'água, não amarela e não desbota."},
          {"icone": "caminhao", "titulo": "Enviamos para todo o Brasil", "texto": "Envio com código de rastreio, ou retirada com a gente."},
          {"icone": "coracao",  "titulo": "Feito com carinho",           "texto": "Cada peça é produzida artesanalmente, com atenção aos detalhes."},
          {"icone": "escudo",   "titulo": "Pagamento seguro",            "texto": "Pix com confirmação automática, processado pelo Mercado Pago."}
        ]
      }
    }$json$::jsonb,
   true,
   'Textos das seções fixas da home (como funciona, chamada final, benefícios)')
on conflict (chave) do nothing;

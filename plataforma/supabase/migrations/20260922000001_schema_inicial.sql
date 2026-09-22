-- =============================================================================
-- Artes Polaroids — schema inicial
-- Fonte: arquitetura-artes-polaroids.md (seção 4) + regras-negocio.md + prevencao-erros.md
--
-- Princípios aplicados aqui NO BANCO (não só na tela), para que nenhum caminho
-- — painel, API ou erro humano — consiga quebrar a regra:
--   • Produto só vai ao ar completo (rascunho → publicado)            [prev. erros §1-2]
--   • Pedido é snapshot: mudar o catálogo não muda pedido antigo        [regra 1.5, 3.4]
--   • Status só anda na ordem da esteira e todo passo fica no histórico [regra 3.2]
--   • Estoque nunca negativo; baixa só no pagamento, uma única vez     [regra 2.2, 2.3]
--   • RLS em TODAS as tabelas; pedidos nunca acessíveis ao público     [arquitetura §4, §8]
--   • Ações do admin registradas (quem, quando)                        [regra 8.2]
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilitário: atualizado_em automático
-- -----------------------------------------------------------------------------
create or replace function public.tg_set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admins: quem pode operar o painel.
-- Não basta estar logado no Supabase Auth — o usuário precisa estar nesta lista.
-- (Protege o caso de alguém conseguir criar conta se o signup ficar ligado.)
-- -----------------------------------------------------------------------------
create table public.admins (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  nome      text not null,
  criado_em timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- Categorias
-- -----------------------------------------------------------------------------
create table public.categorias (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (length(trim(nome)) between 1 and 60),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ordem         int  not null default 0,
  ativa         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger categorias_atualizado_em
  before update on public.categorias
  for each row execute function public.tg_set_atualizado_em();

-- -----------------------------------------------------------------------------
-- Produtos
--
-- opcoes (jsonb) — lista de grupos de variação:
--   [{ "nome": "Quantidade",
--      "valores": [ { "label": "10 unidades", "acrescimo": 0,  "fotos": 10 },
--                   { "label": "20 unidades", "acrescimo": 20, "fotos": 20 } ] }]
--   • acrescimo: somado ao preço base (pode ser 0)
--   • fotos (opcional): quantas fotos o cliente envia por unidade quando esse
--     valor é escolhido — sobrepõe min_fotos/max_fotos do produto.
--
-- estoque: null = sob demanda (sem controle de estoque).
-- -----------------------------------------------------------------------------
create table public.produtos (
  id                   uuid primary key default gen_random_uuid(),
  categoria_id         uuid not null references public.categorias (id) on delete restrict,
  nome                 text not null check (length(trim(nome)) between 1 and 80),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  descricao_curta      text not null default '' check (length(descricao_curta) <= 160),
  descricao            text not null default '' check (length(descricao) <= 4000),
  preco                numeric(10, 2) not null check (preco > 0),
  imagens              jsonb not null default '[]'::jsonb check (jsonb_typeof(imagens) = 'array'),
  opcoes               jsonb not null default '[]'::jsonb check (jsonb_typeof(opcoes) = 'array'),
  estoque              int check (estoque is null or estoque >= 0),
  estoque_minimo       int not null default 3 check (estoque_minimo >= 0),
  requer_fotos_cliente boolean not null default false,
  min_fotos            int not null default 0 check (min_fotos >= 0),
  max_fotos            int not null default 0 check (max_fotos >= 0),
  prazo_producao_dias  int check (prazo_producao_dias is null or prazo_producao_dias >= 0),
  destaque             boolean not null default false,
  novo                 boolean not null default false,
  ordem                int not null default 0,
  status               text not null default 'rascunho'
                         check (status in ('rascunho', 'publicado', 'inativo')),
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),

  constraint produtos_faixa_fotos check (max_fotos >= min_fotos),
  constraint produtos_fotos_exigidas check (not requer_fotos_cliente or max_fotos >= 1),
  -- Regra 1.1 / prevenção de erros §1: produto incompleto nunca é publicado.
  constraint produtos_publicado_completo check (
    status <> 'publicado' or (
      jsonb_array_length(imagens) >= 1
      and length(trim(descricao)) >= 1
    )
  )
);

create index produtos_categoria_idx on public.produtos (categoria_id);
create index produtos_status_idx on public.produtos (status);

create trigger produtos_atualizado_em
  before update on public.produtos
  for each row execute function public.tg_set_atualizado_em();

-- -----------------------------------------------------------------------------
-- Pedidos
-- -----------------------------------------------------------------------------
create table public.pedido_contadores (
  ano    int primary key,
  ultimo int not null default 0
);

create table public.pedidos (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique,               -- AP-2026-0001
  cliente_nome        text not null check (length(trim(cliente_nome)) between 2 and 120),
  cliente_whatsapp    text not null check (cliente_whatsapp ~ '^[0-9]{10,13}$'), -- só dígitos
  cliente_email       text check (cliente_email is null or cliente_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  tipo_entrega        text not null check (tipo_entrega in ('retirada', 'envio')),
  endereco            jsonb,                              -- null se retirada
  frete_valor         numeric(10, 2) not null default 0 check (frete_valor >= 0),
  subtotal            numeric(10, 2) not null check (subtotal >= 0),
  desconto            numeric(10, 2) not null default 0 check (desconto >= 0),
  total               numeric(10, 2) not null check (total >= 0),
  status              text not null default 'aguardando_pagamento'
                        check (status in ('aguardando_pagamento', 'pago', 'em_producao',
                                          'enviado', 'pronto_retirada', 'concluido', 'cancelado')),
  mp_payment_id       text unique,
  pix_qrcode          text,
  pix_copia_cola      text,
  pix_expira_em       timestamptz,
  codigo_rastreio     text,
  observacoes_cliente text check (observacoes_cliente is null or length(observacoes_cliente) <= 1000),
  notas_internas      text,
  criado_em           timestamptz not null default now(),
  pago_em             timestamptz,
  cancelado_em        timestamptz,
  atualizado_em       timestamptz not null default now(),

  constraint pedidos_endereco_envio check (tipo_entrega = 'retirada' or endereco is not null),
  constraint pedidos_total_confere check (total = subtotal - desconto + frete_valor)
);

create index pedidos_status_idx on public.pedidos (status, criado_em desc);
create index pedidos_whatsapp_idx on public.pedidos (cliente_whatsapp);

create trigger pedidos_atualizado_em
  before update on public.pedidos
  for each row execute function public.tg_set_atualizado_em();

create table public.pedido_itens (
  id                uuid primary key default gen_random_uuid(),
  pedido_id         uuid not null references public.pedidos (id) on delete cascade,
  produto_id        uuid not null references public.produtos (id) on delete restrict,
  -- snapshot (regra 3.4): se o produto mudar depois, o pedido continua igual
  nome_produto      text not null,
  opcoes_escolhidas jsonb not null default '{}'::jsonb,
  quantidade        int not null check (quantidade > 0),
  preco_unitario    numeric(10, 2) not null check (preco_unitario >= 0),
  fotos_exigidas    int not null default 0 check (fotos_exigidas >= 0)
);

create index pedido_itens_pedido_idx on public.pedido_itens (pedido_id);
create index pedido_itens_produto_idx on public.pedido_itens (produto_id);

-- Fotos amarradas ao ITEM, não ao pedido: nunca imprimir a foto errada (pilar 3).
create table public.pedido_fotos (
  id             uuid primary key default gen_random_uuid(),
  pedido_item_id uuid not null references public.pedido_itens (id) on delete cascade,
  storage_path   text not null unique,
  nome_original  text,
  tamanho_bytes  int,
  criado_em      timestamptz not null default now()
);

create index pedido_fotos_item_idx on public.pedido_fotos (pedido_item_id);

-- Linha do tempo do pedido (alimenta /pedido/[codigo] e a auditoria).
create table public.pedido_historico (
  id          bigint generated always as identity primary key,
  pedido_id   uuid not null references public.pedidos (id) on delete cascade,
  status_de   text,
  status_para text not null,
  autor       text not null,           -- uuid do admin, 'sistema' ou 'mercadopago'
  observacao  text,
  criado_em   timestamptz not null default now()
);

create index pedido_historico_pedido_idx on public.pedido_historico (pedido_id, criado_em);

-- -----------------------------------------------------------------------------
-- Esteira de status (regra 3.2): só estas transições existem.
-- Aplicada por trigger — vale para o painel, API, webhook e SQL manual.
-- -----------------------------------------------------------------------------
create or replace function public.transicao_status_valida(de text, para text)
returns boolean
language sql
immutable
as $$
  select (de, para) in (
    ('aguardando_pagamento', 'pago'),
    ('aguardando_pagamento', 'cancelado'),
    ('pago',                 'em_producao'),
    ('pago',                 'cancelado'),
    ('em_producao',          'enviado'),
    ('em_producao',          'pronto_retirada'),
    ('em_producao',          'cancelado'),
    ('enviado',              'concluido'),
    ('pronto_retirada',      'concluido')
  );
$$;

create or replace function public.tg_pedidos_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_autor text := coalesce(
    nullif(current_setting('app.autor', true), ''),
    auth.uid()::text,
    'sistema'
  );
begin
  if tg_op = 'INSERT' then
    if new.status <> 'aguardando_pagamento' then
      raise exception 'Pedido novo deve nascer como aguardando_pagamento (recebido: %)', new.status;
    end if;
    insert into public.pedido_historico (pedido_id, status_de, status_para, autor)
    values (new.id, null, new.status, v_autor);
    return new;
  end if;

  if new.status is distinct from old.status then
    if not public.transicao_status_valida(old.status, new.status) then
      raise exception 'Transição de status inválida: % → %', old.status, new.status
        using errcode = 'check_violation';
    end if;

    if new.status = 'pago' and new.pago_em is null then
      new.pago_em := now();
    end if;
    if new.status = 'cancelado' then
      new.cancelado_em := now();
    end if;

    insert into public.pedido_historico (pedido_id, status_de, status_para, autor)
    values (new.id, old.status, new.status, v_autor);
  end if;

  return new;
end;
$$;

create trigger pedidos_status_insert
  after insert on public.pedidos
  for each row execute function public.tg_pedidos_status();

create trigger pedidos_status_update
  before update of status on public.pedidos
  for each row execute function public.tg_pedidos_status();

-- -----------------------------------------------------------------------------
-- Estoque: movimentos auditáveis (ajuste manual exige motivo)
-- -----------------------------------------------------------------------------
create table public.estoque_movimentos (
  id         bigint generated always as identity primary key,
  produto_id uuid not null references public.produtos (id) on delete cascade,
  delta      int not null check (delta <> 0),
  motivo     text not null check (motivo in ('venda', 'cancelamento', 'reposicao', 'perda', 'correcao')),
  pedido_id  uuid references public.pedidos (id) on delete set null,
  observacao text,
  autor      text not null,
  criado_em  timestamptz not null default now()
);

create index estoque_movimentos_produto_idx on public.estoque_movimentos (produto_id, criado_em desc);

-- -----------------------------------------------------------------------------
-- Configurações (chave-valor editável pelo admin, sem deploy)
-- publica = true → a loja pode ler (nunca guarde segredo aqui)
-- -----------------------------------------------------------------------------
create table public.configuracoes (
  chave         text primary key,
  valor         jsonb not null,
  publica       boolean not null default true,
  descricao     text,
  atualizado_em timestamptz not null default now()
);

create trigger configuracoes_atualizado_em
  before update on public.configuracoes
  for each row execute function public.tg_set_atualizado_em();

-- -----------------------------------------------------------------------------
-- Log de ações do admin (regra 8.2)
-- -----------------------------------------------------------------------------
create table public.log_admin (
  id          bigint generated always as identity primary key,
  usuario_id  uuid,
  acao        text not null,          -- ex.: 'produto.publicar', 'pedido.cancelar', 'estoque.alerta'
  entidade    text not null,          -- 'produto', 'pedido', 'configuracao'...
  entidade_id text,
  detalhes    jsonb not null default '{}'::jsonb,
  criado_em   timestamptz not null default now()
);

create index log_admin_entidade_idx on public.log_admin (entidade, entidade_id, criado_em desc);

-- =============================================================================
-- Funções de negócio (executadas só pelo servidor, com service role)
-- =============================================================================

-- Código humano e sequencial por ano: AP-2026-0001
create or replace function public.gerar_codigo_pedido()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ano int := extract(year from now() at time zone 'America/Sao_Paulo')::int;
  v_seq int;
begin
  insert into public.pedido_contadores as c (ano, ultimo)
  values (v_ano, 1)
  on conflict (ano) do update set ultimo = c.ultimo + 1
  returning ultimo into v_seq;

  return format('AP-%s-%s', v_ano, lpad(v_seq::text, 4, '0'));
end;
$$;

-- Confirma pagamento: idempotente e atômica.
-- Retorna true se ESTA chamada marcou como pago; false se já estava processado.
-- Notificação duplicada do Mercado Pago → segunda chamada retorna false e não faz nada.
create or replace function public.confirmar_pagamento(p_pedido_id uuid, p_mp_payment_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_item   record;
  v_ok     boolean;
begin
  -- trava a linha: duas notificações simultâneas não passam juntas daqui
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;

  if not found then
    raise exception 'Pedido % não encontrado', p_pedido_id;
  end if;

  if v_pedido.status <> 'aguardando_pagamento' then
    return false;
  end if;

  perform set_config('app.autor', 'mercadopago', true);

  update public.pedidos
     set status = 'pago',
         mp_payment_id = coalesce(p_mp_payment_id, mp_payment_id),
         pago_em = now()
   where id = p_pedido_id;

  -- Baixa de estoque só para produtos com estoque controlado (não sob demanda).
  for v_item in
    select i.produto_id, sum(i.quantidade)::int as qtd
      from public.pedido_itens i
      join public.produtos p on p.id = i.produto_id
     where i.pedido_id = p_pedido_id
       and p.estoque is not null
     group by i.produto_id
  loop
    update public.produtos
       set estoque = estoque - v_item.qtd
     where id = v_item.produto_id
       and estoque >= v_item.qtd
    returning true into v_ok;

    if v_ok then
      insert into public.estoque_movimentos (produto_id, delta, motivo, pedido_id, autor)
      values (v_item.produto_id, -v_item.qtd, 'venda', p_pedido_id, 'mercadopago');
    else
      -- O cliente já pagou: não dá para recusar. Estoque não fica negativo (regra 2.3);
      -- o painel recebe um alerta para você resolver com o cliente.
      insert into public.log_admin (acao, entidade, entidade_id, detalhes)
      values ('estoque.insuficiente', 'pedido', p_pedido_id::text,
              jsonb_build_object('produto_id', v_item.produto_id, 'quantidade', v_item.qtd));
    end if;
    v_ok := null;
  end loop;

  return true;
end;
$$;

-- Cancela pedido e devolve estoque se ele já tinha sido baixado (pedido pago).
create or replace function public.cancelar_pedido(p_pedido_id uuid, p_autor text, p_motivo text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_mov    record;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'Pedido % não encontrado', p_pedido_id;
  end if;
  if v_pedido.status = 'cancelado' then
    return false;
  end if;

  perform set_config('app.autor', p_autor, true);

  update public.pedidos set status = 'cancelado' where id = p_pedido_id;

  if p_motivo is not null then
    update public.pedido_historico
       set observacao = p_motivo
     where id = (select max(id) from public.pedido_historico where pedido_id = p_pedido_id);
  end if;

  -- devolve exatamente o que foi baixado por este pedido
  for v_mov in
    select produto_id, -sum(delta)::int as qtd
      from public.estoque_movimentos
     where pedido_id = p_pedido_id and motivo in ('venda', 'cancelamento')
     group by produto_id
    having sum(delta) < 0
  loop
    update public.produtos set estoque = estoque + v_mov.qtd
     where id = v_mov.produto_id and estoque is not null;
    insert into public.estoque_movimentos (produto_id, delta, motivo, pedido_id, autor)
    values (v_mov.produto_id, v_mov.qtd, 'cancelamento', p_pedido_id, p_autor);
  end loop;

  return true;
end;
$$;

-- Funções sensíveis: ninguém além do service role (servidor) executa.
revoke execute on function public.gerar_codigo_pedido() from public, anon, authenticated;
revoke execute on function public.confirmar_pagamento(uuid, text) from public, anon, authenticated;
revoke execute on function public.cancelar_pedido(uuid, text, text) from public, anon, authenticated;
grant execute on function public.gerar_codigo_pedido() to service_role;
grant execute on function public.confirmar_pagamento(uuid, text) to service_role;
grant execute on function public.cancelar_pedido(uuid, text, text) to service_role;

-- =============================================================================
-- RLS — ativado em TODAS as tabelas
-- Service role (API routes do servidor) ignora RLS por padrão.
-- =============================================================================
alter table public.admins             enable row level security;
alter table public.categorias         enable row level security;
alter table public.produtos           enable row level security;
alter table public.pedido_contadores  enable row level security;
alter table public.pedidos            enable row level security;
alter table public.pedido_itens       enable row level security;
alter table public.pedido_fotos       enable row level security;
alter table public.pedido_historico   enable row level security;
alter table public.estoque_movimentos enable row level security;
alter table public.configuracoes      enable row level security;
alter table public.log_admin          enable row level security;

-- admins: cada admin enxerga a lista; ninguém escreve pelo navegador
create policy "admins: admin lê" on public.admins
  for select to authenticated using (public.is_admin());

-- categorias: público lê as ativas; admin faz tudo
create policy "categorias: público lê ativas" on public.categorias
  for select to anon, authenticated using (ativa);
create policy "categorias: admin gerencia" on public.categorias
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- produtos: público lê só publicados; admin faz tudo
create policy "produtos: público lê publicados" on public.produtos
  for select to anon, authenticated using (status = 'publicado');
create policy "produtos: admin gerencia" on public.produtos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- configuracoes: público lê as marcadas como públicas; admin faz tudo
create policy "configuracoes: público lê públicas" on public.configuracoes
  for select to anon, authenticated using (publica);
create policy "configuracoes: admin gerencia" on public.configuracoes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- pedidos e filhos: NENHUM acesso público. Cliente consulta via /api/pedido/[codigo].
-- Admin lê e edita (mudanças de status passam pelo trigger da esteira).
create policy "pedidos: admin lê" on public.pedidos
  for select to authenticated using (public.is_admin());
create policy "pedidos: admin edita" on public.pedidos
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "pedido_itens: admin lê" on public.pedido_itens
  for select to authenticated using (public.is_admin());
create policy "pedido_fotos: admin lê" on public.pedido_fotos
  for select to authenticated using (public.is_admin());
create policy "pedido_historico: admin lê" on public.pedido_historico
  for select to authenticated using (public.is_admin());
create policy "estoque_movimentos: admin lê" on public.estoque_movimentos
  for select to authenticated using (public.is_admin());
create policy "log_admin: admin lê" on public.log_admin
  for select to authenticated using (public.is_admin());
-- pedido_contadores: sem policy = ninguém além do service role.

-- =============================================================================
-- Storage
--   produtos        → público (fotos de divulgação), escrita só admin
--   fotos-clientes  → PRIVADO; upload via URL assinada gerada pelo servidor,
--                     admin baixa via URL assinada com expiração
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('produtos', 'produtos', true, 5 * 1024 * 1024,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('fotos-clientes', 'fotos-clientes', false, 15 * 1024 * 1024,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "storage produtos: admin envia" on storage.objects
  for insert to authenticated with check (bucket_id = 'produtos' and public.is_admin());
create policy "storage produtos: admin altera" on storage.objects
  for update to authenticated using (bucket_id = 'produtos' and public.is_admin());
create policy "storage produtos: admin apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'produtos' and public.is_admin());

create policy "storage fotos-clientes: admin lê" on storage.objects
  for select to authenticated using (bucket_id = 'fotos-clientes' and public.is_admin());
create policy "storage fotos-clientes: admin apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos-clientes' and public.is_admin());

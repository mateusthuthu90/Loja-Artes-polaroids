-- =============================================================================
-- Artes Polaroids — cupons e promoções
--
--  • CUPOM: código que o cliente digita no carrinho (MEMORIA10). Desconto no
--    total do pedido ou frete grátis. Nunca é listado publicamente: a loja só
--    consegue validar um código por vez, pelo servidor.
--  • PROMOÇÃO: preço promocional que aparece sozinho na loja ("de R$ 20 por
--    R$ 16"), podendo valer para a loja toda, uma categoria ou produtos.
--
-- Regra comum: o desconto é recalculado no servidor no checkout. Nada do que
-- vem do navegador define preço.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Cupons
-- -----------------------------------------------------------------------------
create table public.cupons (
  id             uuid primary key default gen_random_uuid(),
  codigo         text not null unique check (codigo ~ '^[A-Z0-9]{3,20}$'),
  descricao      text check (descricao is null or length(descricao) <= 160),
  tipo           text not null check (tipo in ('percentual', 'valor', 'frete_gratis')),
  valor          numeric(10, 2) not null default 0 check (valor >= 0),
  minimo_pedido  numeric(10, 2) not null default 0 check (minimo_pedido >= 0),
  inicio         timestamptz,
  fim            timestamptz,
  limite_usos    int check (limite_usos is null or limite_usos > 0),
  usos           int not null default 0 check (usos >= 0),
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  constraint cupons_percentual_valido check (tipo <> 'percentual' or (valor > 0 and valor <= 90)),
  constraint cupons_valor_valido      check (tipo <> 'valor' or valor > 0),
  constraint cupons_periodo           check (fim is null or inicio is null or fim > inicio)
);

create trigger cupons_atualizado_em
  before update on public.cupons
  for each row execute function public.tg_set_atualizado_em();

-- -----------------------------------------------------------------------------
-- Promoções (preço promocional na vitrine)
-- alvos: lista de ids de categoria ou de produto, conforme o escopo
-- -----------------------------------------------------------------------------
create table public.promocoes (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (length(trim(nome)) between 1 and 80),
  selo          text check (selo is null or length(selo) <= 24),  -- ex.: "Dia das Mães"
  tipo          text not null check (tipo in ('percentual', 'valor')),
  valor         numeric(10, 2) not null check (valor > 0),
  escopo        text not null check (escopo in ('loja', 'categoria', 'produto')),
  alvos         jsonb not null default '[]'::jsonb check (jsonb_typeof(alvos) = 'array'),
  inicio        timestamptz,
  fim           timestamptz,
  ativa         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint promocoes_percentual_valido check (tipo <> 'percentual' or valor <= 90),
  constraint promocoes_alvos_necessarios check (escopo = 'loja' or jsonb_array_length(alvos) > 0),
  constraint promocoes_periodo check (fim is null or inicio is null or fim > inicio)
);

create trigger promocoes_atualizado_em
  before update on public.promocoes
  for each row execute function public.tg_set_atualizado_em();

-- -----------------------------------------------------------------------------
-- Uso de cupom por pedido (quem usou o quê) + desconto no pedido
-- -----------------------------------------------------------------------------
alter table public.pedidos add column if not exists cupom_codigo text;
alter table public.pedidos add column if not exists cupom_id uuid references public.cupons (id) on delete set null;

-- Conta um uso do cupom de forma atômica (respeita o limite). Só o servidor executa.
create or replace function public.consumir_cupom(p_cupom_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok int;
begin
  update public.cupons
     set usos = usos + 1
   where id = p_cupom_id
     and ativo
     and (limite_usos is null or usos < limite_usos)
     and (inicio is null or inicio <= now())
     and (fim is null or fim >= now());
  get diagnostics v_ok = row_count;
  return v_ok = 1;
end;
$$;

revoke execute on function public.consumir_cupom(uuid) from public, anon, authenticated;
grant execute on function public.consumir_cupom(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.cupons    enable row level security;
alter table public.promocoes enable row level security;

-- Cupons: NENHUMA leitura pública (ninguém "descobre" cupons pelo site).
-- A loja valida um código por vez, pelo servidor (service role).
create policy "cupons: admin gerencia" on public.cupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Promoções: o público lê as ativas dentro do período (precisa mostrar o preço).
create policy "promocoes: público lê vigentes" on public.promocoes
  for select to anon, authenticated
  using (ativa and (inicio is null or inicio <= now()) and (fim is null or fim >= now()));
create policy "promocoes: admin gerencia" on public.promocoes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

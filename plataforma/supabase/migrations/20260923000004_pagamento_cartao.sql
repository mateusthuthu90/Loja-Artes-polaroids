-- Pagamento com cartão (Prompt 7b)
--
-- Até aqui todo pedido era Pix, então a forma de pagamento era implícita. Com o
-- cartão entrando, o painel precisa distinguir os dois: o dinheiro do Pix cai na
-- hora, o do cartão demora e pode ser contestado. Quem atende o cliente precisa
-- saber qual dos dois está olhando.
--
-- Pedidos antigos viram 'pix' pelo default — era o que de fato eram.

alter table public.pedidos
  add column forma_pagamento text not null default 'pix'
    check (forma_pagamento in ('pix', 'cartao'));

-- Só faz sentido no cartão: no Pix é sempre à vista.
alter table public.pedidos
  add column parcelas int
    check (parcelas is null or parcelas between 1 and 12);

alter table public.pedidos
  add constraint pedidos_parcelas_so_no_cartao
    check (forma_pagamento = 'cartao' or parcelas is null);

comment on column public.pedidos.forma_pagamento is
  'pix | cartao — como o cliente pagou. Pedidos anteriores ao cartão são pix.';
comment on column public.pedidos.parcelas is
  'Número de parcelas do cartão. Null no Pix. Os juros são do cliente, então o valor em pedidos.total é sempre o à vista.';

-- =============================================================================
-- Banner da home: composição de polaroids → foto sangrada
--
-- O hero deixou de montar uma cena de polaroids sobre um fundo colorido e
-- passou a ser uma foto de ponta a ponta, com o título deitado na faixa
-- esquerda e uma frase de apoio no canto inferior direito.
--
-- O que muda aqui:
--   + foco  → qual pedaço da foto precisa sobreviver ao recorte. A mesma foto
--             é cortada em 3,5:1 no desktop e em 4:3 no celular, então sem
--             isto o assunto sai do quadro em uma das duas telas.
--
-- O que NÃO muda: as colunas do banner antigo (selo, destaque, legenda, apoio,
-- apoio_alt, halo, giro_principal, giro_apoio, cta_texto) continuam de pé, com
-- os defaults que já tinham. Ninguém mais lê nem escreve nelas, mas derrubar
-- coluna é irreversível e o texto guardado ali ainda pode ser útil. Se um dia
-- ficar claro que não é, uma migration futura remove.
-- =============================================================================

alter table public.home_banners
  add column if not exists foco text not null default 'centro'
    check (foco in ('topo', 'centro', 'base'));

comment on column public.home_banners.foco is
  'Parte da foto preservada no recorte do banner (vira object-position no CSS).';

-- -----------------------------------------------------------------------------
-- Conteúdo inicial
--
-- Só remove os três banners semeados pela 20260923000005 — reconhecidos pelo
-- caminho da imagem, que só o seed usa. Banner criado pelo painel (imagem no
-- Storage do Supabase) não é tocado.
-- -----------------------------------------------------------------------------
delete from public.home_banners
 where imagem in ('/images/banners/memorias.jpg',
                  '/images/banners/presente.jpg',
                  '/images/banners/colecao.jpg');

insert into public.home_banners
  (titulo, subtitulo, cta_link, imagem, imagem_alt, foco, ordem)
values
  ('fotos polaroid',
   'Transforme suas memórias em polaroids personalizadas, impressas com carinho.',
   '/categoria/polaroids',
   '/images/banners/polaroids.jpg',
   'Mão segurando um porta-retrato de coraçõezinhos diante de polaroids abertas em leque',
   'centro', 1),

  ('como pedir',
   'Escolha o produto, envie suas fotos pelo WhatsApp e pague via Pix.',
   '#como-funciona',
   '/images/banners/como-pedir.jpg',
   'Caixa Amor para a Vida Toda aberta ao lado de polaroids, chaveiros e saquinho de organza',
   'centro', 2),

  ('quadros',
   'Quadros personalizados para deixar sua parede com a sua história.',
   '/categoria/quadros',
   '/images/banners/quadros.jpg',
   'Caixa presente iluminada com quadro preto, varal de polaroids e bombons',
   'centro', 3),

  ('prazo de produção',
   'Nossos produtos são personalizados, e por esse motivo, nós temos um prazo de até 10 dias úteis para produzir e enviar seu pedido!',
   '/produtos',
   '/images/banners/prazo.jpg',
   'Caixa de papel kraft fechada com laço de fita vermelha, pronta para enviar',
   'centro', 4);

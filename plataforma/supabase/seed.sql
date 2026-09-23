-- =============================================================================
-- Artes Polaroids — dados iniciais (catálogo real, migrado de js/products.js)
-- Rode DEPOIS da migration. Pode rodar de novo: não duplica nada.
--
-- Observações:
--  • Imagens apontam para /images/products/* (pasta public/ do Next.js).
--    Quando o admin de produtos existir, elas passam para o bucket "produtos".
--  • Produtos SEM foto real entram como RASCUNHO (regra 1.1: sem foto não vai
--    ao ar). Publique-os pelo painel quando tiver as fotos.
--  • estoque = null → sob demanda (regra 2.1 ainda [PENDENTE]).
--  • Preço por quantidade das polaroids virou a opção "Quantidade":
--    preço base R$20 (10un) + acréscimo; "fotos" = fotos que o cliente envia.
-- =============================================================================

insert into public.categorias (nome, slug, ordem) values
  ('Polaroids', 'polaroids', 1),
  ('Quadros',   'quadros',   2),
  ('Presentes', 'presentes', 3),
  ('Chaveiros', 'chaveiros', 4),
  ('Ímãs',      'imas',      5),
  ('Scrapbook', 'scrapbook', 6)
on conflict (slug) do update set nome = excluded.nome, ordem = excluded.ordem;

with c as (select id, slug from public.categorias)
insert into public.produtos (
  categoria_id, nome, slug, descricao_curta, descricao, preco, imagens, opcoes,
  requer_fotos_cliente, min_fotos, max_fotos, destaque, novo, ordem, status
)
values
  (
    (select id from c where slug = 'polaroids'),
    'Polaroid Retrô', 'polaroid-retro',
    'Polaroid borda branca 7x8cm. Formato ideal para fotos quadradas.',
    E'Para esse modelo, as fotos deverão estar no formato quadrado. Caso não estejam nesse formato, poderá haver cortes indesejados na hora da produção.\n\nNossas fotos são reveladas em papel fotográfico profissional Fujifilm brilhoso! Elas são à prova d''água, não amarelam e não desbotam com o tempo!',
    20.00,
    '["/images/products/polaroid-retro-1.jpg", "/images/products/polaroid-retro-2.jpg"]',
    '[{"nome": "Quantidade", "valores": [
        {"label": "10 unidades",  "acrescimo": 0,   "fotos": 10},
        {"label": "20 unidades",  "acrescimo": 20,  "fotos": 20},
        {"label": "50 unidades",  "acrescimo": 70,  "fotos": 50},
        {"label": "100 unidades", "acrescimo": 150, "fotos": 100}
     ]}]',
    true, 10, 100, true, true, 1, 'publicado'
  ),
  (
    (select id from c where slug = 'polaroids'),
    'Polaroid Clássica', 'polaroid-classica',
    'Polaroid com borda branca um pouco maior. Formato ideal para fotos quadradas.',
    E'Para esse modelo, as fotos deverão estar no formato quadrado. Caso não estejam nesse formato, poderá haver cortes indesejados na hora da produção.\n\nNossas fotos são reveladas em papel fotográfico profissional Fujifilm brilhoso! Elas são à prova d''água, não amarelam e não desbotam com o tempo!',
    20.00,
    '["/images/products/polaroid-classica-1.jpg", "/images/products/polaroid-classica-2.jpg"]',
    '[{"nome": "Quantidade", "valores": [
        {"label": "10 unidades",  "acrescimo": 0,   "fotos": 10},
        {"label": "20 unidades",  "acrescimo": 20,  "fotos": 20},
        {"label": "50 unidades",  "acrescimo": 70,  "fotos": 50},
        {"label": "100 unidades", "acrescimo": 150, "fotos": 100}
     ]}]',
    true, 10, 100, true, false, 2, 'publicado'
  ),
  (
    (select id from c where slug = 'quadros'),
    'Front Page Love', 'front-page-love',
    'Quadro & porta-retrato personalizado.',
    E'Um quadro exclusivo inspirado em capas de jornal, criado para eternizar momentos e sentimentos especiais de um jeito criativo e elegante. Perfeito para presentear ou decorar com significado.\n\nAcabamento premium, com vidro de proteção.',
    49.90,
    '["/images/products/front-page-love-1.jpg"]',
    '[]',
    true, 1, 1, true, true, 3, 'publicado'
  ),
  (
    (select id from c where slug = 'presentes'),
    'Box Amor Para Vida Toda', 'box-amor-para-vida-toda',
    'Caixa surpresa personalizada com fotos e chaveiros. 10x10x5cm.',
    E'Acompanha 10 fotos reveladas no estilo retrô e 2 chaveirinhos personalizados com as frases "Quero ser seu" e "Por onde for", formando a frase "Quero ser seu par, por onde for".\n\nVem em um saquinho de organza, com enchimento de palha dentro da caixa.\n\nDimensões da caixa: 10x10x5cm de altura.',
    54.90,
    '["/images/products/box-amor-1.jpg", "/images/products/box-amor-2.jpg", "/images/products/box-amor-3.jpg"]',
    '[]',
    true, 10, 10, true, false, 4, 'publicado'
  ),
  (
    (select id from c where slug = 'presentes'),
    'Globo de Foto Iluminado', 'globo-de-foto-iluminado',
    'Sua foto dentro de um globo com LED, tipo luminária.',
    E'Um globo de foto personalizado com iluminação de LED embutida, como uma luminária de mesa. Não é feito de vidro — é resistente e seguro para o dia a dia.\n\nColoque sua foto favorita e ilumine o ambiente com uma lembrança especial.',
    67.90,
    '["/images/products/globo-foto-1.jpg", "/images/products/globo-foto-2.jpg"]',
    '[]',
    true, 1, 1, false, false, 5, 'publicado'
  ),
  -- ---- Sem foto real ainda → rascunho ----
  (
    (select id from c where slug = 'quadros'),
    'Quadro Polaroid de Mesa', 'quadro-polaroid-de-mesa',
    'Uma foto seleção, emoldurada com carinho.',
    'Moldura de mesa em acabamento de madeira, com sua foto favorita revelada no estilo polaroid. Um detalhe simples que transforma qualquer escrivaninha ou estante.',
    34.90,
    '[]',
    '[{"nome": "Acabamento", "valores": [
        {"label": "Madeira clara",  "acrescimo": 0},
        {"label": "Madeira escura", "acrescimo": 0}
     ]}]',
    true, 1, 1, false, false, 6, 'rascunho'
  ),
  (
    (select id from c where slug = 'chaveiros'),
    'Chaveiro com Foto', 'chaveiro-com-foto',
    'Leve uma lembrança no bolso todos os dias.',
    'Chaveiro acrílico resistente, personalizado com a foto que você escolher. Pequeno, durável e cheio de significado.',
    8.50,
    '[]',
    '[{"nome": "Formato", "valores": [
        {"label": "Redondo",    "acrescimo": 0},
        {"label": "Retangular", "acrescimo": 0}
     ]}]',
    true, 1, 1, false, false, 7, 'rascunho'
  ),
  (
    (select id from c where slug = 'imas'),
    'Ímã com Foto', 'ima-com-foto',
    'Sua geladeira mais cheia de memórias.',
    'Ímã personalizado com a foto que você escolher, em acabamento fosco resistente. Vendido individualmente — combine vários para montar seu mural na geladeira.',
    3.00,
    '[]',
    '[]',
    true, 1, 1, false, false, 8, 'rascunho'
  ),
  (
    (select id from c where slug = 'scrapbook'),
    'Scrapbook Memórias', 'scrapbook-memorias',
    'Um álbum artesanal só seu, para contar sua história.',
    'Álbum artesanal personalizado, feito à mão com suas fotos, mensagens e pequenos detalhes decorativos. Um presente completo para relacionamentos, aniversários ou datas comemorativas.',
    60.00,
    '[]',
    -- Acréscimos por tamanho [PENDENTE]: hoje o site cobra R$60 em qualquer tamanho.
    '[{"nome": "Tamanho", "valores": [
        {"label": "Pequeno (20 fotos)", "acrescimo": 0, "fotos": 20},
        {"label": "Médio (35 fotos)",   "acrescimo": 0, "fotos": 35},
        {"label": "Grande (50 fotos)",  "acrescimo": 0, "fotos": 50}
     ]}]',
    true, 20, 50, false, true, 9, 'rascunho'
  )
on conflict (slug) do nothing;

-- Configurações iniciais (editáveis no painel na Fase 2)
insert into public.configuracoes (chave, valor, publica, descricao) values
  ('loja',          '{"aberta": true, "mensagem_fechada": "Estamos de férias! Voltamos em breve 💛"}', true,
                    'Modo férias: aberta=false fecha o checkout com aviso, sem derrubar o site'),
  ('banner_home',   '{"titulo": "Suas memórias, reveladas com carinho", "subtitulo": "Polaroids, quadros e presentes personalizados com as suas fotos.", "imagem": "/images/hero/hero-main.jpg"}', true,
                    'Texto e imagem do destaque da home'),
  ('frete',         '{"tipo": "fixo", "valor": 14.90, "gratis_acima": 100}', true,
                    'Frete do MVP: valor fixo, grátis acima de X (frete por CEP é Fase 3)'),
  ('retirada',      '{"ativa": true, "endereco": "Caratinga - MG (combinar pelo WhatsApp)"}', true,
                    'Retirada presencial'),
  ('prazo_producao',  '{"dias_uteis": 5}', true,
                    'Prazo de produção exibido na loja (regra 6.1)'),
  ('contato',       '{"whatsapp": "5533998035543", "instagram": "artes.polaroids", "email": "artes.polaroids1@gmail.com"}', true,
                    'Canais de contato da loja'),
  ('pedido_expiracao_horas', '24', false,
                    '[PENDENTE] Pedido não pago é cancelado após X horas (regra 5.2)'),
  ('fotos_retencao_dias',    '60', false,
                    '[PENDENTE] Fotos de pedidos concluídos são apagadas após X dias (regra 7.3)')
on conflict (chave) do nothing;

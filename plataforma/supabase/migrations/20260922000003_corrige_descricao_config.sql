-- =============================================================================
-- Artes Polaroids — corrige a legenda de `prazo_producao`
--
-- A descrição dessa configuração nasceu marcada como "[PENDENTE]", mas o valor
-- já é usado pela loja desde o Prompt 3:
--   • app/(loja)/produto/[slug]/page.tsx — prazo exibido no produto (o produto
--     pode ter prazo próprio; este é o padrão da loja quando ele não tem).
--   • components/loja/checkout/Checkout.tsx — "Produção em até X dias úteis".
--
-- O seed usa `on conflict (chave) do nothing`, então rodá-lo de novo NÃO
-- corrige um banco que já existe. Daí esta migration.
--
-- As outras duas legendas com "[PENDENTE]" continuam corretas e ficam como
-- estão: `pedido_expiracao_horas` depende do Pix (Prompt 6/7) e
-- `fotos_retencao_dias` depende da rotina de limpeza (regra 7.3).
-- =============================================================================

update public.configuracoes
   set descricao = 'Prazo de produção exibido na loja (regra 6.1)'
 where chave = 'prazo_producao'
   and descricao like '[PENDENTE]%';

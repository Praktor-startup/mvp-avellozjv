-- =============================================
-- MVP Avelloz — 011: data exata de fechamento da venda
-- =============================================
--
-- Contexto: o dashboard e os relatórios mensais precisam saber QUANDO um
-- atendimento fechou (não só que fechou), para filtrar "vendas fechadas
-- deste mês" corretamente. Antes só existia entry_date (entrada do cliente
-- na loja) e updated_at (genérico, muda em qualquer edição do registro).
-- Agora closed_at é gravado explicitamente pelo app no momento em que o
-- status vira "fechado".

alter table avelloz.customer_services add column if not exists closed_at timestamptz;

-- Backfill best-effort para vendas já fechadas antes desta migration: usa
-- updated_at como aproximação (não é exato, mas é a melhor data disponível
-- para o histórico existente).
update avelloz.customer_services cs
set closed_at = cs.updated_at
from avelloz.statuses st
where cs.status_id = st.id and st.is_closed = true and cs.closed_at is null;

create index if not exists idx_cs_closed_at on avelloz.customer_services(closed_at);

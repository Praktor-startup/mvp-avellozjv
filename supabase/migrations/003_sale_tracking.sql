-- =============================================
-- MVP Avelloz — 003: telefone do cliente + acompanhamento de venda aprovada
-- =============================================
--
-- Contexto: o crédito é aprovado em um momento, mas o fechamento da venda
-- acontece depois. Antes, "Consulta aprovada" era convertida na hora em
-- "Venda fechada"/"Venda perdida" e o lead mais quente (crédito já aprovado)
-- sumia do radar. Agora "Consulta aprovada" é um estado persistente e gera
-- um lembrete de cobrança de fechamento (reminder.type = 'sale_followup').
--
-- reminders.type é texto livre (sem CHECK), então 'sale_followup' não exige
-- alteração de schema — só a coluna de telefone do cliente.

-- Telefone/WhatsApp do cliente (para recuperar quem foi negado ou está aprovado)
alter table customer_services add column if not exists phone text;

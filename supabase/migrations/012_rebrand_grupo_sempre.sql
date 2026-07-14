-- =============================================
-- MVP Avelloz — 012: rebrand da loja "Avelloz Motos Torre — João Pessoa"
--                     para "Grupo Sempre Motos — Bayeux, PB"
-- =============================================
--
-- Só troca o nome/endereço da organização (usado na sidebar e nas funções que
-- resolvem a org pelo nome). Não afeta dados de atendimentos, vendedores etc.
-- Idempotente.

update avelloz.organizations
set name = 'Grupo Sempre Motos — Bayeux, PB'
where name = 'Avelloz Motos Torre — João Pessoa';

-- =============================================
-- MVP Avelloz — 004: isolamento por usuário (multi-tenant por conta)
-- =============================================
--
-- Antes, a RLS de todas as tabelas era `authenticated_full_access` com
-- condição `true` — QUALQUER conta logada via TODOS os dados. Agora cada
-- conta enxerga apenas os próprios dados (owner_id = auth.uid()).
--
-- Esta migration já foi aplicada em produção via API. Mantida aqui para
-- histórico/reprodutibilidade.

-- 1) Coluna de dono em todas as tabelas (default = usuário logado no insert)
alter table avelloz.sellers           add column if not exists owner_id uuid default auth.uid();
alter table avelloz.motorcycle_types   add column if not exists owner_id uuid default auth.uid();
alter table avelloz.statuses           add column if not exists owner_id uuid default auth.uid();
alter table avelloz.loss_reasons       add column if not exists owner_id uuid default auth.uid();
alter table avelloz.customer_services  add column if not exists owner_id uuid default auth.uid();
alter table avelloz.credit_checks      add column if not exists owner_id uuid default auth.uid();
alter table avelloz.reminders          add column if not exists owner_id uuid default auth.uid();

create index if not exists idx_cs_owner      on avelloz.customer_services(owner_id);
create index if not exists idx_cc_owner      on avelloz.credit_checks(owner_id);
create index if not exists idx_rem_owner     on avelloz.reminders(owner_id);
create index if not exists idx_sellers_owner on avelloz.sellers(owner_id);

-- 2) RLS por dono em todas as tabelas
do $$
declare t text;
begin
  foreach t in array array['sellers','motorcycle_types','statuses','loss_reasons','customer_services','credit_checks','reminders']
  loop
    execute format('drop policy if exists authenticated_full_access on avelloz.%I', t);
    execute format('drop policy if exists own_rows on avelloz.%I', t);
    execute format('create policy own_rows on avelloz.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end $$;

-- 3) Bootstrap: semeia os dados-padrão (status/motivos/motos) por conta.
--    Idempotente — só insere se a conta ainda não tem. Chamada pelo app no
--    login/cadastro (rpc bootstrap_user).
create or replace function avelloz.bootstrap_user()
returns void language plpgsql security definer set search_path = avelloz, public
as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  if not exists (select 1 from avelloz.statuses where owner_id = uid) then
    insert into avelloz.statuses (description, generates_reminder, is_closed, is_lost, sort_order, owner_id) values
      ('Cliente entrou na loja', false,false,false,1, uid),('Atendido', false,false,false,2, uid),
      ('Consulta pendente', false,false,false,3, uid),('Consulta aprovada', false,false,false,4, uid),
      ('Consulta com restrição', true,false,false,5, uid),('Financiamento negado', true,false,true,6, uid),
      ('Venda fechada', false,true,false,7, uid),('Venda perdida', false,false,true,8, uid),
      ('Reconsulta agendada', true,false,false,9, uid),('Reconsulta realizada', false,false,false,10, uid);
  end if;
  if not exists (select 1 from avelloz.loss_reasons where owner_id = uid) then
    insert into avelloz.loss_reasons (description, owner_id) values
      ('Restrição no CPF', uid),('Score baixo', uid),('Financiamento negado', uid),
      ('Entrada insuficiente', uid),('Parcela ficou alta', uid),('Cliente desistiu', uid),
      ('Cliente comprou em outra loja', uid),('Não retornou contato', uid),
      ('Sem CNH ou documentação incompleta', uid),('Outro motivo', uid);
  end if;
  if not exists (select 1 from avelloz.motorcycle_types where owner_id = uid) then
    insert into avelloz.motorcycle_types (model, owner_id) values
      ('Honda Biz 125', uid),('Honda CG 160', uid),('Yamaha Factor', uid),('Yamaha Fazer', uid),('Pop 110i', uid);
  end if;
end;
$fn$;

grant execute on function avelloz.bootstrap_user() to authenticated, anon, service_role;

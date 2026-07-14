-- =============================================
-- MVP Avelloz — 014: corrige ambiguidade de overload em convert_lead
-- =============================================
--
-- BUG ENCONTRADO EM TESTE (2026-07-14): existiam DUAS versões de
-- avelloz.convert_lead em produção:
--   (a) convert_lead(p_lead uuid)                       — da migration 006/013
--   (b) convert_lead(p_lead uuid, p_seller_id uuid = null) — aplicada direto
--       no banco em algum momento (não commitada em nenhuma migration local),
--       grava seller_id no atendimento via leads.assigned_seller_id (coluna
--       que também não existe em nenhuma migration local, mas existe em prod).
-- O PostgREST não consegue decidir entre as duas para uma chamada só com
-- p_lead (erro PGRST203) — "Virar atendimento" em /leads estava retornando
-- erro silencioso (a UI engole o erro) e NUNCA convertia o lead.
--
-- Esta migration consolida numa função única, preservando as DUAS
-- funcionalidades: atribuição de vendedor (assigned_seller_id/p_seller_id)
-- E propagação de CPF (fix da 013).
--
-- Idempotente.

begin;

drop function if exists avelloz.convert_lead(uuid);
drop function if exists avelloz.convert_lead(uuid, uuid);

create or replace function avelloz.convert_lead(p_lead uuid, p_seller_id uuid default null)
returns uuid language plpgsql security definer set search_path = avelloz, public as $$
declare
  v_lead record; v_org uuid := avelloz.current_org();
  v_status uuid; v_service uuid; v_seller_id uuid;
begin
  select * into v_lead from avelloz.leads where id = p_lead and org_id = v_org;
  if v_lead is null then raise exception 'lead não encontrado na sua loja'; end if;
  if v_lead.converted_service_id is not null then return v_lead.converted_service_id; end if;

  v_seller_id := coalesce(p_seller_id, v_lead.assigned_seller_id);

  select id into v_status from avelloz.statuses
    where org_id = v_org and description = 'Cliente entrou na loja' limit 1;

  insert into avelloz.customer_services (name, cpf, phone, status_id, seller_id, notes, org_id, owner_id)
    values (
      v_lead.name, coalesce(v_lead.cpf, ''), v_lead.phone, v_status, v_seller_id,
      'Lead da origem: ' || coalesce((select name from avelloz.lead_sources where id = v_lead.source_id), 'site')
        || coalesce(' — interesse: ' || v_lead.interest, ''),
      v_org, auth.uid()
    )
    returning id into v_service;

  update avelloz.leads set status = 'convertido', converted_service_id = v_service where id = p_lead;
  return v_service;
end $$;
grant execute on function avelloz.convert_lead(uuid, uuid) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;

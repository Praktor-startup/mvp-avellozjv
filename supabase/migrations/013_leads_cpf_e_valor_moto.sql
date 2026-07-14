-- =============================================
-- MVP Avelloz — 013: CPF no lead + valor de consulta por moto
-- =============================================
--
-- (1) CPF passa a ser obrigatório no formulário público de leads (/loja).
--     submit_lead ganha o parâmetro p_cpf, validado por avelloz.is_valid_cpf
--     (já existe desde a 008). convert_lead propaga o CPF do lead para o
--     atendimento criado (antes gravava cpf = '').
-- (2) motorcycle_types ganha `price` (valor de consulta/financiamento da
--     moto), editável em /motos. Opcional — não afeta atendimentos existentes.
--
-- Só ADD COLUMN (nullable) e troca de definição de função — nenhum DROP
-- TABLE/DELETE/TRUNCATE. Envolvida em transação: se qualquer statement
-- falhar, tudo é desfeito e o banco volta exatamente como estava.
-- Idempotente.

begin;

alter table avelloz.leads add column if not exists cpf text;
alter table avelloz.motorcycle_types add column if not exists price numeric(10,2);

-- submit_lead: assinatura muda (novo parâmetro) -> precisa dropar a versão antiga.
drop function if exists avelloz.submit_lead(text,text,text,text,text);

create or replace function avelloz.submit_lead(
  p_code text, p_name text, p_phone text, p_cpf text,
  p_interest text default null, p_message text default null
) returns uuid
language plpgsql security definer set search_path = avelloz, public as $$
declare v_src uuid; v_org uuid; v_id uuid; v_cpf text;
begin
  if p_name is null or btrim(p_name) = '' or p_phone is null or btrim(p_phone) = '' then
    raise exception 'nome e telefone são obrigatórios';
  end if;
  v_cpf := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  if not avelloz.is_valid_cpf(v_cpf) then
    raise exception 'CPF inválido';
  end if;
  select id, org_id into v_src, v_org from avelloz.lead_sources where code = p_code limit 1;
  if v_org is null then return null; end if;  -- origem inválida: não cria lead órfão
  insert into avelloz.leads (org_id, source_id, name, phone, cpf, interest, message)
    values (v_org, v_src, btrim(p_name), btrim(p_phone), v_cpf, nullif(btrim(p_interest),''), nullif(btrim(p_message),''))
    returning id into v_id;
  return v_id;
end $$;
grant execute on function avelloz.submit_lead(text,text,text,text,text,text) to anon, authenticated, service_role;

-- convert_lead: propaga o CPF do lead pro atendimento (antes gravava '').
create or replace function avelloz.convert_lead(p_lead uuid)
returns uuid language plpgsql security definer set search_path = avelloz, public as $$
declare v_lead record; v_org uuid := avelloz.current_org(); v_status uuid; v_service uuid;
begin
  select * into v_lead from avelloz.leads where id = p_lead and org_id = v_org;
  if v_lead is null then raise exception 'lead não encontrado na sua loja'; end if;
  if v_lead.converted_service_id is not null then return v_lead.converted_service_id; end if;

  select id into v_status from avelloz.statuses
    where org_id = v_org and description = 'Cliente entrou na loja' limit 1;

  insert into avelloz.customer_services (name, cpf, phone, status_id, notes, org_id, owner_id)
    values (
      v_lead.name, coalesce(v_lead.cpf, ''), v_lead.phone, v_status,
      'Lead da origem: ' || coalesce((select name from avelloz.lead_sources where id = v_lead.source_id), 'site')
        || coalesce(' — interesse: ' || v_lead.interest, ''),
      v_org, auth.uid()
    )
    returning id into v_service;

  update avelloz.leads set status = 'convertido', converted_service_id = v_service where id = p_lead;
  return v_service;
end $$;
grant execute on function avelloz.convert_lead(uuid) to authenticated, service_role;

-- PostgREST self-hosted: refletir a nova assinatura de submit_lead no cache do schema.
notify pgrst, 'reload schema';

commit;

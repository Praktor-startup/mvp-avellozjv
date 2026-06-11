-- =============================================
-- MVP Avelloz — 006: origens (QR), scans e leads
-- =============================================
--
-- Cada QR code aponta para uma ORIGEM (lead_source) com um `code` curto.
-- Fluxo: pessoa escaneia QR -> /r/<code> registra um scan e redireciona para a
-- landing /loja?o=<code> -> se preencher contato, vira um LEAD com a origem
-- gravada. Gestor vê leads/scans por origem e pode converter lead em atendimento.
--
-- Visitante é anônimo (role anon): não acessa as tabelas direto. Usa as funções
-- SECURITY DEFINER track_scan() e submit_lead(), que validam pelo `code`.
-- Idempotente.

create extension if not exists "uuid-ossp";

-- =============================================
-- 1) Tabelas
-- =============================================
create table if not exists avelloz.lead_sources (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references avelloz.organizations(id) on delete cascade,
  name text not null,                 -- "Restaurante do Zé", "Posto Central"...
  code text not null unique,          -- slug no QR (ex: restaurante-ze-a1b2)
  kind text not null default 'qr',    -- qr | site (origem direta da landing)
  description text,
  active boolean not null default true,
  owner_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists idx_lead_sources_org  on avelloz.lead_sources(org_id);
create index if not exists idx_lead_sources_code on avelloz.lead_sources(code);

create table if not exists avelloz.scans (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid not null references avelloz.lead_sources(id) on delete cascade,
  org_id uuid not null references avelloz.organizations(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  user_agent text,
  referrer text
);
create index if not exists idx_scans_source on avelloz.scans(source_id);
create index if not exists idx_scans_org    on avelloz.scans(org_id);

create table if not exists avelloz.leads (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references avelloz.organizations(id) on delete cascade,
  source_id uuid references avelloz.lead_sources(id) on delete set null,
  name text not null,
  phone text not null,
  interest text,                      -- modelo de interesse (AZ160, AZ125...)
  message text,
  status text not null default 'novo' check (status in ('novo','contatado','convertido','descartado')),
  converted_service_id uuid references avelloz.customer_services(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_leads_org    on avelloz.leads(org_id);
create index if not exists idx_leads_source on avelloz.leads(source_id);
create index if not exists idx_leads_status on avelloz.leads(status);

-- org_id automático para inserts autenticados (gestor criando origem etc.)
alter table avelloz.lead_sources alter column org_id set default avelloz.current_org();
alter table avelloz.leads        alter column org_id set default avelloz.current_org();

alter table avelloz.lead_sources enable row level security;
alter table avelloz.scans        enable row level security;
alter table avelloz.leads        enable row level security;

-- =============================================
-- 2) RLS — visível/editável só pela org (visitante anônimo NÃO acessa direto)
-- =============================================
do $$ declare t text;
begin
  foreach t in array array['lead_sources','scans','leads'] loop
    execute format('drop policy if exists org_rows on avelloz.%I', t);
    execute format($p$create policy org_rows on avelloz.%I for all to authenticated
      using (org_id = avelloz.current_org()) with check (org_id = avelloz.current_org())$p$, t);
  end loop;
end $$;

-- =============================================
-- 3) Funções públicas (anon) — entrada da landing/QR
-- =============================================
-- Registra um scan e devolve a origem (nome) para a landing exibir contexto.
create or replace function avelloz.track_scan(p_code text, p_ua text default null, p_ref text default null)
returns table(source_id uuid, source_name text)
language plpgsql security definer set search_path = avelloz, public as $$
declare v_id uuid; v_org uuid; v_name text;
begin
  select id, org_id, name into v_id, v_org, v_name
    from avelloz.lead_sources where code = p_code and active limit 1;
  if v_id is null then return; end if;
  insert into avelloz.scans (source_id, org_id, user_agent, referrer) values (v_id, v_org, p_ua, p_ref);
  return query select v_id, v_name;
end $$;

-- Cria um lead a partir do code da origem (resolve a org pela origem).
create or replace function avelloz.submit_lead(
  p_code text, p_name text, p_phone text,
  p_interest text default null, p_message text default null
) returns uuid
language plpgsql security definer set search_path = avelloz, public as $$
declare v_src uuid; v_org uuid; v_id uuid;
begin
  if p_name is null or btrim(p_name) = '' or p_phone is null or btrim(p_phone) = '' then
    raise exception 'nome e telefone são obrigatórios';
  end if;
  select id, org_id into v_src, v_org from avelloz.lead_sources where code = p_code limit 1;
  if v_org is null then return null; end if;  -- origem inválida: não cria lead órfão
  insert into avelloz.leads (org_id, source_id, name, phone, interest, message)
    values (v_org, v_src, btrim(p_name), btrim(p_phone), nullif(btrim(p_interest),''), nullif(btrim(p_message),''))
    returning id into v_id;
  return v_id;
end $$;

grant execute on function avelloz.track_scan(text,text,text)              to anon, authenticated, service_role;
grant execute on function avelloz.submit_lead(text,text,text,text,text)   to anon, authenticated, service_role;

-- =============================================
-- 4) Converter lead em atendimento (gestor) — cria customer_service e marca o lead
-- =============================================
create or replace function avelloz.convert_lead(p_lead uuid)
returns uuid language plpgsql security definer set search_path = avelloz, public as $$
declare v_lead record; v_org uuid := avelloz.current_org(); v_status uuid; v_service uuid;
begin
  select * into v_lead from avelloz.leads where id = p_lead and org_id = v_org;
  if v_lead is null then raise exception 'lead não encontrado na sua loja'; end if;
  if v_lead.converted_service_id is not null then return v_lead.converted_service_id; end if;

  -- status inicial padrão da org
  select id into v_status from avelloz.statuses
    where org_id = v_org and description = 'Cliente entrou na loja' limit 1;

  insert into avelloz.customer_services (name, cpf, phone, status_id, notes, org_id, owner_id)
    values (
      v_lead.name, '', v_lead.phone, v_status,
      'Lead da origem: ' || coalesce((select name from avelloz.lead_sources where id = v_lead.source_id), 'site')
        || coalesce(' — interesse: ' || v_lead.interest, ''),
      v_org, auth.uid()
    )
    returning id into v_service;

  update avelloz.leads set status = 'convertido', converted_service_id = v_service where id = p_lead;
  return v_service;
end $$;
grant execute on function avelloz.convert_lead(uuid) to authenticated, service_role;

-- =============================================
-- 5) Seed: origem "site" (direta) + um exemplo para a org Avelloz
-- =============================================
do $$
declare v_org uuid;
begin
  select id into v_org from avelloz.organizations where name = 'Avelloz Motos Torre — João Pessoa' limit 1;
  if v_org is null then return; end if;

  insert into avelloz.lead_sources (org_id, name, code, kind, description)
  values (v_org, 'Site (acesso direto)', 'site', 'site', 'Leads que chegaram direto pela landing, sem QR')
  on conflict (code) do nothing;

  insert into avelloz.lead_sources (org_id, name, code, kind, description)
  values (v_org, 'Restaurante (exemplo)', 'restaurante-exemplo', 'qr', 'QR de exemplo para parceiro restaurante')
  on conflict (code) do nothing;
end $$;

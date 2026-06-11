-- =============================================
-- MVP Avelloz — 005: multi-tenant por ORGANIZAÇÃO (loja) + papéis
-- =============================================
--
-- Antes (004): isolamento por usuário individual (owner_id = auth.uid()).
-- Problema: a loja tem gestor + vendedores; no modelo por-usuário cada um
-- ficava num silo e o gestor não via os atendimentos da equipe.
--
-- Agora: a loja é uma ORGANIZAÇÃO. Usuários pertencem a uma org via
-- `memberships` com papel (gestor|vendedor). RLS por org:
--   - config (statuses/loss_reasons/motorcycle_types/sellers): toda a org vê/edita
--   - atendimentos/consultas/lembretes: gestor vê tudo da org; vendedor vê só
--     os atendimentos do seu próprio cadastro de vendedor (sellers.user_id).
--
-- owner_id (004) é mantido como coluna de auditoria, mas a RLS não usa mais.
-- Idempotente — pode rodar mais de uma vez sem efeito colateral.
-- Ordem importa (gateway sem transação única): colunas → helpers → defaults.

create extension if not exists "uuid-ossp";

-- =============================================
-- 1) Organizações e vínculos de usuário (memberships)
-- =============================================
create table if not exists avelloz.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists avelloz.memberships (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references avelloz.organizations(id) on delete cascade,
  user_id uuid not null,                       -- auth.users.id
  role text not null default 'vendedor' check (role in ('gestor','vendedor')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists idx_memberships_user on avelloz.memberships(user_id);
create index if not exists idx_memberships_org  on avelloz.memberships(org_id);

alter table avelloz.organizations enable row level security;
alter table avelloz.memberships   enable row level security;

-- =============================================
-- 2) Coluna org_id em todas as tabelas (+ sellers.user_id para vincular login)
--    Precede os helpers (my_seller_ids usa user_id) e os defaults.
-- =============================================
alter table avelloz.sellers           add column if not exists org_id  uuid references avelloz.organizations(id);
alter table avelloz.sellers           add column if not exists user_id uuid;  -- login do vendedor (opcional)
alter table avelloz.motorcycle_types  add column if not exists org_id  uuid references avelloz.organizations(id);
alter table avelloz.statuses          add column if not exists org_id  uuid references avelloz.organizations(id);
alter table avelloz.loss_reasons      add column if not exists org_id  uuid references avelloz.organizations(id);
alter table avelloz.customer_services add column if not exists org_id  uuid references avelloz.organizations(id);
alter table avelloz.credit_checks     add column if not exists org_id  uuid references avelloz.organizations(id);
alter table avelloz.reminders         add column if not exists org_id  uuid references avelloz.organizations(id);

create index if not exists idx_sellers_org  on avelloz.sellers(org_id);
create index if not exists idx_sellers_user on avelloz.sellers(user_id);
create index if not exists idx_mt_org        on avelloz.motorcycle_types(org_id);
create index if not exists idx_statuses_org  on avelloz.statuses(org_id);
create index if not exists idx_lr_org        on avelloz.loss_reasons(org_id);
create index if not exists idx_cs_org        on avelloz.customer_services(org_id);
create index if not exists idx_cc_org        on avelloz.credit_checks(org_id);
create index if not exists idx_rem_org       on avelloz.reminders(org_id);

-- =============================================
-- 3) Helpers (SECURITY DEFINER — quebram a recursão de RLS ao consultar memberships)
-- =============================================
-- A org "ativa" do usuário (1 org por usuário no MVP; pega a mais antiga).
create or replace function avelloz.current_org()
returns uuid language sql stable security definer set search_path = avelloz, public as $$
  select org_id from avelloz.memberships where user_id = auth.uid() order by created_at limit 1
$$;

-- O usuário é gestor na org ativa?
create or replace function avelloz.is_gestor()
returns boolean language sql stable security definer set search_path = avelloz, public as $$
  select exists (
    select 1 from avelloz.memberships
    where user_id = auth.uid() and role = 'gestor' and org_id = avelloz.current_org()
  )
$$;

-- IDs de cadastro de vendedor vinculados ao login atual (escopo do vendedor).
create or replace function avelloz.my_seller_ids()
returns setof uuid language sql stable security definer set search_path = avelloz, public as $$
  select id from avelloz.sellers where user_id = auth.uid()
$$;

grant execute on function avelloz.current_org()   to authenticated, anon, service_role;
grant execute on function avelloz.is_gestor()     to authenticated, anon, service_role;
grant execute on function avelloz.my_seller_ids() to authenticated, anon, service_role;

-- =============================================
-- 4) Defaults: novos inserts do app preenchem org_id pela org ativa
-- =============================================
alter table avelloz.sellers           alter column org_id set default avelloz.current_org();
alter table avelloz.motorcycle_types  alter column org_id set default avelloz.current_org();
alter table avelloz.statuses          alter column org_id set default avelloz.current_org();
alter table avelloz.loss_reasons      alter column org_id set default avelloz.current_org();
alter table avelloz.customer_services alter column org_id set default avelloz.current_org();
alter table avelloz.credit_checks     alter column org_id set default avelloz.current_org();
alter table avelloz.reminders         alter column org_id set default avelloz.current_org();

-- =============================================
-- 5) Seed de configuração por ORG (substitui o bootstrap por usuário)
-- =============================================
create or replace function avelloz.bootstrap_org(p_org uuid)
returns void language plpgsql security definer set search_path = avelloz, public as $$
begin
  if p_org is null then return; end if;

  if not exists (select 1 from avelloz.statuses where org_id = p_org) then
    insert into avelloz.statuses (description, generates_reminder, is_closed, is_lost, sort_order, org_id, owner_id) values
      ('Cliente entrou na loja', false,false,false,1, p_org, auth.uid()),('Atendido', false,false,false,2, p_org, auth.uid()),
      ('Consulta pendente', false,false,false,3, p_org, auth.uid()),('Consulta aprovada', false,false,false,4, p_org, auth.uid()),
      ('Consulta com restrição', true,false,false,5, p_org, auth.uid()),('Financiamento negado', true,false,true,6, p_org, auth.uid()),
      ('Venda fechada', false,true,false,7, p_org, auth.uid()),('Venda perdida', false,false,true,8, p_org, auth.uid()),
      ('Reconsulta agendada', false,false,false,9, p_org, auth.uid()),('Reconsulta realizada', false,false,false,10, p_org, auth.uid());
  end if;

  if not exists (select 1 from avelloz.loss_reasons where org_id = p_org) then
    insert into avelloz.loss_reasons (description, org_id, owner_id) values
      ('Restrição no CPF', p_org, auth.uid()),('Score baixo', p_org, auth.uid()),('Financiamento negado', p_org, auth.uid()),
      ('Entrada insuficiente', p_org, auth.uid()),('Parcela ficou alta', p_org, auth.uid()),('Cliente desistiu', p_org, auth.uid()),
      ('Cliente comprou em outra loja', p_org, auth.uid()),('Não retornou contato', p_org, auth.uid()),
      ('Sem CNH ou documentação incompleta', p_org, auth.uid()),('Outro motivo', p_org, auth.uid());
  end if;

  if not exists (select 1 from avelloz.motorcycle_types where org_id = p_org) then
    insert into avelloz.motorcycle_types (model, org_id, owner_id) values
      ('Avelloz AZ160', p_org, auth.uid()),('Avelloz AZ125', p_org, auth.uid()),('Avelloz AZ1 / AZ100', p_org, auth.uid());
  end if;
end $$;

-- =============================================
-- 6) Garante org + papel de gestor no 1º acesso (chamado pelo app no login/load)
-- =============================================
create or replace function avelloz.ensure_org()
returns uuid language plpgsql security definer set search_path = avelloz, public as $$
declare v_org uuid; v_uid uuid := auth.uid(); v_name text;
begin
  if v_uid is null then return null; end if;
  select org_id into v_org from avelloz.memberships where user_id = v_uid order by created_at limit 1;
  if v_org is not null then return v_org; end if;
  select coalesce(nullif(trim(raw_user_meta_data->>'nome'), ''), split_part(email,'@',1), 'Minha Loja')
    into v_name from auth.users where id = v_uid;
  insert into avelloz.organizations (name) values ('Loja de ' || v_name) returning id into v_org;
  insert into avelloz.memberships (org_id, user_id, role) values (v_org, v_uid, 'gestor');
  perform avelloz.bootstrap_org(v_org);
  return v_org;
end $$;

-- Compat: o app antigo chama bootstrap_user(); redireciona para ensure_org().
create or replace function avelloz.bootstrap_user()
returns void language plpgsql security definer set search_path = avelloz, public as $$
begin
  perform avelloz.ensure_org();
end $$;

grant execute on function avelloz.bootstrap_org(uuid) to authenticated, anon, service_role;
grant execute on function avelloz.ensure_org()        to authenticated, anon, service_role;
grant execute on function avelloz.bootstrap_user()    to authenticated, anon, service_role;

-- =============================================
-- 7) Backfill: org real "Avelloz Motos Torre — João Pessoa"
--    Recebe os dados reais (owner = eduardoramalho80) + equipe como gestores.
--    Dados de teste de OUTRAS contas ficam sem org e a RLS os esconde.
-- =============================================
do $$
declare
  v_org   uuid;
  v_owner uuid := '274f50dc-364e-4586-aacc-145b7f5024f3'; -- eduardoramalho80 (dados reais)
begin
  select id into v_org from avelloz.organizations where name = 'Avelloz Motos Torre — João Pessoa' limit 1;
  if v_org is null then
    insert into avelloz.organizations (name) values ('Avelloz Motos Torre — João Pessoa') returning id into v_org;
  end if;

  insert into avelloz.memberships (org_id, user_id, role)
  select v_org, u.id, 'gestor'
  from auth.users u
  where u.email in ('eduardoramalho80@gmail.com','joaovitorgramalho@gmail.com','demo@avelloz.com.br','teste@avelloz.com.br')
  on conflict (org_id, user_id) do nothing;

  update avelloz.sellers           set org_id = v_org where owner_id = v_owner and org_id is null;
  update avelloz.motorcycle_types  set org_id = v_org where owner_id = v_owner and org_id is null;
  update avelloz.statuses          set org_id = v_org where owner_id = v_owner and org_id is null;
  update avelloz.loss_reasons      set org_id = v_org where owner_id = v_owner and org_id is null;
  update avelloz.customer_services set org_id = v_org where owner_id = v_owner and org_id is null;
  update avelloz.credit_checks  set org_id = v_org
    where org_id is null and customer_service_id in (select id from avelloz.customer_services where org_id = v_org);
  update avelloz.reminders      set org_id = v_org
    where org_id is null and customer_service_id in (select id from avelloz.customer_services where org_id = v_org);
end $$;

-- =============================================
-- 8) RLS por organização (substitui own_rows da 004)
-- =============================================
drop policy if exists org_visible on avelloz.organizations;
create policy org_visible on avelloz.organizations for select to authenticated
  using (id = avelloz.current_org());

drop policy if exists membership_visible on avelloz.memberships;
create policy membership_visible on avelloz.memberships for select to authenticated
  using (org_id = avelloz.current_org());

-- Config + sellers: qualquer membro da org vê e edita
do $$ declare t text;
begin
  foreach t in array array['sellers','motorcycle_types','statuses','loss_reasons'] loop
    execute format('drop policy if exists own_rows on avelloz.%I', t);
    execute format('drop policy if exists org_rows on avelloz.%I', t);
    execute format($p$create policy org_rows on avelloz.%I for all to authenticated
      using (org_id = avelloz.current_org()) with check (org_id = avelloz.current_org())$p$, t);
  end loop;
end $$;

-- Atendimentos: gestor vê tudo da org; vendedor vê só os do seu cadastro de vendedor
drop policy if exists own_rows on avelloz.customer_services;
drop policy if exists org_rows on avelloz.customer_services;
create policy org_rows on avelloz.customer_services for all to authenticated
  using (
    org_id = avelloz.current_org()
    and (avelloz.is_gestor() or seller_id in (select avelloz.my_seller_ids()))
  )
  with check (org_id = avelloz.current_org());

-- Consultas e lembretes: herdam a visibilidade do atendimento pai (a subquery
-- já passa pela RLS de customer_services, aplicando o escopo do vendedor).
drop policy if exists own_rows on avelloz.credit_checks;
drop policy if exists org_rows on avelloz.credit_checks;
create policy org_rows on avelloz.credit_checks for all to authenticated
  using (
    org_id = avelloz.current_org()
    and (avelloz.is_gestor() or customer_service_id in (select id from avelloz.customer_services))
  )
  with check (org_id = avelloz.current_org());

drop policy if exists own_rows on avelloz.reminders;
drop policy if exists org_rows on avelloz.reminders;
create policy org_rows on avelloz.reminders for all to authenticated
  using (
    org_id = avelloz.current_org()
    and (avelloz.is_gestor() or customer_service_id in (select id from avelloz.customer_services))
  )
  with check (org_id = avelloz.current_org());

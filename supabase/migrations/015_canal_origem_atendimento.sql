-- =============================================
-- MVP Avelloz — 015: canal de origem no cadastro MANUAL de atendimento
-- =============================================
--
-- Contexto: a Captação (QR)/leads (migration 006) só rastreia origem de quem
-- chega pela landing pública. Não existia nada para o cadastro manual feito
-- pelo vendedor (cliente que entrou na loja ou ligou) — este cobre esse caso:
-- um campo opcional "Como o cliente chegou até você?" (Instagram, indicação
-- verbal, Google, etc.), configurável em /canais igual Status/Motivos de
-- Perda/Tipos de Moto.
--
-- Idempotente.

begin;

create table if not exists avelloz.customer_channels (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references avelloz.organizations(id) on delete cascade default avelloz.current_org(),
  description text not null,
  active boolean not null default true,
  owner_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists idx_customer_channels_org on avelloz.customer_channels(org_id);

alter table avelloz.customer_services add column if not exists channel_id uuid references avelloz.customer_channels(id);

alter table avelloz.customer_channels enable row level security;

-- Mesmo padrão da 010: leitura para toda a org, escrita só gestor|tecnico.
drop policy if exists org_read on avelloz.customer_channels;
drop policy if exists org_write on avelloz.customer_channels;
create policy org_read on avelloz.customer_channels
  for select to authenticated
  using (org_id = avelloz.current_org());
create policy org_write on avelloz.customer_channels
  for all to authenticated
  using (avelloz.is_gestor() and org_id = avelloz.current_org())
  with check (avelloz.is_gestor() and org_id = avelloz.current_org());

-- Seed para orgs novas (mesmo padrão de statuses/loss_reasons/motorcycle_types).
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

  if not exists (select 1 from avelloz.customer_channels where org_id = p_org) then
    insert into avelloz.customer_channels (description, org_id, owner_id) values
      ('Instagram', p_org, auth.uid()),('Facebook', p_org, auth.uid()),('Google', p_org, auth.uid()),
      ('WhatsApp', p_org, auth.uid()),('Indicação', p_org, auth.uid()),('Passando na rua', p_org, auth.uid()),
      ('Outro', p_org, auth.uid());
  end if;
end $$;
grant execute on function avelloz.bootstrap_org(uuid) to authenticated, anon, service_role;

-- Seed retroativo para as orgs que já existem hoje (não passam pelo bootstrap de novo).
do $$
declare r record;
begin
  for r in select id from avelloz.organizations loop
    if not exists (select 1 from avelloz.customer_channels where org_id = r.id) then
      insert into avelloz.customer_channels (description, org_id) values
        ('Instagram', r.id),('Facebook', r.id),('Google', r.id),
        ('WhatsApp', r.id),('Indicação', r.id),('Passando na rua', r.id),('Outro', r.id);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;

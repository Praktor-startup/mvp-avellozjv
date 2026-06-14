-- =============================================
-- MVP Avelloz — 008: perfil do membro (nome, telefone, CPF) no cadastro de contas
-- =============================================
--
-- O cadastro de uma conta passa a exigir nome completo, telefone, e-mail e CPF.
-- Esses dados ficam em avelloz.memberships (perfil da pessoa DENTRO da loja),
-- não em auth.users — que é compartilhado entre todos os projetos Praktor.
-- Isolados por org pela RLS de memberships. Idempotente.

-- ---------------------------------------------
-- 1) Colunas de perfil + CPF único por loja
-- ---------------------------------------------
alter table avelloz.memberships add column if not exists nome  text;
alter table avelloz.memberships add column if not exists phone text;
alter table avelloz.memberships add column if not exists cpf   text;  -- só dígitos

create unique index if not exists uq_memberships_org_cpf
  on avelloz.memberships(org_id, cpf) where cpf is not null;

-- Backfill do nome a partir do metadado de auth (telefone/CPF ficam nulos — desconhecidos)
update avelloz.memberships m
set nome = coalesce(nullif(btrim(u.raw_user_meta_data->>'nome'), ''), split_part(u.email, '@', 1))
from auth.users u
where u.id = m.user_id and (m.nome is null or btrim(m.nome) = '');

-- ---------------------------------------------
-- 2) Validação de CPF (formato + dígitos verificadores)
-- ---------------------------------------------
create or replace function avelloz.is_valid_cpf(p text)
returns boolean language plpgsql immutable as $$
declare d text; s int; r int; i int; v1 int; v2 int;
begin
  d := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  if length(d) <> 11 then return false; end if;
  if d ~ '^(\d)\1{10}$' then return false; end if;  -- todos iguais
  s := 0;
  for i in 1..9 loop s := s + (substr(d, i, 1))::int * (11 - i); end loop;
  r := s % 11; v1 := case when r < 2 then 0 else 11 - r end;
  if v1 <> substr(d, 10, 1)::int then return false; end if;
  s := 0;
  for i in 1..10 loop s := s + (substr(d, i, 1))::int * (12 - i); end loop;
  r := s % 11; v2 := case when r < 2 then 0 else 11 - r end;
  return v2 = substr(d, 11, 1)::int;
end $$;
grant execute on function avelloz.is_valid_cpf(text) to authenticated, anon, service_role;

-- ---------------------------------------------
-- 3) list_team passa a retornar telefone e CPF
-- ---------------------------------------------
drop function if exists avelloz.list_team();
create or replace function avelloz.list_team()
returns table(user_id uuid, email text, nome text, phone text, cpf text, role text, is_me boolean, created_at timestamptz)
language sql security definer set search_path = avelloz, public, auth as $$
  select m.user_id,
         u.email::text,
         coalesce(nullif(btrim(m.nome), ''), nullif(btrim(u.raw_user_meta_data->>'nome'), ''), split_part(u.email, '@', 1)) as nome,
         m.phone,
         m.cpf,
         m.role,
         (m.user_id = auth.uid()) as is_me,
         m.created_at
  from avelloz.memberships m
  join auth.users u on u.id = m.user_id
  where m.org_id = avelloz.current_org()
  order by m.role, nome
$$;
revoke all on function avelloz.list_team() from public, anon;
grant execute on function avelloz.list_team() to authenticated;

-- ---------------------------------------------
-- 4) create_team_member com telefone + CPF obrigatórios
--    (substitui a assinatura de 4 args da migration 007)
-- ---------------------------------------------
drop function if exists avelloz.create_team_member(text, text, text, text);

create or replace function avelloz.create_team_member(
  p_email text, p_password text, p_nome text, p_role text, p_phone text, p_cpf text
) returns json
language plpgsql security definer
set search_path = avelloz, public, auth, extensions as $$
declare
  v_org      uuid := avelloz.current_org();
  v_uid      uuid;
  v_existing uuid;
  v_nome     text;
  v_phone    text;
  v_cpf      text;
begin
  if not avelloz.is_gestor() then
    raise exception 'Apenas gestores podem cadastrar contas' using errcode = '42501';
  end if;
  if v_org is null then
    raise exception 'Loja não encontrada para o usuário atual';
  end if;
  if coalesce(p_role, '') not in ('gestor', 'vendedor') then
    raise exception 'Papel inválido (use gestor ou vendedor)';
  end if;

  v_nome  := nullif(btrim(coalesce(p_nome, '')), '');
  if v_nome is null then raise exception 'Nome completo é obrigatório'; end if;

  p_email := lower(btrim(coalesce(p_email, '')));
  if p_email = '' or position('@' in p_email) = 0 then
    raise exception 'E-mail inválido';
  end if;

  if length(coalesce(p_password, '')) < 6 then
    raise exception 'A senha deve ter no mínimo 6 caracteres';
  end if;

  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(v_phone) < 10 then
    raise exception 'Telefone inválido (informe DDD + número)';
  end if;

  v_cpf := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  if not avelloz.is_valid_cpf(v_cpf) then
    raise exception 'CPF inválido';
  end if;
  if exists (select 1 from avelloz.memberships where org_id = v_org and cpf = v_cpf) then
    raise exception 'Este CPF já está cadastrado na sua loja';
  end if;

  -- auth.users é global: se o e-mail já existe, só vincula à loja (não recria login)
  select id into v_existing from auth.users where lower(email) = p_email limit 1;

  if v_existing is not null then
    if exists (select 1 from avelloz.memberships where org_id = v_org and user_id = v_existing) then
      raise exception 'Este e-mail já faz parte da sua loja';
    end if;
    insert into avelloz.memberships (org_id, user_id, role, nome, phone, cpf)
      values (v_org, v_existing, p_role, v_nome, v_phone, v_cpf);
    if p_role = 'vendedor' then
      insert into avelloz.sellers (name, whatsapp, org_id, user_id, owner_id)
        values (v_nome, v_phone, v_org, v_existing, auth.uid());
    end if;
    return json_build_object('status', 'linked', 'user_id', v_existing);
  end if;

  v_uid := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    p_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', v_nome),
    '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (v_uid::text, v_uid, jsonb_build_object('sub', v_uid::text, 'email', p_email), 'email', now(), now(), now());

  insert into avelloz.memberships (org_id, user_id, role, nome, phone, cpf)
    values (v_org, v_uid, p_role, v_nome, v_phone, v_cpf);
  if p_role = 'vendedor' then
    insert into avelloz.sellers (name, whatsapp, org_id, user_id, owner_id)
      values (v_nome, v_phone, v_org, v_uid, auth.uid());
  end if;

  return json_build_object('status', 'created', 'user_id', v_uid);
end $$;
revoke all on function avelloz.create_team_member(text, text, text, text, text, text) from public, anon;
grant execute on function avelloz.create_team_member(text, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';

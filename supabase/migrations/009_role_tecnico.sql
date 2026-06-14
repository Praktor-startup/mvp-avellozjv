-- =============================================
-- MVP Avelloz — 009: papel "Técnico" (admin técnico, nível acima do gestor)
-- =============================================
--
-- Técnico = conta técnica/administrativa (ex.: demo). Tem os mesmos poderes de
-- gestor (vê tudo da loja, cadastra/remove contas), com etiqueta própria.
-- is_gestor() (gate de permissão usado em RLS e nas RPCs de equipe) passa a
-- valer para 'gestor' OU 'tecnico'. Idempotente.

-- 1) Permite o novo papel na constraint
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'avelloz.memberships'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%role%';
  if c is not null then execute format('alter table avelloz.memberships drop constraint %I', c); end if;
end $$;
alter table avelloz.memberships
  add constraint memberships_role_check check (role in ('gestor', 'vendedor', 'tecnico'));

-- 2) is_gestor() passa a contemplar técnico (mesmo nível de acesso)
create or replace function avelloz.is_gestor()
returns boolean language sql stable security definer set search_path = avelloz, public as $$
  select exists (
    select 1 from avelloz.memberships
    where user_id = auth.uid()
      and role in ('gestor', 'tecnico')
      and org_id = avelloz.current_org()
  )
$$;

-- 3) create_team_member passa a aceitar 'tecnico' como papel válido
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
  if coalesce(p_role, '') not in ('gestor', 'vendedor', 'tecnico') then
    raise exception 'Papel inválido (use tecnico, gestor ou vendedor)';
  end if;

  v_nome := nullif(btrim(coalesce(p_nome, '')), '');
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

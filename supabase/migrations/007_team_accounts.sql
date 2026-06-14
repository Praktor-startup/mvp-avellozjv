-- =============================================
-- MVP Avelloz — 007: gestão de contas da equipe (gestor cadastra gestor|vendedor)
-- =============================================
--
-- Regra de negócio: dentro de uma loja (organização) há dois papéis.
--   - gestor:   acesso total + pode cadastrar/remover contas (gestor ou vendedor)
--   - vendedor: opera apenas os próprios atendimentos; NÃO cadastra contas.
--
-- A criação de conta acontece via RPC SECURITY DEFINER (roda como supabase_admin),
-- então o app NÃO precisa da service_role no browser: o gestor chama com o próprio
-- JWT e a função valida is_gestor() antes de tocar em auth.users.
--
-- Cada conta nova entra na MESMA loja do gestor que a criou (memberships.org_id =
-- current_org()), preservando o isolamento entre lojas. Idempotente.

-- ---------------------------------------------
-- Papel do usuário atual na loja ativa (gating de UI no app)
-- ---------------------------------------------
create or replace function avelloz.my_role()
returns text
language sql stable security definer set search_path = avelloz, public as $$
  select role from avelloz.memberships
  where user_id = auth.uid() and org_id = avelloz.current_org()
  limit 1
$$;
grant execute on function avelloz.my_role() to authenticated, anon;

-- ---------------------------------------------
-- Lista a equipe da loja atual (email + nome + papel)
-- ---------------------------------------------
create or replace function avelloz.list_team()
returns table(user_id uuid, email text, nome text, role text, is_me boolean, created_at timestamptz)
language sql security definer set search_path = avelloz, public, auth as $$
  select m.user_id,
         u.email::text,
         coalesce(nullif(btrim(u.raw_user_meta_data->>'nome'), ''), split_part(u.email, '@', 1)) as nome,
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
-- Cria (ou vincula) uma conta na loja do gestor
-- ---------------------------------------------
create or replace function avelloz.create_team_member(
  p_email text, p_password text, p_nome text, p_role text
) returns json
language plpgsql security definer
set search_path = avelloz, public, auth, extensions as $$
declare
  v_org      uuid := avelloz.current_org();
  v_uid      uuid;
  v_existing uuid;
  v_nome     text;
begin
  -- Só gestor cadastra contas
  if not avelloz.is_gestor() then
    raise exception 'Apenas gestores podem cadastrar contas' using errcode = '42501';
  end if;
  if v_org is null then
    raise exception 'Loja não encontrada para o usuário atual';
  end if;
  if coalesce(p_role, '') not in ('gestor', 'vendedor') then
    raise exception 'Papel inválido (use gestor ou vendedor)';
  end if;

  p_email := lower(btrim(coalesce(p_email, '')));
  if p_email = '' or position('@' in p_email) = 0 then
    raise exception 'E-mail inválido';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'A senha deve ter no mínimo 6 caracteres';
  end if;
  v_nome := coalesce(nullif(btrim(p_nome), ''), split_part(p_email, '@', 1));

  -- O auth.users é compartilhado entre projetos: se o e-mail já existe globalmente,
  -- apenas vinculamos à loja (não recriamos o login nem trocamos a senha).
  select id into v_existing from auth.users where lower(email) = p_email limit 1;

  if v_existing is not null then
    if exists (select 1 from avelloz.memberships where org_id = v_org and user_id = v_existing) then
      raise exception 'Este e-mail já faz parte da sua loja';
    end if;
    insert into avelloz.memberships (org_id, user_id, role) values (v_org, v_existing, p_role);
    if p_role = 'vendedor' then
      insert into avelloz.sellers (name, whatsapp, org_id, user_id, owner_id)
      values (v_nome, '', v_org, v_existing, auth.uid());
    end if;
    return json_build_object('status', 'linked', 'user_id', v_existing);
  end if;

  -- Cria o login do zero (e-mail já confirmado para permitir acesso imediato)
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

  insert into avelloz.memberships (org_id, user_id, role) values (v_org, v_uid, p_role);
  if p_role = 'vendedor' then
    insert into avelloz.sellers (name, whatsapp, org_id, user_id, owner_id)
    values (v_nome, '', v_org, v_uid, auth.uid());
  end if;

  return json_build_object('status', 'created', 'user_id', v_uid);
end $$;
revoke all on function avelloz.create_team_member(text, text, text, text) from public, anon;
grant execute on function avelloz.create_team_member(text, text, text, text) to authenticated;

-- ---------------------------------------------
-- Remove um membro da loja (gestor; não pode remover a si mesmo)
-- ---------------------------------------------
create or replace function avelloz.remove_team_member(p_user_id uuid)
returns void
language plpgsql security definer set search_path = avelloz, public as $$
declare
  v_org uuid := avelloz.current_org();
begin
  if not avelloz.is_gestor() then
    raise exception 'Apenas gestores podem remover contas' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Você não pode remover a si mesmo';
  end if;
  -- Desativa o cadastro de vendedor vinculado (preserva histórico de atendimentos)
  update avelloz.sellers set active = false where org_id = v_org and user_id = p_user_id;
  -- Tira o acesso à loja (não apaga o login global — é compartilhado entre projetos)
  delete from avelloz.memberships where org_id = v_org and user_id = p_user_id;
end $$;
revoke all on function avelloz.remove_team_member(uuid) from public, anon;
grant execute on function avelloz.remove_team_member(uuid) to authenticated;

-- PostgREST self-hosted: recarrega o cache de schema para as novas RPCs aparecerem
notify pgrst, 'reload schema';

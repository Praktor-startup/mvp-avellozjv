-- =============================================
-- MVP Avelloz — 010: vendedor é read-only em vendedores e config
-- =============================================
--
-- Regra: vendedor "só usa o acesso dele mesmo" — não cadastra/edita vendedores
-- nem a configuração da loja (status, motivos de perda, tipos de moto).
--
-- Antes (005): policy `org_rows` era `FOR ALL` para qualquer membro da org —
-- ou seja, vendedor conseguia INSERT/UPDATE/DELETE nessas tabelas via API.
-- Agora: SELECT continua liberado para toda a org (o vendedor precisa LER
-- vendedores/status/motos para montar o formulário de atendimento), mas a
-- ESCRITA fica restrita a gestor|tecnico (is_gestor()). Idempotente.

do $$
declare t text;
begin
  foreach t in array array['sellers', 'statuses', 'loss_reasons', 'motorcycle_types'] loop
    -- remove a policy antiga (FOR ALL para qualquer membro)
    execute format('drop policy if exists org_rows on avelloz.%I', t);
    execute format('drop policy if exists org_read on avelloz.%I', t);
    execute format('drop policy if exists org_write on avelloz.%I', t);

    -- leitura: qualquer membro da loja
    execute format($p$create policy org_read on avelloz.%I
      for select to authenticated
      using (org_id = avelloz.current_org())$p$, t);

    -- escrita (insert/update/delete): só gestor|tecnico
    execute format($p$create policy org_write on avelloz.%I
      for all to authenticated
      using (avelloz.is_gestor() and org_id = avelloz.current_org())
      with check (avelloz.is_gestor() and org_id = avelloz.current_org())$p$, t);
  end loop;
end $$;

notify pgrst, 'reload schema';

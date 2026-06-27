-- Harden tenant RLS so an empty application context no longer means unrestricted access.
-- The application sets these context values with parameterized set_config calls.

CREATE OR REPLACE FUNCTION app_current_entity_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_entity_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_current_person_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_person_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_is_platform()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_platform_account_id', true), '') IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION app_internal_access()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.internal_access', true) = 'true'
$$;

CREATE OR REPLACE FUNCTION app_is_entity_member(target_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "memberships" m
    WHERE m."entityId" = target_entity_id
      AND m."personId" = app_current_person_id()
      AND m."isActive" = true
      AND m."exitedAt" IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION app_has_entity_role(target_entity_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "memberships" m
    WHERE m."entityId" = target_entity_id
      AND m."personId" = app_current_person_id()
      AND m."isActive" = true
      AND m."exitedAt" IS NULL
      AND m."role"::text = ANY(allowed_roles)
  )
$$;

DROP POLICY IF EXISTS "tenant_isolation" ON "entities";
DROP POLICY IF EXISTS "tenant_isolation" ON "wallets";
DROP POLICY IF EXISTS "tenant_isolation" ON "memberships";
DROP POLICY IF EXISTS "tenant_isolation" ON "membership_applications";

ALTER TABLE "entities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_applications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "entities" FORCE ROW LEVEL SECURITY;
ALTER TABLE "wallets" FORCE ROW LEVEL SECURITY;
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
ALTER TABLE "membership_applications" FORCE ROW LEVEL SECURITY;

CREATE POLICY "entities_select_context" ON "entities"
  FOR SELECT
  USING (
    app_internal_access()
    OR app_is_platform()
    OR "id" = app_current_entity_id()
    OR "parentEntityId" = app_current_entity_id()
    OR app_is_entity_member("id")
    OR ("parentEntityId" IS NOT NULL AND app_is_entity_member("parentEntityId"))
    OR EXISTS (
      SELECT 1
      FROM "entity_policies" ep
      WHERE ep."entityId" = "entities"."id"
        AND ep."allowOpenMembership" = true
    )
  );

CREATE POLICY "entities_insert_context" ON "entities"
  FOR INSERT
  WITH CHECK (
    app_internal_access()
    OR app_is_platform()
    OR app_current_person_id() IS NOT NULL
  );

CREATE POLICY "entities_update_context" ON "entities"
  FOR UPDATE
  USING (
    app_internal_access()
    OR app_is_platform()
    OR app_has_entity_role("id", ARRAY['FOUNDER', 'ADMIN'])
    OR (
      "parentEntityId" IS NOT NULL
      AND app_has_entity_role("parentEntityId", ARRAY['FOUNDER', 'ADMIN'])
    )
  )
  WITH CHECK (
    app_internal_access()
    OR app_is_platform()
    OR app_has_entity_role("id", ARRAY['FOUNDER', 'ADMIN'])
    OR (
      "parentEntityId" IS NOT NULL
      AND app_has_entity_role("parentEntityId", ARRAY['FOUNDER', 'ADMIN'])
    )
  );

CREATE POLICY "entities_delete_context" ON "entities"
  FOR DELETE
  USING (
    app_internal_access()
    OR app_is_platform()
    OR app_has_entity_role("id", ARRAY['FOUNDER', 'ADMIN'])
    OR (
      "parentEntityId" IS NOT NULL
      AND app_has_entity_role("parentEntityId", ARRAY['FOUNDER', 'ADMIN'])
    )
  );

CREATE POLICY "wallets_select_context" ON "wallets"
  FOR SELECT
  USING (
    app_internal_access()
    OR app_is_platform()
    OR "entityId" = app_current_entity_id()
    OR app_is_entity_member("entityId")
  );

CREATE POLICY "wallets_insert_context" ON "wallets"
  FOR INSERT
  WITH CHECK (
    app_internal_access()
    OR app_is_platform()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN', 'TREASURER'])
  );

CREATE POLICY "wallets_update_context" ON "wallets"
  FOR UPDATE
  USING (
    app_internal_access()
    OR app_is_platform()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN', 'TREASURER'])
  )
  WITH CHECK (
    app_internal_access()
    OR app_is_platform()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN', 'TREASURER'])
  );

CREATE POLICY "wallets_delete_context" ON "wallets"
  FOR DELETE
  USING (
    app_internal_access()
    OR app_is_platform()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN'])
  );

CREATE POLICY "memberships_select_context" ON "memberships"
  FOR SELECT
  USING (
    app_internal_access()
    OR app_is_platform()
    OR "entityId" = app_current_entity_id()
    OR "personId" = app_current_person_id()
    OR app_is_entity_member("entityId")
  );

CREATE POLICY "memberships_insert_context" ON "memberships"
  FOR INSERT
  WITH CHECK (
    app_internal_access()
    OR app_is_platform()
    OR "personId" = app_current_person_id()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN'])
  );

CREATE POLICY "memberships_update_context" ON "memberships"
  FOR UPDATE
  USING (
    app_internal_access()
    OR app_is_platform()
    OR "personId" = app_current_person_id()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN'])
  )
  WITH CHECK (
    app_internal_access()
    OR app_is_platform()
    OR "personId" = app_current_person_id()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN'])
  );

CREATE POLICY "memberships_delete_context" ON "memberships"
  FOR DELETE
  USING (
    app_internal_access()
    OR app_is_platform()
    OR "personId" = app_current_person_id()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN'])
  );

CREATE POLICY "membership_applications_select_context" ON "membership_applications"
  FOR SELECT
  USING (
    app_internal_access()
    OR app_is_platform()
    OR "entityId" = app_current_entity_id()
    OR "personId" = app_current_person_id()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN'])
  );

CREATE POLICY "membership_applications_insert_context" ON "membership_applications"
  FOR INSERT
  WITH CHECK (
    app_internal_access()
    OR app_is_platform()
    OR app_current_person_id() IS NULL
    OR "personId" = app_current_person_id()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN'])
  );

CREATE POLICY "membership_applications_update_context" ON "membership_applications"
  FOR UPDATE
  USING (
    app_internal_access()
    OR app_is_platform()
    OR "personId" = app_current_person_id()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN'])
  )
  WITH CHECK (
    app_internal_access()
    OR app_is_platform()
    OR "personId" = app_current_person_id()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN'])
  );

CREATE POLICY "membership_applications_delete_context" ON "membership_applications"
  FOR DELETE
  USING (
    app_internal_access()
    OR app_is_platform()
    OR "personId" = app_current_person_id()
    OR app_has_entity_role("entityId", ARRAY['FOUNDER', 'ADMIN'])
  );

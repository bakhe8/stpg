-- Migration: fix_subscription_entity_trigger_column_names
-- Align trigger column references with the camelCase columns created by Prisma.

CREATE OR REPLACE FUNCTION check_subscription_entity_match()
RETURNS TRIGGER AS $$
DECLARE
  v_membership_entity_id UUID;
  v_path_entity_id       UUID;
BEGIN
  SELECT "entityId" INTO v_membership_entity_id
  FROM "memberships"
  WHERE "id" = NEW."membershipId";

  SELECT w."entityId" INTO v_path_entity_id
  FROM "governance_paths" gp
  JOIN "wallets" w ON w."id" = gp."walletId"
  WHERE gp."id" = NEW."governancePathId";

  IF v_membership_entity_id IS DISTINCT FROM v_path_entity_id THEN
    RAISE EXCEPTION
      'الاشتراك يجب أن يكون داخل نفس الكيان: membership.entityId (%) != path.entityId (%)',
      v_membership_entity_id,
      v_path_entity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
